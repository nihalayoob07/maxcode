const nums = [12, 5, 40, 7];

function biggest(list) {
  return Math.max(list);
}

function median(list) {
  const sorted = list.slice().sort();
  return sorted[Math.floor(sorted.length / 2)];
}

console.log("Biggest:", biggest(nums));
console.log("Median:", median(nums));
