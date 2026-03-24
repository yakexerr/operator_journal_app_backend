async function updateAnalytics() {
    try {
        const response = await fetch('http://85.209.129.205:3000/reports');
        const data = await response.json();
        
        const grid = document.getElementById('analytics-grid');
        const template = document.getElementById('card-template');
        grid.innerHTML = ""; 

        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            const cardElement = clone.querySelector('.card');

            // Исправляем ключи ( taskId вместо report_id )
            clone.querySelector('.card-title').textContent = item.title;
            
            // Проверка даты
            const date = item.created_at ? new Date(item.created_at).toLocaleString() : "Дата не указана";
            clone.querySelector('.card-date').textContent = date;
            
            clone.querySelector('.card-id').textContent = `Задача №${item.taskId} | Объект: ${item.objectId}`;

            // клик по карточке — показываем все данные в алерте (мини-окно)
            cardElement.onclick = () => {
                let info = `ОТЧЕТ: ${item.title}\n`;
                info += `Объект: ${item.objectName}\n`;
                info += `Дата: ${new Date(item.created_at).toLocaleString()}\n`;
                info += `--------------------------\n`;
                info += `РЕЗУЛЬТАТЫ:\n`;

                // Перебираем вложенные расчеты
                if (item.calculations && item.calculations.length > 0) {
                    item.calculations.forEach(c => {
                        info += `• ${c.title}: ${c.result}\n`;
                    });
                } else {
                    info += `Расчетов нет\n`;
                }

                alert(info);
            };

            grid.appendChild(clone);
        });
    } catch (error) {
        console.error("Ошибка аналитики:", error);
    }
}
updateAnalytics();