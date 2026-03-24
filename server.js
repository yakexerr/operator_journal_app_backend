import express from 'express';
import cors from 'cors';
import path from 'path';
import { dbActions } from './db.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // разрешил внешние подключения
app.use(express.json()); // чтобы принимать json в пост запросах
app.use(express.static('src'));


const checkIfExists = dbActions.checkTaskExists(1);

// if (!checkIfExists) {
//     dbActions.createTask({
//         taskId: 1,
//         title: "Замер давления на Скв-105",
//         objectName: "Скважина №105",
//         status: "new",
//         description: "pump_efficiency",
//         objectId: 105
//     });
//     console.log("--- [DB] Тестовая задача №4 создана ---");
// } else {
//     console.log("--- [DB] Тестовая задача №4 уже существует в базе ---");
// }

let all_users = dbActions.getUsers();
if(all_users.length === 0) {
    dbActions.saveUser({ 
        name: "Иван", 
        lastname: "Иванов", 
        position: "Диспетчер", 
        login: "admin", 
        password: "123" 
    });
    console.log("--- [DB] База была пуста. Создан дефолтный админ: admin/123 ---");
} else {
    console.log(`--- [DB] База готова. Зарегистрировано пользователей: ${all_users.length} ---`);
}



app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${port}`);
});


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
            console.log(`--- [DB] Статус задачи ${taskId} изменен на: ${status} ---`);
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
app.post('/reports', (req, res) => {
    try {
        dbActions.saveReport(req.body);
        console.log("Пришёл отчёт", req.body);
        res.status(201).send({message: "Отчёт принят на сервере"});
    }
    catch (e){
        console.error(e);
        // статус 500 - неожиданная ошибка, которая помешала выполнить запрос
        res.status(500).send("Ошибка созранения в базу данных")
    }
});

// для того чтобы веб мог тянуть
app.get('/reports', (req, res) => {
    const data = dbActions.getReportsWithCalcs(); // Используем новый метод
    res.json(data);
});



const users = [
    {
        id: 1,
        login: "admin",
        password: "123", // В реальности пароли так не хранят конечно....
        name: "Иван",
        lastname: "Иванов",
        position: "Старший оператор"
    }
];

// АВТОРИЗАЦИЯ (теперь через реальную БД)
app.post('/login', (req, res) => {
    const { login, password } = req.body;
    
    // Используем твой метод из db.js
    const user = dbActions.findUser(login, password);

    if (user) {
        console.log(`--- [DB] Вход выполнен: ${user.lastname} ---`);
        res.json(user); // Отдаем все данные юзера (имя, должность и т.д.)
    } else {
        res.status(401).json({ error: "Неверный логин или пароль" });
    }
});

// ПОЛУЧЕНИЕ ЗАДАЧ (теперь из БД)
// это для телефона
app.get('/task', (req, res) => {
    const tasks = dbActions.getNewTasksOnly(); // только 'new'
    res.json(tasks);
});
// это для сайта
app.get('/dashboard-tasks', (req, res) => {
    const tasks = dbActions.getAllTasksForDashboard(); // все статусы
    res.json(tasks);
});

app.post('/task', (req, res) => {
    try {
        // берем данные из req.body (то, что прислал клерк с сайта)
        const result = dbActions.createTask({
            taskId: Date.now(), // генерируем ID
            title: req.body.title,
            objectName: req.body.objectName,
            description: req.body.description,
            objectId: req.body.objectId,
            status: 'new'
        });
        
        // теперь result определен, и эта строка не вызовет ошибку
        res.status(201).json({ message: "Задача создана", id: result.lastInsertRowid });
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка при создании задачи");
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