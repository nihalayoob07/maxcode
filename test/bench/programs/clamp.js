function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}

const lo = 0;
const hi = 10;
console.log("Range: " + lo + "-" + hi);
console.log("Clamped: " + clamp(15, lo, hi));
