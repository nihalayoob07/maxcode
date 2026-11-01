const users = { asha: "pa55", bilal: "qwerty" };

function login(name, password) {
  if (users[name] === password) {
    return "Welcome " + name;
  }
  return "Wrong name or password";
}

console.log(login("asha", "pa55"));
console.log(logn("bilal", "nope"));
