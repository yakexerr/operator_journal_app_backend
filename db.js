import Database from "better-sqlite3";
import bcrypt from "bcrypt"

const db = new Database('users.db')

// таблица для того чтобы знать кто на какой скважине
db.exec(`
    CREATE TABLE IF NOT EXISTS well_assignments (
      objectId INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
`);

db.exec(`CREATE TABLE IF NOT EXISTS objects (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lastname TEXT NOT NULL,
      position TEXT NOT NULL,
      login TEXT NOT NULL,
      password TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, -- 1 - работает, 0 - уволен/отстранен
      shift_start TEXT,            -- Дата начала вахты (ГГГГ-ММ-ДД)
      shift_end TEXT               -- Дата конца вахты
    )
    `);

db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        description TEXT NOT NULL,
        objectId INTEGER NOT NULL,
        objectName TEXT,
        assignedTo INTEGER,
        created_at TEXT
    )
    `);

db.exec(`
    CREATE TABLE IF NOT EXISTS objects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL 
    )
    `);

db.exec(`
    CREATE TABLE IF NOT EXISTS calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      result REAL NOT NULL,
      created_at TEXT NOT NULL,
      objectId INTEGER NOT NULL,
      formulaId TEXT NOT NULL,
      reportId INTEGER
    )
    `);



// это объект-синглтон - по сути готовый экземпляр с методами (похоже на статический класс)
export const dbActions = {
    saveUser: async (user) => {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        const insert = db.prepare(`
            INSERT INTO users (name, lastname, position, login, password, is_active, shift_start, shift_end)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `);

        return insert.run(
            user.name, 
            user.lastname, 
            user.position, 
            user.login, 
            hashedPassword, 
            user.shift_start, 
            user.shift_end
        );
    },

    getUsers: () => {
        // Соединяем таблицу пользователей с таблицей привязок скважин
        const stmt = db.prepare(`
            SELECT 
                users.*, 
                well_assignments.objectId 
            FROM users 
            LEFT JOIN well_assignments ON users.id = well_assignments.userId
            ORDER BY users.id DESC
        `);
        return stmt.all();
    },

    findUser: async (login, password) => {
        const user = db.prepare(`
            SELECT users.*, well_assignments.objectId 
            FROM users 
            LEFT JOIN well_assignments ON users.id = well_assignments.userId
            WHERE users.login = ?
        `).get(login);
        
        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password);
        return isMatch ? user : null;
    },

    getUserData: (login) => {
        const stmt = db.prepare('SELECT name, lastname, position FROM users WHERE login = ?');
        return stmt.get(login);
    },

    // пофиксил - теперь весь отчёт сохраняется
    saveReport: (report) => {
        // пытаемся найти имя объекта в базе сервера по taskId, 
        // так как телефон его может не прислать
        const taskInfo = db.prepare('SELECT objectName FROM reports WHERE taskId = ?').get(report.task_id);
        const name = report.objectName || (taskInfo ? taskInfo.objectName : "Неизвестный объект");

        const stmtReport = db.prepare(`
            INSERT INTO reports (taskId, title, status, description, objectId, objectName, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmtReport.run(
            report.task_id,
            report.report_title,
            'done',
            report.comment || '',
            report.objectId,
            name,
            report.created_at 
        );

        const newReportId = info.lastInsertRowid;

        // сохраняем расчеты
        if (report.calculations && report.calculations.length > 0) {
            const stmtCalc = db.prepare(`
                INSERT INTO calculations (title, result, created_at, objectId, formulaId, reportId)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const calc of report.calculations) {
                stmtCalc.run(calc.title, calc.result, calc.created_at, calc.objectId, calc.formulaId, newReportId);
            }
        }
        
        // удаляем старую задачу "в работе", чтобы она не мешалась на главной
        db.prepare('DELETE FROM reports WHERE taskId = ? AND status = ?').run(report.task_id, 'in_progress');

        return info;
    },

    getReportsWithCalcs: () => {
        // берем все отчеты
        const reports = db.prepare("SELECT * FROM reports WHERE status = 'done' OR status = 'send' ORDER BY id DESC").all();
        
        // для каждого отчета подтягиваем его цифры из таблицы calculations
        return reports.map(report => {
            const calcs = db.prepare('SELECT title, result FROM calculations WHERE reportId = ?').all(report.id);
            return { ...report, calculations: calcs }; // возвращаем отчет со вложенным списком цифр
        });
    },

    // МЕТОД ДЛЯ СОЗДАНИЯ ЗАДАЧИ
    createTask: (task) => {
        const stmt = db.prepare(`
            INSERT INTO reports (taskId, title, status, description, objectId, objectName, assignedTo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            task.taskId,
            task.title,
            task.status || 'new',
            task.description,
            task.objectId,
            task.objectName,
            task.assignedTo
        );
    },
    
    // Также добавил метод для получения задач, чтобы app.get('/task') не падал
    getTasks: () => {
        return db.prepare("SELECT * FROM reports WHERE status = 'new'").all(); 
    },

    updateTaskStatus: (id, status) => {
        const stmt = db.prepare('UPDATE reports SET status = ? WHERE taskId = ?');
        return stmt.run(status, id);
    },

    checkTaskExists: (taskId) => {
        const stmt = db.prepare('SELECT id FROM reports WHERE taskId = ?');
        return stmt.get(taskId) !== undefined;
    },

    checkTaskExists: (taskId) => {
        const stmt = db.prepare('SELECT id FROM reports WHERE taskId = ?');
        return stmt.get(taskId); // Вернет строку из БД или undefined
    },

    // этот метод отдаст всё для доски на сайте
    getAllTasksForDashboard: () => {
        return db.prepare('SELECT * FROM reports').all();
    },

    // этот метод для телефона (ему нужны только новые)
    getNewTasksOnly: (userId) => {
        // Ищем только новые задачи именно для этого оператора
        return db.prepare("SELECT * FROM reports WHERE status = 'new' AND assignedTo = ?").all(userId);
    },

    // узнать, кто отвечает за объект
    getAssignedUser: (objectId) => {
        const stmt = db.prepare('SELECT userId FROM well_assignments WHERE objectId = ?');
        const res = stmt.get(objectId);
        return res ? res.userId : null;
    },

    // метод для "заправки" чтобы потестить
    assignWellToUser: (objectId, userId) => {
        // Используем транзакцию, чтобы всё прошло как одна операция
        const transaction = db.transaction(() => {
            // Сначала удаляем ВСЕ старые привязки этого пользователя
            // Чтобы у него не могло быть две скважины одновременно
            db.prepare('DELETE FROM well_assignments WHERE userId = ?').run(userId);

            // Удаляем привязку этой скважины к кому-то другому (если там кто-то был)
            // Чтобы на одной скважине не было двух операторов
            db.prepare('DELETE FROM well_assignments WHERE objectId = ?').run(objectId);

            // Создаем новую чистую привязку
            db.prepare('INSERT INTO well_assignments (objectId, userId) VALUES (?, ?)').run(objectId, userId);
        });

        return transaction();
    },

    getUserById: (id) => {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    deactivateUser: (id) => {
        return db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    },

    updateShift: (id, shift_start, shift_end) => {
        // Явно указываем, какие колонки обновляем
        const stmt = db.prepare('UPDATE users SET shift_start = ?, shift_end = ? WHERE id = ?');
        return stmt.run(shift_start, shift_end, id);
    },

    updateUserWellAndShift: (userId, newObjectId, shift_start, shift_end) => {
        const updateTransaction = db.transaction(() => {
            // 1. Обновляем даты вахты у пользователя
            db.prepare('UPDATE users SET shift_start = ?, shift_end = ? WHERE id = ?')
            .run(shift_start, shift_end, userId);

            // 2. Удаляем старую привязку ЭТОГО пользователя (где бы он ни был раньше)
            db.prepare('DELETE FROM well_assignments WHERE userId = ?').run(userId);

            // 3. Удаляем привязку ЭТОЙ скважины (если там был кто-то другой)
            // Это предотвратит ошибку UNIQUE constraint
            db.prepare('DELETE FROM well_assignments WHERE objectId = ?').run(newObjectId);

            // 4. Создаем новую чистую привязку
            db.prepare('INSERT INTO well_assignments (objectId, userId) VALUES (?, ?)')
            .run(newObjectId, userId);
        });

        return updateTransaction();
    },

    getCalculationsByWell: (objectId) => {
        return db.prepare('SELECT * FROM calculations WHERE objectId = ? ORDER BY created_at DESC').all(objectId);
    },

    updateUserShift: (id, start, end) => {
        const stmt = db.prepare('UPDATE users SET shift_start = ?, shift_end = ? WHERE id = ?');
        return stmt.run(start, end, id);
    },

    updateUserStatus: (id, status) => {
        const stmt = db.prepare('UPDATE users SET is_active = ? WHERE id = ?');
        return stmt.run(status, id);
    },

    getObjects: () => db.prepare("SELECT * FROM objects").all(),

    
}