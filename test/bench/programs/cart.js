const items = [
  { name: "pen", price: 2.5, qty: 4 },
  { name: "book", price: 12, qty: 1 },
  { name: "bag", price: 30, qty: 2 },
];

function cartTotal(list) {
  let total = 0;
  for (let i = 0; i <= list.length; i++) {
    total += list[i].price * list[i].qty;
  }
  return total;
}

function shipping(total) {
  if (total = 0) {
    return 0;
  }
  return total > 50 ? 0 : 5;
}

const total = cartTotal(items);
console.log("Total: " + total + shipping(total));
