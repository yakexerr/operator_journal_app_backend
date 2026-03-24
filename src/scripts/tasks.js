document.getElementById('assignBtn').addEventListener('click', async function() {
    const title = document.getElementById('taskTitle').value;
    const statusMsg = document.getElementById('statusMessage');
    
    // получаем выбранный объект (ID и имя)
    const selectedRadio = document.querySelector('input[name="object"]:checked');
    const objectId = parseInt(selectedRadio.value);
    const objectName = selectedRadio.getAttribute('data-name');

    // собираем все выбранные формулы в строку через запятую
    const checkboxes = document.querySelectorAll('input[name="zamer"]:checked');
    const formulaIds = Array.from(checkboxes).map(cb => cb.value).join(', ');

    if (!title || checkboxes.length === 0) {
        alert("Введите название задачи и выберите хотя бы один замер!");
        return;
    }

    const taskData = {
        title: title,
        objectId: objectId,
        objectName: objectName,
        description: formulaIds
    };

    try {
        const response = await fetch('/task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            statusMsg.style.color = "green";
            statusMsg.textContent = "Задача успешно назначена!";
            document.getElementById('taskTitle').value = ""; // очистка поля
        } else {
            statusMsg.textContent = "Ошибка при создании задачи";
        }
    } catch (err) {
        console.error(err);
        statusMsg.textContent = "Нет связи с сервером";
    }
});