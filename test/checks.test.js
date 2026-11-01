// npm test: Max's own code checks (ui/tutor.js undeclared(): undeclared variables, number variables read before they
// get a value, whole-number division into a double), with no AI involved. The bench programs must give exactly the
// notes listed below: every real one, and nothing on the correct programs.
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'tutor.js'), 'utf8');
const grab = (name) => src.slice(src.indexOf(`function ${name}(`)).replace(/\n}\n[\s\S]*/, '\n}');
// The functions are lifted out of our own page script (it runs in the browser, so it can't be required).
const undeclared = new Function(`${src.match(/^const unnumber = .*$/m)[0]}\n${grab('undeclared')}\nreturn undeclared;`)();

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

// The bench programs (test/bench/programs): exactly these notes, nothing else
const LANG = { '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.py': 'Python', '.js': 'JavaScript' };
const want = { 'Grades.java': ['7 integer division'], 'sum.c': ['5 variable not declared', '4 variable has no value'], 'vec.cpp': ['7 variable has no value'] };
const dir = path.join(__dirname, 'bench', 'programs');
for (const f of fs.readdirSync(dir)) {
  const got = undeclared({ name: f, code: fs.readFileSync(path.join(dir, f), 'utf8') }, LANG[path.extname(f)], []).map((e) => `${e.line} ${e.title}`);
  assert.deepStrictEqual(got, want[f] || [], f);
}
console.log('checks ok');
