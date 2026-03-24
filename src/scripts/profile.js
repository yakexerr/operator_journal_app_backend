document.addEventListener('DOMContentLoaded', async function() {
    // берем логин из памяти браузера
    const login = localStorage.getItem('userLogin');

    if (!login) {
        // если логина нет - значит юзер не вошел, кидаем на вход
        window.location.href = '/authPage.html';
        return;
    }

    try {
        // спрашиваем у сервера данные
        const response = await fetch(`http://85.209.129.205:3000/user-info/${login}`);
        
        if (response.ok) {
            const userData = await response.json();

            // вставляем данные в хтмл
            document.getElementById('user-name').textContent = userData.name;
            document.getElementById('user-lastname').textContent = userData.lastname;
            document.getElementById('user-position').textContent = userData.position;
        }
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
    }
});