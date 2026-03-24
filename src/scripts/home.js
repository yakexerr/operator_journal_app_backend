async function updateHome(){
    try{
        const response = await fetch('/dashboard-tasks');
        const data = await response.json();

        // находим наши контейнеры
        const listNew = document.getElementById('list-new');
        const listProgress = document.getElementById('list-progress');
        const listDone = document.getElementById('list-done');
        const template = document.getElementById('card-template');

        listNew.innerHTML = "";
        listProgress.innerHTML = "";
        listDone.innerHTML = "";

        data.forEach(item => {
            const clone = template.content.cloneNode(true);

            clone.querySelector('.card-title').textContent = item.title;
            clone.querySelector(".card-id").textContent = `Объект: ${item.objectName}`;

            if(item.status == "new"){
                listNew.appendChild(clone);
            }
            else if(item.status == "in_progress"){
                listProgress.appendChild(clone);
            }
            else if(item.status == "send" || item.status == "done"){
                listDone.appendChild(clone); 
            }
        });

    } catch (err) {
        console.log("Ошибка при отображении задач: ", err);
    }
}

updateHome();
setInterval(updateHome, 5000); // чтобы переодически сама вызывалась, автообновление