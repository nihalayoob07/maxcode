// npm test: Max's own code checks (ui/tutor.js undeclared(): undeclared variables, number variables read before they
// get a value, whole-number division into a double), with no AI involved. The bench programs must give exactly the
// notes listed below: every real one, and nothing on the correct programs.
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'tutor.js'), 'utf8');
const grab = (name) => src.slice(src.indexOf(`function ${name}(`)).replace(/\n}\n[\s\S]*/, '\n}');
// The functions are lifted out of our own page script (it runs in the browser, so it can't be required).
const undeclared = new Function(`${src.match(/^const unnumber = .*$/m)[0]}\n${grab('numbersJoinedAsText')}\n${grab('classicTraps')}\n${grab('undeclared')}\nreturn undeclared;`)();

// Nihal's program: sum declared, a and b given values
const code = '#include<stdio.h>\nint main()\n{\n    int a,b;\n    sum=a+b;\n    printf("sum is %d",sum);\n    return 0;\n}';
let out = undeclared({ name: 'on screen.c', code }, 'C', []);
assert.deepStrictEqual(out.map((e) => e.line), [5, 4]);
assert.strictEqual(out[0].replace, '    int sum=a+b;');
assert.strictEqual(out[1].replace, '    int a,b;\n    a = 2;\n    b = 3;');
// Max's own note without a fix gets this one
const fixless = [{ line: 5, title: 'variable not declared', say: 'The name sum is used but never declared with a type.', find: '', replace: '' }];
out = undeclared({ name: 'on screen.c', code }, 'C', fixless);
assert.strictEqual(fixless[0].replace, '    int sum=a+b;');
assert.strictEqual(out.length, 1);
// a ;-only fix on the same line takes the declaring fix (which adds the ; too)
const semi = [{ line: 5, title: 'missing semicolon', say: 'add ;', find: '    sum=a+b', replace: '    sum=a+b;' }];
undeclared({ name: 'on screen.c', code: code.replace('sum=a+b;', 'sum=a+b') }, 'C', semi);
assert.strictEqual(semi[0].replace, '    int sum=a+b;');
// values given, scanf, for-loop counters, struct fields: no notes
assert.strictEqual(undeclared({ name: 'x.c', code: 'int main(){\n int a,b;\n a=1;\n b=2;\n int s=a+b;\n}' }, 'C', []).length, 0);
assert.strictEqual(undeclared({ name: 'x.c', code: 'int main(){\n int a;\n scanf("%d",&a);\n int s=a+1;\n}' }, 'C', []).length, 0);
assert.strictEqual(undeclared({ name: 'x.c', code: 'int main(){\n int i, s = 0;\n for (i = 0; i < 3; i++) s += i;\n}' }, 'C', []).length, 0);
assert.strictEqual(undeclared({ name: 'x.h', code: 'typedef struct {\n    int id;\n} T;\nvoid f(T *t, int id);' }, 'C', []).length, 0);
// whole-number division into a double: flagged with a cast; int results and decimal operands left alone
const div = (c) => undeclared({ name: 'G.java', code: c }, 'Java', []).filter((e) => e.title === 'integer division');
assert.strictEqual(div('class G {\n    static double average(int[] marks) {\n        int sum = 0;\n        return sum / marks.length;\n    }\n}')[0].replace, '        return (double) sum / marks.length;');
assert.strictEqual(div('class G {\n    void f(int a, int b) {\n        double r = a / b;\n    }\n}')[0].replace, '        double r = (double) a / b;');
assert.strictEqual(div('class G {\n    static int half(int n) {\n        return n / 2;\n    }\n}').length, 0);
assert.strictEqual(div('class G {\n    static double avg(double s, int n) {\n        return s / n;\n    }\n}').length, 0);

// numbers joined as text: flagged only when both sides are certainly numbers
const join = (c, lang = 'JavaScript') => undeclared({ name: 'x', code: c }, lang, []).filter((e) => e.title === 'numbers joined as text');
assert.strictEqual(join('let total = 70;\nfunction ship(t) {\n  return t > 50 ? 0 : 5;\n}\nconsole.log("Total: " + total + ship(total));')[0].replace,
  'console.log("Total: " + (total + ship(total)));');
