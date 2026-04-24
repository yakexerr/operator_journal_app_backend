document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    // собираем данные один раз в переменные
    const login = document.getElementById('login').value;
    const p1 = document.getElementById('password').value;


    const messageSpan = document.getElementById('message');

    // очищаем старые сообщения
    messageSpan.textContent = "";

    // формируем объект для отправки
    const credentials = {
        login: login,
        password: p1
    };


    // отправка данных
    fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(credentials)
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('jwt_token', data.token); 

            localStorage.setItem('userLogin', login); // Сохраняем для запросов
            localStorage.setItem('userName', data.user.name); // Для приветствия
            
            messageSpan.style.color = "green";
            messageSpan.textContent = "Вход выполнен! Переходим...";
            
            setTimeout(() => {
                // Убедись, что такой файл реально есть по этому пути!
                window.location.href = './Home.html'; 
            }, 1500);
        } else {
            messageSpan.style.color = "red";
            messageSpan.textContent = data.error || "Ошибка входа";
        }
    })
    .catch(err => {
        console.error('Ошибка:', err);
        messageSpan.textContent = "Не удалось связаться с сервером";
    });
});