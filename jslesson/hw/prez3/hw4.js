//отсортировать массив любой сортировкой

let arr = [9,8,7,6,5,4,3,2,1,0];

for(let j = 0; j < arr.length; j++){
    for(let i = 1; i < arr.length; i++){
    if(arr[i] < arr[i-1]){
            let swap = 0;
            swap = arr[i];
            arr[i] = arr[i-1];
            arr[i-1] = swap;
        }
    }
}

// for(let i = 0; i < arr.length; i++){
//     console.log(arr[i]);
// }
const str = arr.join(", ");
console.log(str)

