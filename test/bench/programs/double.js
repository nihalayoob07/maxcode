const nums = [1, 2, 3, 4];
const doubled = nums.map((n) => {
  n * 2;
});
const total = doubled.reduce((a, b) => a + b, 0);
console.log("Doubled:", doubled);
console.log("Total:", total);