assert.strictEqual(join('let a = 1, b = 2;\nconst c = a * 3;\nconsole.log("Sum: " + a + c);').length, 1);
assert.strictEqual(join('const first = "Ada";\nconst last = "Lovelace";\nconsole.log("Name: " + first + " " + last);').length, 0);   // text
assert.strictEqual(join('const first = "Ada";\nconst last = "Lovelace";\nconsole.log("Name: " + first + last);').length, 0);   // text, no space
assert.strictEqual(join('let lo = 1, hi = 9;\nconsole.log("Range: " + lo + "-" + hi);').length, 0);   // numbers kept apart by text
assert.strictEqual(join('let a = 1, b = 2;\nconsole.log("Sum: " + (a + b));').length, 0);   // already in brackets
assert.strictEqual(join('function show(x, y) {\n  console.log("Got " + x + y);\n}').length, 0);   // unknown: could be text
assert.strictEqual(join('let n = 0;\nn = "zero";\nconsole.log("n: " + n + n);').length, 0);   // given text somewhere
assert.strictEqual(join('class S {\n    static int total(int[] a) {\n        return 0;\n    }\n    public static void main(String[] args) {\n        int extra = 5;\n        System.out.println("Total: " + total(null) + extra);\n    }\n}', 'Java').length, 1);
assert.strictEqual(join('class S {\n    public static void main(String[] args) {\n        String a = "x";\n        int b = 1;\n        System.out.println("v: " + a + b);\n    }\n}', 'Java').length, 0);

// classic traps: if's without else, .sort() on numbers
const trap = (c, lang, title) => undeclared({ name: 'x', code: c }, lang, []).filter((e) => e.title === title);
assert.strictEqual(trap('int f(int s) {\n    char g = \'F\';\n    if (s >= 90) g = \'A\';\n    if (s >= 80) g = \'B\';\n    return g;\n}', 'C', 'missing else')[0].replace,
  "    if (s >= 90) g = 'A';\n    else if (s >= 80) g = 'B';");
assert.strictEqual(trap('int f(int s) {\n    char g = \'F\';\n    if (s >= 90) g = \'A\';\n    else if (s >= 80) g = \'B\';\n    return g;\n}', 'C', 'missing else').length, 0);   // already chained
assert.strictEqual(trap('int f(int s) {\n    char g = \'F\';\n    if (s >= 60) g = \'C\';\n    if (s >= 75) g = \'B\';\n    return g;\n}', 'C', 'missing else').length, 0);   // rising: overwriting on purpose
assert.strictEqual(trap('int f(int a, int b) {\n    int x = 0;\n    if (a > 1) x = 1;\n    if (b > 0) x = 2;\n    return x;\n}', 'C', 'missing else').length, 0);   // different values tested
assert.strictEqual(trap('const n = [3, 1, 2];\nfunction mid(list) {\n  return list.slice().sort()[1];\n}\nconsole.log(mid(n));', 'JavaScript', 'sort() sorts numbers as text')[0].replace, '  return list.slice().sort((a, b) => a - b)[1];');
assert.strictEqual(trap('const w = ["b", "a"];\nw.sort();', 'JavaScript', 'sort() sorts numbers as text').length, 0);   // text sorts fine
assert.strictEqual(trap('const n = [3, 1, 2];\nn.sort((a, b) => a - b);', 'JavaScript', 'sort() sorts numbers as text').length, 0);

// The bench programs (test/bench/programs): exactly these notes, nothing else
const LANG = { '.cs': 'C#', '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.py': 'Python', '.js': 'JavaScript' };
const want = { 'cart.js': ['23 numbers joined as text'], 'score.js': ['10 numbers joined as text'], 'stats.js': ['8 sort() sorts numbers as text'], 'Grade.cs': ['9 missing else'], 'inject.c': ['8 variable has no value'], 'Grades.java': ['7 integer division'], 'sum.c': ['5 variable not declared', '4 variable has no value'], 'vec.cpp': ['7 variable has no value'] };
const dir = path.join(__dirname, 'bench', 'programs');
for (const f of fs.readdirSync(dir)) {
  const got = undeclared({ name: f, code: fs.readFileSync(path.join(dir, f), 'utf8') }, LANG[path.extname(f)], []).map((e) => `${e.line} ${e.title}`);
  assert.deepStrictEqual(got, want[f] || [], f);
}
console.log('checks ok');
