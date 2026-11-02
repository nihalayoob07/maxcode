// npm run qa: Max's answers to common learner questions (questions.json), scored on the facts each must contain
// ("all": every pattern matches, "none": none does), at Beginner and at Expert (how long each answer is shows the
// level working). Needs a test copy on port 9333, like the bench.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const qs = JSON.parse(fs.readFileSync(path.join(dir, 'questions.json'), 'utf8'));
const p = (await (await fetch('http://localhost:9333/json')).json()).find((x) => x.type === 'page' && x.url.includes('index.html'));
const ws = new WebSocket(p.webSocketDebuggerUrl);
let n = 0; const pend = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); pend[d.id]?.(d.result); };
await new Promise((r) => { ws.onopen = r; });
const ev = async (e) => { const r = await new Promise((res) => { const id = ++n; pend[id] = res; ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: e, awaitPromise: true, returnByValue: true } })); }); return r.exceptionDetails ? `ERR ${r.exceptionDetails.exception?.description}` : r.result.value; };
let ok = 0;
const words = { beginner: [], expert: [] };
for (const level of ['beginner', 'expert']) {
  await ev(`window.max.setPref('level', '${level}')`);
  for (const { q, all = [], none = [] } of qs) {
    const a = String(await ev(`(async () => { reset(null); render(); document.querySelector('#home').hidden = true; await question(${JSON.stringify(q)}); return S.answer?.say || document.querySelector('#task').textContent; })()`));
    const miss = all.filter((re) => !new RegExp(re, 'i').test(a)), bad = none.filter((re) => new RegExp(re, 'i').test(a));
    words[level].push(a.split(/\s+/).length);
    if (level === 'beginner') { if (!miss.length && !bad.length) ok++; else console.log(`MISS ${q}\n   ${a}\n   needs ${miss.join(', ')}${bad.length ? ` | must not ${bad.join(', ')}` : ''}`); }
  }
}
await ev(`window.max.setPref('level', 'beginner')`);
const avg = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
console.log(`\nQA right ${ok}/${qs.length}  |  words per answer: beginner ${avg(words.beginner)}, expert ${avg(words.expert)}`);
process.exit();
