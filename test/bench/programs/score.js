let points = 0;
const bonus = 5;

function addPoints(n) {
  points += n;
}

addPoints(10);
addPoints(20);
console.log("Score: " + points + bonus);
