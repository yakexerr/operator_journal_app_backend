// Самая большая цифра в числе

let num = 70783;
function biggestNum(num){
    let strnum = num.toString();
    if(num < 0){
        num *= -1;
    }
    let max = Number(strnum[0]);

    for (let i = 1; i < strnum.length; i++){
        if(+(strnum[i]) > max){
            max = Number(strnum[i]);
        }
        
    }
    return max;
}

console.log(biggestNum(num));