const todos = [];

function addTodo(text) {
  todos.push({ text, done: false });
}

function finish(index) {
  if (index >= 0 && index < todos.length) {
    todos[index].done = true;
  }
}

addTodo("write code");
addTodo("test it");
finish(0);
console.log(todos.filter((t) => !t.done).length + " left");
