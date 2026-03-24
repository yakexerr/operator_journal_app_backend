// првоверить доступ пользователся по возрасту (разрешить только больше 18)

let person = {name: 'Alex', age: 18};

function moshno(person){

    let accept = person['age'] > 17 ? "Можно" : "Нельзя";
    return accept;

}


console.log(moshno(person));


// проверить что в заказе количество больше нуля и цена не отрицательна
let order = {price: 10, quantity: 5, product: "apple"};

function checkOrder(order){
    try {
        let validPrice = order.price > 0 && order.quantity > 0 ? `Order ${order.product}: ${order.quantity * order.price} price` : "Ошибка в заказе";
        return validPrice;
    } catch (e) {
        throw new Error("Something wrong!");
    }
    
}

console.log(checkOrder(order))


// написать функцию которая определяет статус пользователя: Admin, User, Guest
let user = {name: "Alex", isAdmin: false, isLoggedIn: false};

function userStatus(user){
    let status = user.isAdmin === true ? "Admin" : user.isLoggedIn == true ? "User" : "Guest";
    return status;
}

console.log(userStatus(user));


// ффункция валидация пароля, меньше 8 - слишком короткий, от 8 до 12 слабый пароль и от 12 хороший пароль

function validPassword(password){
    if(password.length < 8){
        throw new Error("Слишком маленький пароль!");
    } else if(password.length < 12){
        console.log("Слабый пароль");
    } else {
        console.log("Хороший пароль");
    }

}

// console.log(validPassword("123451231236789"));
let pass = "123"
validPassword(pass)