import Database from "better-sqlite3";

const db = new Database('users.db')

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lastname TEXT NOT NULL,
      position TEXT NOT NULL,
      login TEXT NOT NULL,
      password TEXT NOT NULL
    )
    `);

db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        description TEXT NOT NULL,
        objectId INTEGER NOT NULL,
        objectName TEXT,
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
    saveUser: (user) => {
        // prepare типа сохраняет шаблон и благодаря нему мы можем выполнять insert.run
        const insert = db.prepare(`
            INSERT INTO users (name, lastname, position, login, password)
             VALUES (?,?,?,?,?)    
        `);
        return insert.run(
            user.name,
            user.lastname,
            user.position,
            user.login,
            user.password,
        );
    },

    getUsers: () => {
        const rows = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
        return rows;
    },

    findUser: (username, password) => {
        const isFind = db.prepare('SELECT * FROM users WHERE login = ? AND password = ?');
        return isFind.get(username, password)
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
            INSERT INTO reports (taskId, title, status, description, objectId, objectName)
            VALUES (?, ?, ?, ?, ?, ?) -- Добавили 6-й знак вопроса
        `);
        return stmt.run(
            task.taskId,
            task.title,
            task.status || 'new',
            task.description,
            task.objectId,
            task.objectName
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
    getNewTasksOnly: () => {
        return db.prepare("SELECT * FROM reports WHERE status = 'new'").all();
    }
}