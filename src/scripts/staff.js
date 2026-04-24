function getAuthHeaders() {
    const token = localStorage.getItem('jwt_token'); // Убедись, что при логине в auth.js ты сохранил его именно под этим именем
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const staffForm = document.getElementById('staff-form');
    const tableBody = document.querySelector('#employee-list tbody');

    async function loadStaff() {
        const response = await fetch('/staff');
        const staff = await response.json();
        tableBody.innerHTML = '';

        staff.forEach(user => {
            const row = tableBody.insertRow();
            
            // Проверка вахты
            const today = new Date().toISOString().split('T')[0];
            const isOnShift = (user.is_active === 1) && 
                 (user.shift_start && user.shift_end) && 
                 (today >= user.shift_start && today <= user.shift_end);

            const statusText = isOnShift ? "На смене" : (user.is_active ? "Отсутствует" : "Уволен");
            const statusColor = isOnShift ? "green" : (user.is_active ? "grey" : "red");

            row.innerHTML = `
                <td>${user.id}</td>
                <td style="font-weight:bold">${user.login}</td>
                <td>${user.lastname} ${user.name}</td>
                <td>${user.objectId ? 'Скв. ' + user.objectId : '---'}</td>
                <td><small>${user.shift_start || ''} / ${user.shift_end || ''}</small></td>
                <td><span style="color:${statusColor}">${statusText}</span></td>
                    <button onclick="editWell(${user.id})">Скважина</button>
                    <button onclick="editShift(${user.id})">Смена</button>
                    <button onclick="toggleActive(${user.id}, ${user.is_active})" style="color:red">
                        ${user.is_active ? 'Уволить' : 'Восстановить'}
                    </button>
                </td>
            `;
        });
    }

    // Функции вынесены в window, чтобы onclick их видел
    window.editWell = async (id) => {
        const newWell = prompt("Введите ID новой скважины:");
        if (!newWell) return;
        
        const response = await fetch(`/staff/update/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(), // <--- ДОБАВИЛИ ТОКЕН
            body: JSON.stringify({ objectId: parseInt(newWell) })
        });
        if (response.ok) loadStaff();
        else alert("Ошибка доступа или сервера");
    };

    window.editShift = async (id) => {
        const start = prompt("Начало (ГГГГ-ММ-ДД):");
        const end = prompt("Конец (ГГГГ-ММ-ДД):");
        
        if (start && end) {
            await fetch(`/staff/update/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ 
                    shift_start: start,
                    shift_end: end 
                })
            });
            loadStaff();
        }
    };

    window.toggleActive = async (id, currentStatus) => {
        const response = await fetch(`/staff/update/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(), 
            body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
        });
        if (response.ok) loadStaff();
    };

    staffForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('firstName').value,
            lastname: document.getElementById('lastName').value,
            position: document.getElementById('position').value,
            login: document.getElementById('login').value,
            password: document.getElementById('password').value,
            objectId: document.getElementById('wellInput').value, 
            shift_start: document.getElementById('startInput').value,
            shift_end: document.getElementById('endInput').value
        };

        // Отправляем...
        const response = await fetch('/staff', {
            method: 'POST',
            headers: getAuthHeaders(), // Не забываем токен!
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            alert("Сотрудник добавлен!");
            staffForm.reset();
            loadStaff();
        }
    });

    loadStaff();
});