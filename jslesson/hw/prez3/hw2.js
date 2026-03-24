let num = 70783;
function sumInNum(num){
    let strnum = num.toString();
    if(num < 0){
        num *= -1;
    }
    let sum = Number(strnum[0]);

    for (let i = 1; i < strnum.length; i++){
        sum += Number(strnum[i]);
    }
    return sum;
}

console.log(sumInNum(num));