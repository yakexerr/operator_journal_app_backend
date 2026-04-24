import express from 'express';
import cors from 'cors';
import path from 'path';
import { dbActions } from './db.js';
import jwt from 'jsonwebtoken';


const app = express();
const port = process.env.PORT || 3000;

// const SECTRET_KEY = Math.random().toString(36).substring(2, 10);
const SECRET_KEY = "my_super_secret_oil_key_2026";


// Функция для проверки токена
/*
Теперь она умная. Если токен каждые 24 часа обновляется
то человек даже если уволен может данные слать
поэтому чтобы всякие недоброжелатели не мешали
authenticateToken должен не просто декодировать 
строку, а прям заглядывать в базу
*/
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Токен отсутствует" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Время сессии истекло, авторизуйтесь заново" });

        const user = dbActions.getUserById(decoded.userId);
        
        // Модельная проверка: уволен ли?
        if (!user || user.is_active === 0) {
            return res.status(403).json({ error: "Доступ заблокирован: пользователь уволен" });
        }

        // Модельная проверка: на смене ли?
        const today = new Date().toISOString().split('T')[0];
        if (user.shift_start && user.shift_end) {
             if (today < user.shift_start || today > user.shift_end) {
                 return res.status(403).json({ error: "Действие запрещено: вы не на смене" });
             }
        }

        req.user = user; 
        next();
    });
};

app.use(cors()); // разрешил внешние подключения
app.use(express.json()); // чтобы принимать json в пост запросах
app.use(express.static('src'));

const DEBUG = true;

function debug(message){
    if(DEBUG){
        console.log(message);
    }
}

const checkIfExists = dbActions.checkTaskExists(1);



let all_users = dbActions.getUsers();




app.get('/', (req, res) => {
    res.sendFile(path.resolve('src', 'authPage.html'));
});

app.patch('/task/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const { status } = req.body;

    try {
        // работаем через БД, а не через массив как раньше
        const result = dbActions.updateTaskStatus(taskId, status); 

        if (result.changes > 0) {
            debug(`--- [DB] Статус задачи ${taskId} изменен на: ${status} ---`);
            res.json({ success: true });
        } else {
            res.status(404).send("Задача не найдена в базе");
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка сервера");
    }
});


// РЕПОРТЫ 
app.post('/reports', authenticateToken, (req, res) => {
    const reportData = {
        ...req.body,
        authorId: req.user.id // беру айди из токена, а не из данных телефона
    };
    dbActions.saveReport(reportData);
    res.status(201).json({ message: "Принято" });
});

// для того чтобы веб мог тянуть
app.get('/reports', (req, res) => {
    const data = dbActions.getReportsWithCalcs();
    res.json(data);
});



// --- ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ---
if (all_users.length === 0) {
    console.log("--- [DB] База пуста. Заправляю начальные данные... ---");

    // Создаем дефолтные скважины
    const insertObj = db.prepare('INSERT INTO objects (name, type) VALUES (?, ?)');
    insertObj.run('Скважина 101', 'well');
    insertObj.run('Скважина 102', 'well');
    insertObj.run('Скважина 103', 'well');
    insertObj.run('Скважина 104', 'well');
    insertObj.run('Скважина 105', 'well');

    dbActions.saveUser({ 
        name: "Иван", lastname: "Иванов", position: "Диспетчер", 
        login: "admin", password: "123", shift_start: "2026-01-01", shift_end: "2026-12-31" 
    }).then(() => {
        dbActions.saveUser({ 
            name: "Пётр", lastname: "Петров", position: "Оператор", 
            login: "admin2", password: "123", shift_start: "2026-01-01", shift_end: "2026-12-31" 
        }).then(() => {
            console.log("--- [DB] Пользователи успешно созданы ---");
            dbActions.assignWellToUser(1, 1); // ID скважины 1 (Скв 101) для админа
            dbActions.assignWellToUser(2, 2); // ID скважины 2 (Скв 102) для оператора
        });
    });
}


