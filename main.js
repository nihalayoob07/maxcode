// Max Code: Max's coding tutor and debugger on its own, no server. The tutor asks NVIDIA's API directly with the
// user's own key, kept encrypted on this PC (Electron safeStorage). The tutor (shared/, ui/tutor.*) came from max-assistant.
'use strict';
const { app, BrowserWindow, ipcMain, net, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const tutorCode = require('./shared/tutor');

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const KEY_FILE = () => path.join(app.getPath('userData'), 'key.bin');
const COURSES = () => path.join(app.getPath('userData'), 'courses.json');

// ---------- The NVIDIA key ----------
function readKey() {
  try {
    const raw = fs.readFileSync(KEY_FILE());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch { return ''; }
}
function saveKey(key) {
  fs.writeFileSync(KEY_FILE(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : key);
}

// One chat request. net.fetch goes through the PC's proxy settings like a browser would.
const asks = new Map();   // id -> AbortController, so the tutor can cancel a question it replaced
async function ask(key, body, id) {
  const ctl = new AbortController();
  if (id) asks.set(id, ctl);
  const timer = setTimeout(() => ctl.abort(), 280000);
  try {
    const res = await net.fetch(API, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) throw new Error('NVIDIA rejected your API key. Change it on the home screen.');
    if (res.status === 429) throw new Error('NVIDIA says too many requests. Wait a minute and try again.');
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.choices) throw new Error(`the model said: ${String(j?.detail || j?.error?.message || j?.error || res.status).slice(0, 160)}`);
    return j.choices[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Max took too long to answer. Try again.');
    if (/fetch failed|ERR_INTERNET|ERR_NAME|ERR_CONNECTION|ERR_NETWORK/i.test(e.message)) throw new Error("Can't reach NVIDIA. Check your internet connection.");
    throw e;
  } finally { clearTimeout(timer); asks.delete(id); }
}

ipcMain.handle('hasKey', () => !!readKey());
// A new key is tried with a one-word question before it's saved.
ipcMain.handle('setKey', async (_e, key) => {
  key = String(key || '').trim();
  if (!/^nvapi-\S{20,}$/.test(key)) throw new Error('That doesn\'t look like an NVIDIA key. It starts with "nvapi-".');
  await ask(key, { model: MODEL, messages: [{ role: 'user', content: 'Say OK.' }], max_tokens: 5 });
  saveKey(key);
  return true;
});
ipcMain.handle('openKeyPage', () => shell.openExternal('https://build.nvidia.com/settings/api-keys'));

// ---------- The tutor (same calls as app/main.js) ----------
// think: reasoning on (debugging and checking answers, where it pays).
ipcMain.handle('tutorAsk', (_e, id, messages, think) => {
  const key = readKey();
  if (!key) throw new Error('Add your NVIDIA API key on the home screen first.');
  return ask(key, { model: MODEL, messages, temperature: 0.3, max_tokens: think ? 16000 : 4000,
    chat_template_kwargs: { enable_thinking: !!think } }, id);
});
ipcMain.on('chat-cancel', (_e, id) => asks.get(id)?.abort());
ipcMain.handle('intent', (_e, text) => tutorCode.intent(text));
ipcMain.handle('editorCode', async () => {
  const code = await tutorCode.editorCode().catch(() => null);
  if (code) tutorCode.allow(code.files);
  return code;
});
ipcMain.handle('course', (_e, lang, data) => {
  let all = {};
  try { all = JSON.parse(fs.readFileSync(COURSES(), 'utf8')); } catch {}
  if (data !== undefined) { all[lang] = data; fs.writeFileSync(COURSES(), JSON.stringify(all)); }
  return all[lang] || null;
});
ipcMain.handle('tutorSave', (_e, fix) => tutorCode.applyFix(fix));
ipcMain.handle('tutorRead', (_e, p) => tutorCode.readDropped(String(p || '')));

// ---------- The window ----------
let win = null;
ipcMain.handle('tutorWin', (_e, what) => {
  if (!win || win.isDestroyed()) return false;
  if (what === 'close') win.close();
  else if (what === 'min') win.minimize();
  else if (what === 'pin') win.setAlwaysOnTop(!win.isAlwaysOnTop());
  return !win.isDestroyed() && win.isAlwaysOnTop();
});

function open() {
  win = new BrowserWindow({
    width: 980, height: 760, minWidth: 560, minHeight: 420, frame: false, backgroundColor: '#0a0a0a', title: 'Max Code',
    icon: path.join(__dirname, 'assets', 'icon.png'), show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Links open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(open);
  app.on('window-all-closed', () => app.quit());
}
