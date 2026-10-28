// Max Code: Max's coding tutor and debugger on its own, no server. The tutor asks NVIDIA's API directly with the
// user's own key, and talks and listens through ElevenLabs with theirs; both kept encrypted on this PC (safeStorage). The tutor (shared/, ui/tutor.*) came from max-assistant.
'use strict';
const { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeTheme, net, safeStorage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const tutorCode = require('./shared/tutor');

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const KEY_FILE = () => path.join(app.getPath('userData'), 'key.bin');
const VOICE_KEY_FILE = () => path.join(app.getPath('userData'), 'voice-key.bin');
const COURSES = () => path.join(app.getPath('userData'), 'courses.json');
const PREFS = () => path.join(app.getPath('userData'), 'prefs.json');
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };

// ---------- The keys (NVIDIA, and ElevenLabs for the voice) ----------
function readKey(file = KEY_FILE()) {
  try {
    const raw = fs.readFileSync(file);
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch { return ''; }
}
function saveKey(key, file = KEY_FILE()) {
  fs.writeFileSync(file, safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : key);
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
ipcMain.handle('openKeyPage', (_e, which) => shell.openExternal(which === 'voice'
  ? 'https://elevenlabs.io/app/settings/api-keys' : 'https://build.nvidia.com/settings/api-keys'));

// ---------- The tutor (same calls as app/main.js) ----------
// think: reasoning on (debugging and checking answers, where it pays).
// The user's level (Settings) is added to the tutor's instructions, so every answer is pitched for them.
const LEVELS = {
  beginner: 'The user is a beginner: explain like a patient teacher, avoid jargon or explain it in a few plain words, use the simplest example that works, one idea at a time.',
  intermediate: 'The user is an intermediate programmer: skip the basics, use normal technical terms, and keep explanations short and focused on why.',
  expert: 'The user is an expert: be terse and precise, use full technical vocabulary, skip anything obvious, and point out edge cases, performance and idiomatic alternatives where they matter.',
};
ipcMain.handle('tutorAsk', (_e, id, messages, think) => {
  const key = readKey();
  if (!key) throw new Error('Add your NVIDIA API key in Settings first.');
  const level = LEVELS[prefs.level] || LEVELS.beginner;
  messages = messages.map((m, i) => (i === 0 && m.role === 'system' ? { ...m, content: `${m.content} ${level}` } : m));
  return ask(key, { model: MODEL, messages, temperature: 0.3, max_tokens: think ? 16000 : 4000,
    chat_template_kwargs: { enable_thinking: !!think } }, id);
});
ipcMain.on('chat-cancel', (_e, id) => asks.get(id)?.abort());

// ---------- The voice: ElevenLabs talks (text to speech) and listens (speech to text) ----------
// Max's own voice; an account that can't use it gets a stock ElevenLabs voice instead.
const VOICES = ['q1OMOTZNtqpS50TIQtu4', 'JBFqnCBsd6RMkjVDRZzb'];
let voice = 0;
function elevenError(status, body) {
  if (status === 401) return /missing_permissions/.test(body)
    ? "Your ElevenLabs key isn't allowed to do that. Turn on Text to Speech and Speech to Text for it."
    : 'ElevenLabs rejected your key. Change it in Settings.';
  if (status === 429 || /quota|credits/i.test(body)) return 'ElevenLabs says you are out of credits for now.';
  return `ElevenLabs said: ${String(body).slice(0, 140) || status}`;
}
const voiceKey = () => {
  const key = readKey(VOICE_KEY_FILE());
  if (!key) throw new Error('Add an ElevenLabs key in Settings to talk to Max.');
  return key;
};
// Raw 24 kHz 16-bit PCM back, as float samples for the panel to play (tutor.js onTts).
async function elevenSpeech(key, text) {
  for (;;) {
    const res = await net.fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}?output_format=pcm_24000`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
    });
    if (res.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      const audio = new Float32Array(bytes.length >> 1);
      for (let i = 0; i < audio.length; i++) audio[i] = bytes.readInt16LE(i * 2) / 32768;
      return audio;
    }
    const body = await res.text().catch(() => '');
    if (voice < VOICES.length - 1 && (res.status === 404 || /voice/i.test(body)) && res.status !== 401) { voice++; continue; }
    throw new Error(elevenError(res.status, body));
  }
}
const hush = new Set();   // ids the panel stopped (a new step, mute)
ipcMain.on('cancelSpeak', (_e, id) => hush.add(id));
// Long answers go in ~350-character pieces at sentence ends, played back to back.
ipcMain.handle('speak', async (e, id, text) => {
  const key = voiceKey();
  const chunks = [];
  for (const s of String(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || []) {
    if (chunks.length && (chunks[chunks.length - 1] + s).length <= 350) chunks[chunks.length - 1] += s;
    else chunks.push(s);
  }
  try {
    for (const c of chunks) {
      if (hush.has(id) || e.sender.isDestroyed()) break;
      const audio = await elevenSpeech(key, c.trim());
      if (hush.has(id) || e.sender.isDestroyed()) break;
      e.sender.send('tts', { id, rate: 24000, pcm: audio.buffer });
    }
  } finally { hush.delete(id); }
});
// What the mic heard (webm from the panel) as text.
ipcMain.handle('transcribe', async (_e, audio) => {
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('tag_audio_events', 'false');
  form.append('file', new Blob([Buffer.from(audio)], { type: 'audio/webm' }), 'speech.webm');
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': voiceKey() }, body: form });
  if (!res.ok) throw new Error(elevenError(res.status, await res.text().catch(() => '')));
  return String((await res.json()).text || '').trim();
});
ipcMain.handle('hasVoiceKey', () => !!readKey(VOICE_KEY_FILE()));
// A key that can't read the account (a restricted one) is still fine if it isn't rejected outright.
ipcMain.handle('setVoiceKey', async (_e, key) => {
  key = String(key || '').trim();
  if (key.length < 20) throw new Error("That doesn't look like an ElevenLabs key.");
  const res = await net.fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } }).catch(() => null);
  if (!res) throw new Error("Can't reach ElevenLabs. Check your internet connection.");
  const body = res.ok ? '' : await res.text().catch(() => '');
  if (!res.ok && !/missing_permissions/.test(body)) throw new Error(elevenError(res.status, body));
  saveKey(key, VOICE_KEY_FILE());
  return true;
});

// Spoken requests go where the full app sends them: the tutor's own commands while it shows something ("next",
// "fix number two", "yes"), then a new job ("teach me Rust", "debug my code"), then a question about the code.
let waiting = null;   // what the tutor asked last (tutor.js setWaiting)
ipcMain.on('tutorState', (_e, w) => { waiting = w; });
const toTutor = (job) => win.webContents.send('tutor', job);
async function startJob(job) {
  if (job.kind === 'course') return toTutor({ kind: 'course', lang: job.lang });
  if (job.kind === 'learn') return toTutor(job.lang ? { kind: 'learn', topic: job.topic, lang: job.lang } : { kind: 'pick', topic: job.topic });
  if (job.kind === 'explain') return toTutor({ kind: 'drop', then: 'explain' });
  const code = await tutorCode.editorCode().catch(() => null);
  if (!code) return toTutor({ kind: 'drop', then: 'debug', note: "I can't see a code file open in your editor. Drop it here, or paste the program" });
  tutorCode.allow(code.files);
  toTutor({ kind: 'debug', ...code });
}
ipcMain.handle('heard', async (_e, text, onScreen) => {
  const tc = onScreen ? tutorCode.command(text, waiting) : null;
  if (tc?.cmd === 'close') return setMode('pet');
  if (tc && tc.cmd !== 'ask') return toTutor({ kind: 'cmd', ...tc });
  const job = tutorCode.intent(text);
  if (job) return startJob(job);
  toTutor(onScreen ? { kind: 'cmd', cmd: 'ask', text } : { kind: 'pick', topic: text });
});
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
const HAND_FOR = 2 * 60 * 1000;
let win = null, settings = null, mode = 'hide';
let prefs = { onTop: true, theme: 'system', call: 'Control+Alt+M', level: 'beginner' };   // theme: system | light (Paper) | dark (Frost)

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
ipcMain.handle('prefs', () => ({ level: prefs.level, call: prefs.call, theme: prefs.theme, onTop: prefs.onTop, login: app.getLoginItemSettings().openAtLogin }));
ipcMain.handle('setPref', (_e, name, on) => {
  if (name === 'onTop') { prefs.onTop = !!on; win.setAlwaysOnTop(prefs.onTop); savePrefs(); }
  if (name === 'login') app.setLoginItemSettings({ openAtLogin: !!on });
  if (name === 'theme' && ['system', 'light', 'dark'].includes(on)) { prefs.theme = on; nativeTheme.themeSource = on; savePrefs(); }
  if (name === 'level' && LEVELS[on]) { prefs.level = on; savePrefs(); }
  if (name === 'call') {
    if (!bindCall(String(on))) { bindCall(prefs.call); throw new Error("Windows or another app already uses that one. Try another."); }
    prefs.call = String(on); savePrefs();
  }
});
ipcMain.handle('courses', () => readJSON(COURSES()));
// The shortcut that calls Max (Settings can change it); pressed again with his panel open, he listens.
// false if it's taken or not a valid accelerator.
function bindCall(acc) {
  globalShortcut.unregisterAll();
  try { return globalShortcut.register(acc, () => (mode === 'panel' ? win.webContents.send('listen') : setMode('panel'))); } catch { return false; }
}

function openSettings() {
  if (settings && !settings.isDestroyed()) return settings.focus();
  settings = new BrowserWindow({
    width: 380, height: 420, useContentSize: true, resizable: false, maximizable: false, minimizable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1e28' : '#fbfaf7', title: 'Max Code settings',
    icon: path.join(__dirname, 'assets', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  settings.setMenu(null);
  settings.loadFile(path.join(__dirname, 'ui', 'settings.html'));
  // Exactly as tall as what's in it.
  settings.webContents.on('did-finish-load', async () => {
    const h = await settings.webContents.executeJavaScript("document.querySelector('.homebox').offsetHeight + 24");
    settings.setContentSize(380, Math.min(Math.ceil(h), screen.getPrimaryDisplay().workArea.height - 60));
  });
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
  bindCall(prefs.call);
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