app.post('/login', async (req, res) => { 
    try {
        const { login, password } = req.body;
        const user = await dbActions.findUser(login, password); 

        if (!user) 
            return res.status(401).send("Неверные данные");
    
        // ПРОВЕРКА: Если уволен
        if (user.is_active === 0) {
            return res.status(403).send("Ваш аккаунт заблокирован (увольнение)");
        }

        if (user) {
            // Теперь здесь 'user' — это реальный объект, а не Promise
            console.log("--- [DEBUG] Юзер найден:", user.lastname);

            const token = jwt.sign(
                { userId: user.id, role: user.position },
                SECRET_KEY,
                { expiresIn: '24h' }
            );

            res.json({ token, user });
        } else {
            res.status(401).json({ error: "Неверный логин или пароль" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка сервера при входе");
    }
});

// ПОЛУЧЕНИЕ ЗАДАЧ (теперь из БД)
// это для телефона
app.get('/task', authenticateToken, (req, res) => {
    const user = dbActions.getUserById(req.user.userId);
    const today = new Date();
    const start = new Date(user.shift_start);
    const end = new Date(user.shift_end);

    // ПРОВЕРКА: На смене ли он?
    if (!(today >= start && today <= end)) {
        return res.status(403).send("Доступ запрещен: вы не на вахте");
    }

    const tasks = dbActions.getNewTasksOnly(user.id);
    res.json(tasks);
});


// это для сайта
app.get('/dashboard-tasks', (req, res) => {
    const tasks = dbActions.getAllTasksForDashboard(); // все статусы
    res.json(tasks);
});

app.post('/task', (req, res) => {
    try {
         const { objectId, title, description, objectName } = req.body;
        const assignedUserId = dbActions.getAssignedUser(objectId);


        if (!assignedUserId) {
            console.log(`--- [400] Ошибка: Объект ${objectId} ни за кем не закреплен ---`); // ДОБАВЬ
            return res.status(400).json({ error: "За этой скважиной не закреплен оператор" });
        }

        const user = dbActions.getUserById(assignedUserId);
        console.log(`--- [DEBUG] Проверяю смену для оператора: ${user.lastname} (ID: ${assignedUserId}) ---`);
console.log(`--- [DEBUG] Его даты в базе: ${user.shift_start} по ${user.shift_end} ---`);


        const today = new Date();
        const start = user.shift_start ? new Date(user.shift_start) : null;
        const end = user.shift_end ? new Date(user.shift_end) : null;

        if (user.is_active !== 1) {
            console.log(`--- [400] Ошибка: Оператор ${user.lastname} неактивен ---`); // ДОБАВЬ
            return res.status(400).json({ error: "Оператор неактивен" });
        }

        // ВАЖНО: Если даты не совпадают с текущим днем
        if (!start || !end || today < start || today > end) {
            console.log(`--- [400] Ошибка: Смена не совпадает. Сегодня: ${today.toLocaleDateString()}, Смена: ${user.shift_start} - ${user.shift_end} ---`); // ДОБАВЬ
            return res.status(400).json({ error: "Оператор сейчас не на смене" });
        }

        const result = dbActions.createTask({
            taskId: Date.now(), // ??? TODO: !!!
            title: title,
            description: description,
            objectId: objectId,
            objectName: objectName,
            assignedTo: assignedUserId,
            status: 'new'
        });
        
        res.status(201).json({ message: "Задача назначена" });
    } catch (e) {
        console.error("Ошибка /task:", e);
        res.status(500).send("Внутренняя ошибка сервера");
    }
});

// для того чтобы доанные в профиль тянуть
app.get('/user-info/:login', (req, res) => {
    try {
        const user = dbActions.getUserData(req.params.login);
        if (user) {
            res.json(user);
        } else {
            res.status(404).send("Пользователь не найден");
        }
    } catch (e) {
        res.status(500).send("Ошибка сервера");
    }
});



// --- УПРАВЛЕНИЕ ПЕРСОНАЛОМ ---
app.get('/staff', (req, res) => {
    try {
        const staff = dbActions.getUsers(); // Твой метод для получения всех юзеров
        res.json(staff);
    } catch (e) {
        res.status(500).send("Ошибка получения списка сотрудников");
    }
});

// Остановились

app.post('/staff', async (req, res) => { // Добавь async
    try {
        const { name, lastname, position, login, password, objectId, shift_start, shift_end } = req.body;

        const result = await dbActions.saveUser({
            name, lastname, position, login, password, shift_start, shift_end
        });
        
        const newUserId = result.lastInsertRowid;

        if (objectId) {
            // Используем наш новый метод из db.js вместо прямого обращения к db
            dbActions.assignWellToUser(parseInt(objectId), newUserId);
        }

        console.log(`--- [STAFF] Создан сотрудник: ${lastname} (ID: ${newUserId}) ---`);
        res.status(201).json({ message: "Сотрудник успешно добавлен" });

    } catch (e) {
        console.error("Ошибка /staff:", e);
        res.status(500).json({ error: "Ошибка при создании сотрудника" });
    }
});


app.delete('/staff/:id', (req, res) => {
    try {
        const result = dbActions.deactivateUser(req.params.id);
        if (result.changes > 0) {
            res.json({ message: "Статус сотрудника изменен" });
        } else {
            res.status(404).send("Сотрудник не найден");
        }
    } catch (e) {
        res.status(500).send("Ошибка при увольнении");
    }
});


app.patch('/staff/update/:id', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);
    console.log("--- [PATCH] Тело запроса:", req.body);

    const { objectId, shift_start, shift_end, is_active } = req.body;

    try {
        if (objectId !== undefined) {
            dbActions.assignWellToUser(objectId, userId);
        }

        if (shift_start !== undefined && shift_end !== undefined) {
            dbActions.updateUserShift(userId, shift_start, shift_end);
        }

        if (is_active !== undefined) {
            dbActions.updateUserStatus(userId, is_active);
        }

        res.json({ success: true });
    } catch (e) {
        console.error("--- [PATCH ERROR] ---", e.message);
        res.status(500).send("Ошибка при обновлении: " + e.message);
    }
});

app.get('/history-by-well/:objectId', authenticateToken, (req, res) => {
    try {
        const objectId = req.params.objectId;
        const data = dbActions.getCalculationsByWell(objectId);
        res.json(data);
    } catch (e) {
        res.status(500).send("Ошибка получения истории с сервера");
    }
});

app.listen(port, '0.0.0.0', () => {
    debug(`Сервер запущен на порту ${port}`);
});