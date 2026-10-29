// node shared/fixintext.check.js: checks fixInText (Apply fix's text change) on the program from Nihal's Notepad.
'use strict';
const assert = require('assert');
const { fixInText } = require('./tutor');

const CRLF = String.fromCharCode(13, 10);
const doc = ['#include<stdio.h>', 'int main()', '{', '    int a,b', '    sum=a+b;', '    printf("sum= %f", sum);', '    return 0;', '}'].join(CRLF);

const one = fixInText(doc, 'int a,b', 'int a,b;', 4);   // a fix without its indentation: the document's is kept
assert.equal(one.split(CRLF)[3], '    int a,b;');
const two = fixInText(one, '    sum=a+b;', '    int sum=a+b;', 5);
assert.equal(two.split(CRLF)[4], '    int sum=a+b;');
assert.equal(two.split(CRLF).length, 8);                  // Windows line endings stay, nothing merged
const three = fixInText(two, 'int a,b;', '    int a, b;\n    scanf("%d %d", &a, &b);', 4);   // one line becomes two
assert.deepEqual(three.split(CRLF).slice(3, 5), ['    int a, b;', '    scanf("%d %d", &a, &b);']);
assert.equal(three.split(CRLF).length, 9);
assert.equal(fixInText(doc, 'not in the code;', 'x', 1), null);   // not there: nothing changes
console.log('fixInText ok');
