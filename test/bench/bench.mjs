// npm run bench [-- only.py,other.c]: Max's debugging, scored, against the AI. Start a test copy first:
//   MAXCODE_TEST_SCREEN=x npx electron . --remote-debugging-port=9333   (it runs beside the installed Max)
// For every program in programs/ (where the bugs are: key.json):
// debug it in the running test app (port 9333), check each planted bug got a note within a line of it, count notes on
// nothing (false alarms), then Fix all and check the saved file with the key's must / mustNot patterns. Prints a table.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url)), only = process.argv[2];
const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8')).filter((k) => !only || only.split(',').includes(k.file));
const work = path.join(os.tmpdir(), 'maxcode-bench');
fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work);
const p = (await (await fetch('http://localhost:9333/json')).json()).find((x) => x.type === 'page' && x.url.includes('index.html'));
const ws = new WebSocket(p.webSocketDebuggerUrl);
let n = 0; const pend = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); pend[d.id]?.(d.result); };
await new Promise((r) => { ws.onopen = r; });
const ev = async (e) => { const r = await new Promise((res) => { const id = ++n; pend[id] = res; ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: e, awaitPromise: true, returnByValue: true } })); }); return r.exceptionDetails ? { err: r.exceptionDetails.exception?.description } : r.result.value; };
await ev(`window.max.mode('panel'); document.querySelector('#home').hidden = true; 1`);
let found = 0, total = 0, fps = 0, fixesOk = 0, fixesAll = 0, secs = [];
const held = { found: 0, total: 0, fps: 0, ok: 0, all: 0 };   // the programs Max was never tuned on
for (const k of key) {
  const file = path.join(work, k.file);
  fs.copyFileSync(path.join(dir, 'programs', k.file), file);
  const t0 = Date.now();
  const notes = await ev(`(async () => { const f = await window.max.tutorRead(${JSON.stringify(file)}); await debug([f]);
    return S.notes.map((x) => ({ line: x.line, title: x.title, fix: !!x.find })); })()`);
  const t = (Date.now() - t0) / 1000; secs.push(t);
  if (notes.err) { console.log(k.file, 'ERROR', notes.err.slice(0, 200)); continue; }
  const hit = (b) => notes.some((x) => x.line >= b[0] - 1 && x.line <= b[1] + 1);
  const missed = k.bugs.filter((b) => !hit(b));
  const extra = notes.filter((x) => !k.bugs.some((b) => x.line >= b[0] - 1 && x.line <= b[1] + 1));
  found += k.bugs.length - missed.length; total += k.bugs.length; fps += extra.length;
  if (k.held) { held.found += k.bugs.length - missed.length; held.total += k.bugs.length; held.fps += extra.length; }
  let fixLine = '';
  if (k.bugs.length) {
    await ev(`fixAll()`);
    const out = fs.readFileSync(file, 'utf8');
    const bad = [...(k.must || []).filter((re) => !new RegExp(re).test(out)).map((re) => `needs /${re}/`), ...(k.mustNot || []).filter((re) => new RegExp(re).test(out)).map((re) => `still /${re}/`)];
    fixesAll++; if (!bad.length) fixesOk++;
    if (k.held) { held.all++; if (!bad.length) held.ok++; }
    fixLine = bad.length ? `FIX WRONG: ${bad.join('; ')}` : 'fix ok';
    if (bad.length) console.log(out.split('\n').map((l, i) => `      ${String(i + 1).padStart(2)} ${l}`).join('\n'));
  }
  console.log(`${k.file.padEnd(12)} ${t.toFixed(1).padStart(5)} s  found ${k.bugs.length - missed.length}/${k.bugs.length}  false ${extra.length}  ${fixLine}`
    + (missed.length ? `\n      missed: ${missed.map((b) => `${b[0]} ${b[2]}`).join(', ')}` : '')
    + (extra.length ? `\n      false: ${extra.map((x) => `${x.line} ${x.title}`).join(', ')}` : ''));
}
secs.sort((a, b) => a - b);
console.log(`\nTOTAL found ${found}/${total}  false alarms ${fps}  fixes right ${fixesOk}/${fixesAll}  median ${secs[Math.floor(secs.length / 2)]?.toFixed(1)} s  max ${secs[secs.length - 1]?.toFixed(1)} s`);
console.log(`HELD OUT (never tuned on) found ${held.found}/${held.total}  false alarms ${held.fps}  fixes right ${held.ok}/${held.all}`);
process.exit();
