// Max Code: Max's coding tutor and debugger on its own, no server. The tutor asks NVIDIA's API directly with the
// user's own key, kept encrypted on this PC (Electron safeStorage). The tutor (shared/, ui/tutor.*) came from max-assistant.
'use strict';
const { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeTheme, net, safeStorage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const tutorCode = require('./shared/tutor');

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const KEY_FILE = () => path.join(app.getPath('userData'), 'key.bin');
const COURSES = () => path.join(app.getPath('userData'), 'courses.json');
const PREFS = () => path.join(app.getPath('userData'), 'prefs.json');
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };

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
    if (res.status === 401 || res.status === 403) throw new Error('NVIDIA rejected your API key. Change it in Settings.');
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
  if (!key) throw new Error('Add your NVIDIA API key in Settings first.');
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
  const all = readJSON(COURSES());
  if (data !== undefined) { all[lang] = data; fs.writeFileSync(COURSES(), JSON.stringify(all)); }
  return all[lang] || null;
});
ipcMain.handle('tutorSave', (_e, fix) => tutorCode.applyFix(fix));
ipcMain.handle('tutorRead', (_e, p) => tutorCode.readDropped(String(p || '')));

// ---------- The window ----------
// Max hides under the bottom of the screen with just a raised hand peeking out (hide); after 2 minutes the hand goes
// too and the window is hidden. Clicking the hand, or the shortcut, calls him up as a small chibi (pet); clicking him opens the tutor as a panel above him: the window grows
// up and to the left from its bottom-right corner, so he stays where he was. Settings is its own, big window.
const HIDE = { width: 50, height: 56 }, PET = { width: 120, height: 130 }, PANEL = { width: 440, height: 640 };
const CALL = 'Control+Alt+M';
const HAND_FOR = 2 * 60 * 1000;
let win = null, settings = null, mode = 'hide';
let prefs = { onTop: true, theme: 'system' };   // theme: system | light (Paper) | dark (Frost)

let saveTimer = null;
function savePrefs() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFileSync(PREFS(), JSON.stringify(prefs)), 400);
}
// Where the window goes for its size, anchored at the saved bottom-right corner and kept on screen.
// ponytail: always grows up-left, so near the left/top edge the clamp nudges Max over; flip sides if that bothers.
function boundsFor(size) {
  const area = screen.getPrimaryDisplay().workArea;
  const right = prefs.right ?? area.x + area.width - 24, bottom = prefs.bottom ?? area.y + area.height;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  return {
    x: clamp(right - size.width, area.x, area.x + area.width - size.width),
    y: clamp(bottom - size.height, area.y, area.y + area.height - size.height), ...size,
  };
}
// Hidden, the hand sits on the bottom edge of the screen, under where Max sits.
function hideBounds() {
  const area = screen.getPrimaryDisplay().workArea, pet = boundsFor(PET);
  const x = Math.max(area.x, Math.min(pet.x + (PET.width - HIDE.width) / 2, area.x + area.width - HIDE.width));
  return { x: Math.round(x), y: area.y + area.height - HIDE.height, ...HIDE };
}
let sinkTimer = null, handTimer = null;
function setMode(m) {
  if (m === mode) return;
  clearTimeout(sinkTimer); clearTimeout(handTimer);
  mode = m;
  if (!win.isVisible()) win.show();
  win.webContents.send('mode', m);
  // He sinks (pet.css) before the window shrinks to the hand; rising, the window grows first.
  if (m === 'hide') {
    sinkTimer = setTimeout(() => win.setBounds(hideBounds()), 380);
    handTimer = setTimeout(() => win.hide(), HAND_FOR);   // only the shortcut (or opening the app again) calls him now
  }
  else win.setBounds(boundsFor(m === 'panel' ? PANEL : PET));
  if (m === 'panel') win.focus();
}
function rememberCorner() {
  if (mode === 'hide') return;   // the hand's spot follows Max's, not the other way round
  const b = win.getBounds();
  prefs.right = b.x + b.width; prefs.bottom = b.y + b.height;
  savePrefs();
}

ipcMain.handle('tutorWin', (_e, what) => {   // the tutor's close / minimise put Max back to sitting
  if (what === 'close' || what === 'min') setMode('pet');
  return prefs.onTop;
});
ipcMain.on('mode', (_e, m) => setMode(['hide', 'panel'].includes(m) ? m : 'pet'));
ipcMain.on('drag', (_e, dx, dy) => {
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
  rememberCorner();
});
ipcMain.on('petMenu', () => Menu.buildFromTemplate([
  { label: mode === 'panel' ? 'Sit down' : 'Open', click: () => setMode(mode === 'panel' ? 'pet' : 'panel') },
  { label: 'Hide', enabled: mode !== 'hide', click: () => setMode('hide') },
  { label: 'Settings', click: openSettings },
  { type: 'separator' },
  { label: 'Quit Max Code', click: () => app.quit() },
]).popup({ window: win }));
ipcMain.on('openSettings', openSettings);
ipcMain.on('quit', () => app.quit());

// ---------- Settings ----------
ipcMain.handle('prefs', () => ({ theme: prefs.theme, onTop: prefs.onTop, login: app.getLoginItemSettings().openAtLogin }));
ipcMain.handle('setPref', (_e, name, on) => {
  if (name === 'onTop') { prefs.onTop = !!on; win.setAlwaysOnTop(prefs.onTop); savePrefs(); }
  if (name === 'login') app.setLoginItemSettings({ openAtLogin: !!on });
  if (name === 'theme' && ['system', 'light', 'dark'].includes(on)) { prefs.theme = on; nativeTheme.themeSource = on; savePrefs(); }
});
ipcMain.handle('courses', () => readJSON(COURSES()));
ipcMain.on('startCourse', (_e, lang) => {
  setMode('panel');
  win.webContents.send('startCourse', String(lang));
});

function openSettings() {
  if (settings && !settings.isDestroyed()) return settings.focus();
  settings = new BrowserWindow({
    width: 760, height: 720, minWidth: 520, minHeight: 480, backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1e28' : '#fbfaf7', title: 'Max Code settings',
    icon: path.join(__dirname, 'assets', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  settings.setMenu(null);
  settings.loadFile(path.join(__dirname, 'ui', 'settings.html'));
  settings.on('closed', () => { if (win && !win.isDestroyed()) win.webContents.send('keyChanged'); });
}

function open() {
  prefs = { ...prefs, ...readJSON(PREFS()) };
  nativeTheme.themeSource = prefs.theme;
  win = new BrowserWindow({
    ...hideBounds(), frame: false, transparent: true, resizable: false, maximizable: false, skipTaskbar: true,
    hasShadow: false, alwaysOnTop: prefs.onTop, title: 'Max Code', icon: path.join(__dirname, 'assets', 'icon.png'), show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    if (!readKey()) { setMode('pet'); openSettings(); } else handTimer = setTimeout(() => win.hide(), HAND_FOR);
  });
  globalShortcut.register(CALL, () => setMode('panel'));
  win.on('moved', rememberCorner);   // dragged by the panel's title bar
}
// Links open in the browser, never inside the app (both windows).
app.on('web-contents-created', (_e, wc) => wc.setWindowOpenHandler(({ url }) => {
  if (/^https:\/\//.test(url)) shell.openExternal(url);
  return { action: 'deny' };
}));

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) setMode('panel'); });
  app.whenReady().then(open);
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
