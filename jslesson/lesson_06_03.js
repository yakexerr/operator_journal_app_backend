function chet(a){
    if (a % 2 == 0){
        return "Чётное";
    }
    else {
        return "Нечётное";
    }
}

// console.log(chet(5));

function glasn(str){
    const alphabet = "eyuioa";
    let count = 0;
    for (let i = 0; i < str.length; i++){
        if(alphabet.includes(str[i].toLowerCase())){
            count ++;
        }
    }
    return count;
}

// console.log(glasn("JavAscript"))

function countChars(word){
    const letterCount = {};

    for (let char of word) {
        letterCount[char] = (letterCount[char] || 0) + 1;
    }
    return letterCount;
}

// console.log(countChars("Abcdd"))

let arr = [{name: 'Alex', age:20}, {name: 'Bob', age:30}, {name: 'Kate', age:32}, {name: 'John', age:20}, {name: 'Leo', age:30}]

function groupByAge(array) {
  const result = {};

  for (const person of array) {
    const age = person.age;
    const name = person.name;

    if (result[age] === undefined) {
      result[age] = [];
    }

    result[age].push(name);
  }

  return result;
}

// console.log(groupByAge(arr));

// написать замыкание
// на вход начальное значение - значение счётчика по умолчанию
// 1. Инкремент
// 2. Декремент
// 3. Получение
/*
типа такого:
console.log(counter.increment)
console.log(counter.decrement)
console.log(counter.get)
*/

function counter(count){
    function increment(){
        count++;
    }
    function decrement(){
        count--;
    }
    function get(){
        console.log(count);
    }
    return {
        increment: increment,
        decrement: decrement,
        get: get
    };
}

const result = counter(5);
result.increment(); 
result.increment();
result.decrement();
result.get();


/*
имеется массив продуктов, (name, price)
Нужно вывести топ n продуктов по цене 
*/

const products = [
  ["Яблоко", 10],
  ["Груша", 50],
  ["Банан", 30],
  ["Арбуз", 100],
  ["Дыня", 80]
];

function getTopProducts(arr, n) {
  return arr.slice().sort((a, b) => b[1] - a[1]).slice(0, n);
}

const top2 = getTopProducts(products, 2);
console.log(top2); 
