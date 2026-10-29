// Max Code: Max's coding tutor and debugger. With no keys it goes through the free Max Code server (server/, on
// Vercel), which holds Nihal's NVIDIA and ElevenLabs keys and gives each install a daily allowance. A user who adds
// their own keys (kept encrypted on this PC with safeStorage) goes straight to NVIDIA / ElevenLabs, with no limits. The tutor (shared/, ui/tutor.*) came from max-assistant.
'use strict';
const { app, BrowserWindow, Tray, clipboard, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, net, safeStorage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const tutorCode = require('./shared/tutor');

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const VL_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';   // reads code off the screen
const SERVER = 'https://maxcode-server-weld.vercel.app';
const KEY_FILE = () => path.join(app.getPath('userData'), 'key.bin');
const VOICE_KEY_FILE = () => path.join(app.getPath('userData'), 'voice-key.bin');
const PLUS_KEY_FILE = () => path.join(app.getPath('userData'), 'plus-key.bin');   // a Max Plus licence (Lemon Squeezy)
const COURSES = () => path.join(app.getPath('userData'), 'courses.json');
const PREFS = () => path.join(app.getPath('userData'), 'prefs.json');
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
// A random id for this install, made on first run: what the server counts the daily allowance against.
let install = '';
function installId() {
  if (process.env.MAXCODE_TEST_SCREEN) return 'maxcode-test-run-0001';   // test runs don't use up the real install's allowance
  const f = path.join(app.getPath('userData'), 'install-id');
  try { install ||= fs.readFileSync(f, 'utf8').trim(); } catch {}
  if (!install) fs.writeFileSync(f, (install = require('crypto').randomUUID()));
  return install;
}
// The server's own words when it says no (a daily limit, not set up yet).
const serverSays = async (res) => (await res.clone().json().catch(() => null))?.error;

// ---------- The keys (NVIDIA, and ElevenLabs for the voice) ----------
// Encrypted with Windows' DPAPI for this Windows user (through PowerShell), not Electron's safeStorage. safeStorage's
// own secret lives in "Local State", and two copies starting at once (an install launching Max while another starts)
// could end up with different ones, so a saved key became unreadable after a restart. Read once at startup, then kept.
const DPAPI = (op) => `Add-Type -AssemblyName System.Security
[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::${op}([Convert]::FromBase64String($env:MAXCODE_IN), $null, 'CurrentUser'))`;
const dpapi = async (op, b64) => String(await powershell(DPAPI(op), { MAXCODE_IN: b64 }, 15000)).trim();
const keys = {}, lost = {};   // file -> the key; file -> true if a saved key couldn't be read
async function loadKey(file) {
  let raw;
  try { raw = fs.readFileSync(file); } catch { return; }
  try {
    if (raw.subarray(0, 4).toString() === 'DP1:') keys[file] = Buffer.from(await dpapi('Unprotect', raw.subarray(4).toString()), 'base64').toString('utf8');
    else await saveKey(safeStorage.decryptString(raw), file);   // saved by an older version: move it over if it still reads
  } catch { lost[file] = true; }
}
const readKey = (file = KEY_FILE()) => keys[file] || '';
async function saveKey(key, file = KEY_FILE()) {
  fs.writeFileSync(file, `DP1:${await dpapi('Protect', Buffer.from(key, 'utf8').toString('base64'))}`);
  keys[file] = key;
  delete lost[file];
}

// One chat request: to NVIDIA with the user's own key, or through the Max Code server without one. net.fetch goes
// through the PC's proxy settings like a browser would.
const asks = new Map();   // id -> AbortController, so the tutor can cancel a question it replaced
async function ask(body, id, key = readKey(), ms = 280000) {
  const ctl = new AbortController();
  if (id) asks.set(id, ctl);
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await net.fetch(key ? API : `${SERVER}/api/chat`, {
      method: 'POST', signal: ctl.signal, body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : { 'X-Max-Install': installId() }) },
    });
    const said = !key && !res.ok && await serverSays(res);
    if (said) throw new Error(said);
    if (key && (res.status === 401 || res.status === 403)) throw new Error('NVIDIA rejected your API key. Change it in Settings.');
    if (res.status === 429) throw new Error('NVIDIA says too many requests. Wait a minute and try again.');
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.choices) throw new Error(`the model said: ${String(j?.detail || j?.error?.message || j?.error || res.status).slice(0, 160)}`);
    return j.choices[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Max took too long to answer. Try again.');
    if (/fetch failed|ERR_INTERNET|ERR_NAME|ERR_CONNECTION|ERR_NETWORK/i.test(e.message)) throw new Error("Can't reach Max. Check your internet connection.");
    throw e;
  } finally { clearTimeout(timer); asks.delete(id); }
}

ipcMain.handle('hasKey', () => (readKey() ? true : lost[KEY_FILE()] ? 'lost' : false));
// A new key is tried with a one-word question before it's saved.
ipcMain.handle('setKey', async (_e, key) => {
  key = String(key || '').trim();
  if (!/^nvapi-\S{20,}$/.test(key)) throw new Error('That doesn\'t look like an NVIDIA key. It starts with "nvapi-".');
  await ask({ model: MODEL, messages: [{ role: 'user', content: 'Say OK.' }], max_tokens: 5 }, null, key);
  await saveKey(key);
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
  const level = LEVELS[prefs.level] || LEVELS.beginner;
  messages = messages.map((m, i) => (i === 0 && m.role === 'system' ? { ...m, content: `${m.content} ${level}` } : m));
  // think: NVIDIA's big model (much better at real bugs and sound fixes), no reasoning (~3 s). 'big' (debugging) waits
  // as long as any question; true (a quiet extra look) gives up after 90 s.
  // Everything the tutor asks goes to the big model: without reasoning it answers in ~3 s, and the small one got
  // things plainly wrong (it told a user `int a,b` needed commas).
  return ask({ model: VL_MODEL, messages, temperature: think ? 0.1 : 0.3, max_tokens: think ? 8000 : 4000,
    chat_template_kwargs: { enable_thinking: false } }, id, undefined, think === true ? 90000 : 280000);
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
// Raw 24 kHz 16-bit PCM back, as float samples for the panel to play (tutor.js onTts): from ElevenLabs with the
// user's own key, or the Max Code server's voice without one.
async function elevenSpeech(key, text) {
  for (;;) {
    const res = key
      ? await net.fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}?output_format=pcm_24000`, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
      })
      : await net.fetch(`${SERVER}/api/speak`, {
        method: 'POST', body: JSON.stringify({ text }),
        headers: { 'Content-Type': 'application/json', 'X-Max-Install': installId(), ...(readKey(PLUS_KEY_FILE()) && { 'X-Max-Plus': readKey(PLUS_KEY_FILE()) }) },
      });
    if (!key && !res.ok) throw new Error(await serverSays(res) || "Max can't talk right now.");
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
  const key = readKey(VOICE_KEY_FILE());
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
// What the mic heard (16 kHz float samples from voice.js) as text: the local Whisper that hears "Max" (no key, nothing
// leaves the PC), or ElevenLabs if the user added a key.
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
}
ipcMain.handle('transcribe', async (_e, buffer) => {
  const audio = new Float32Array(buffer);
  const key = readKey(VOICE_KEY_FILE());
  if (!key) {
    const text = String((await (await asr())(audio, { no_repeat_ngram_size: 3, max_new_tokens: 160 }))?.text || '').trim();
    return /^(\[.*\]|\(.*\)|you\.?|thank you\.?|thanks for watching!?|\.+)$/i.test(text) ? '' : text;   // Whisper's noises for silence
  }
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('tag_audio_events', 'false');
  form.append('file', new Blob([wav(audio)], { type: 'audio/wav' }), 'speech.wav');
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: form });
  if (!res.ok) throw new Error(elevenError(res.status, await res.text().catch(() => '')));
  return String((await res.json()).text || '').trim();
});
// Max Plus: the licence is checked by the Max Code server (with Lemon Squeezy) before it's saved.
ipcMain.handle('hasPlusKey', () => (readKey(PLUS_KEY_FILE()) ? true : lost[PLUS_KEY_FILE()] ? 'lost' : false));
ipcMain.handle('setPlusKey', async (_e, key) => {
  key = String(key || '').trim();
  const res = await net.fetch(`${SERVER}/api/plus`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).catch(() => null);
  if (!res) throw new Error("Can't reach Max. Check your internet connection.");
  const j = await res.json().catch(() => ({}));
  if (!j.valid) throw new Error(j.error || "That isn't a valid Max Plus licence key (or its subscription has ended).");
  await saveKey(key, PLUS_KEY_FILE());
  return true;
});
ipcMain.handle('buyPlus', async () => {
  const j = await (await net.fetch(`${SERVER}/api/plus`).catch(() => null))?.json().catch(() => null);
  if (!j?.checkout) throw new Error("Max Plus isn't on sale yet.");
  shell.openExternal(j.checkout);
});
ipcMain.handle('hasVoiceKey', () => (readKey(VOICE_KEY_FILE()) ? true : lost[VOICE_KEY_FILE()] ? 'lost' : false));
// A key that can't read the account (a restricted one) is still fine if it isn't rejected outright.
ipcMain.handle('setVoiceKey', async (_e, key) => {
  key = String(key || '').trim();
  if (key.length < 20) throw new Error("That doesn't look like an ElevenLabs key.");
  const res = await net.fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } }).catch(() => null);
  if (!res) throw new Error("Can't reach ElevenLabs. Check your internet connection.");
  const body = res.ok ? '' : await res.text().catch(() => '');
  if (!res.ok && !/missing_permissions/.test(body)) throw new Error(elevenError(res.status, body));
  await saveKey(key, VOICE_KEY_FILE());
  return true;
});

// Spoken requests go where the full app sends them: the tutor's own commands while it shows something ("next",
// "fix number two", "yes"), then a new job ("teach me Rust", "debug my code"), then a question about the code.
let waiting = null;   // what the tutor asked last (tutor.js setWaiting)
ipcMain.on('tutorState', (_e, w) => { waiting = w; });
const toTutor = (job) => win.webContents.send('tutor', job);
function startJob(job) {
  if (job.kind === 'course') return toTutor({ kind: 'course', lang: job.lang });
  if (job.kind === 'learn') return toTutor(job.lang ? { kind: 'learn', topic: job.topic, lang: job.lang } : { kind: 'pick', topic: job.topic });
  if (job.kind === 'explain') return toTutor({ kind: 'drop', then: 'explain' });
  toTutor({ kind: 'screen' });   // debug: home.js looks at the screen, like the button
}
// ---------- Hearing "Max" ----------
// wake.js sends bursts of sound; local Whisper (base.en, ~80 MB, downloaded once into userData/models) checks
// whether they start with "Max". Nothing leaves the PC. "Max, teach me Rust" goes straight in; "Max" alone opens
// the panel listening (ElevenLabs) for what comes next. Ported from the full app (app/main.js 'wake').
const WHISPER_THREADS = Math.max(2, Math.min(4, Math.floor(require('os').cpus().length / 4)));
let asrP = null;
function asr() {
  asrP ||= import('@huggingface/transformers').then(({ pipeline, env }) => {
    env.cacheDir = path.join(app.getPath('userData'), 'models');
    return pipeline('automatic-speech-recognition', 'onnx-community/whisper-base.en',
      { dtype: 'q8', session_options: { intraOpNumThreads: WHISPER_THREADS, interOpNumThreads: 1, enableCpuMemArena: false } });
  });
  asrP.catch(() => { asrP = null; });   // offline on the first run, say: try again on the next burst
  return asrP;
}
// The name as Whisper tends to hear it: "Matt, open…", "Mac, next".
const NAME = "(?:max|max's|matt|mat|mac|macs|mac's|mack|maks|mags|mox|marks|mats)";
const WAKE = new RegExp(`^\\W*(?:(?:hey|hi|ok|okay|yo)\\W+)?${NAME}\\b\\W*(.*)$`, 'i');
const NAME_ANYWHERE = new RegExp(`\\b${NAME}\\b`, 'i');
// sliding: a 2 s window cut from continuous sound, where "Max" can sit anywhere; a quiet-room burst must start with it.
ipcMain.handle('wake', async (_e, buffer, sliding) => {
  const audio = new Float32Array(buffer);
  if (!prefs.wake || audio.length < 16000 * 0.3) return;
  const whisper = await asr();
  const head = String((await whisper(audio.slice(0, 16000 * 2), { max_new_tokens: sliding ? 12 : 4 }))?.text || '').trim();
  if (!(sliding ? NAME_ANYWHERE : WAKE).test(head)) return;
  const all = !sliding && audio.length > 16000 * 1.8
    ? String((await whisper(audio, { no_repeat_ngram_size: 3, max_new_tokens: 160 }))?.text || '').trim() : '';
  const rest = (WAKE.exec(all)?.[1] || '').trim();
  setMode('panel');
  if (rest.split(/\s+/).length >= 2) win.webContents.send('wakeWords', rest);
  else win.webContents.send('listen');
});

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
// The hand is about half as wide as the chibi, with just the cuff and a bit of sleeve showing.
const HIDE = { width: 48, height: 46 }, PET = { width: 120, height: 130 }, PANEL = { width: 440, height: 640 };
const HAND_FOR = 2 * 60 * 1000;
let win = null, settings = null, tray = null, mode = 'hide';
let prefs = { onTop: true, theme: 'system', call: 'Control+Alt+M', talk: 'Control+Alt+T', wake: true, level: 'beginner' };   // theme: system | light (Paper) | dark (Frost)

let saveTimer = null;
function savePrefs() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFileSync(PREFS(), JSON.stringify(prefs)), 400);
}
// Where the window goes for its size, anchored at the saved bottom-right corner and kept on screen.
// ponytail: always grows up-left, so near the left/top edge the clamp nudges Max over; flip sides if that bothers.
function boundsFor(size) {
  const area = screen.getPrimaryDisplay().workArea;
  const right = prefs.right ?? area.x + area.width - 24, bottom = area.y + area.height;   // always on the taskbar
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
// Dragging slides him along the taskbar; he never leaves it.
ipcMain.on('drag', (_e, dx) => {
  const area = screen.getPrimaryDisplay().workArea, b = win.getBounds();
  win.setPosition(Math.round(Math.max(area.x, Math.min(b.x + dx, area.x + area.width - b.width))), b.y);
  rememberCorner();
});
// Right-clicking Max or the tray icon.
const menu = () => Menu.buildFromTemplate([
  { label: mode === 'panel' ? 'Sit down' : 'Open', click: () => setMode(mode === 'panel' ? 'pet' : 'panel') },
  { label: 'Hide', enabled: mode !== 'hide', click: () => setMode('hide') },
  { label: 'Settings', click: openSettings },
  { type: 'separator' },
  { label: 'Quit Max Code', click: () => app.quit() },
]);
ipcMain.on('petMenu', () => menu().popup({ window: win }));
ipcMain.on('openSettings', openSettings);
ipcMain.on('fitSettings', (_e, h) => settings && !settings.isDestroyed() && settings.setContentSize(340, Math.min(Math.ceil(h), screen.getPrimaryDisplay().workArea.height - 60)));
// With the panel open the window is a see-through rectangle bigger than the panel and Max: over its empty parts, clicks
// go to whatever is behind it. Checked from the mouse position (the page's forwarded mouse moves aren't reliable on
// Windows); the panel sits 10 px in from the top and sides and ends 134 px up (pet.css), Max is the bottom-right 120x130.
let through = false;
setInterval(() => {
  if (!win || win.isDestroyed()) return;
  let want = false;
  if (mode === 'panel') {
    const p = screen.getCursorScreenPoint(), b = win.getBounds(), x = p.x - b.x, y = p.y - b.y;
    const panel = x >= 10 && x <= b.width - 10 && y >= 10 && y <= b.height - 134;
    const max = x >= b.width - 120 && y >= b.height - 130;
    want = !panel && !max;
  }
  if (want !== through) { through = want; win.setIgnoreMouseEvents(want); }
}, 100);
ipcMain.on('quit', () => app.quit());

// ---------- Settings ----------
ipcMain.handle('prefs', () => ({ bound, wake: prefs.wake, talk: prefs.talk, level: prefs.level, call: prefs.call, theme: prefs.theme, onTop: prefs.onTop, login: app.getLoginItemSettings().openAtLogin }));
ipcMain.handle('setPref', (_e, name, on) => {
  if (name === 'onTop') { prefs.onTop = !!on; win.setAlwaysOnTop(prefs.onTop); savePrefs(); }
  if (name === 'login') app.setLoginItemSettings({ openAtLogin: !!on });
  if (name === 'theme' && ['system', 'light', 'dark'].includes(on)) { prefs.theme = on; nativeTheme.themeSource = on; savePrefs(); }
  if (name === 'level' && LEVELS[on]) { prefs.level = on; savePrefs(); }
  if (name === 'wake') { prefs.wake = !!on; savePrefs(); win.webContents.send('wakePref', prefs.wake); }
  if (name === 'call' || name === 'talk') {
    const other = name === 'call' ? prefs.talk : prefs.call;
    if (String(on) === other) throw new Error("That's already your other shortcut.");
    const keys = { call: prefs.call, talk: prefs.talk, [name]: String(on) };
    if (!bindKeys(keys)) { bindKeys(); throw new Error('Windows or another app already uses that one. Try another.'); }
    prefs[name] = String(on); savePrefs();
  }
});
ipcMain.handle('courses', () => readJSON(COURSES()));
// The two shortcuts (Settings can change both): Call Max opens his panel (pressed again with it open, he listens);
// Talk to Max opens it listening. false if one is taken or isn't a valid accelerator.
const bound = { call: false, talk: false };   // which ones Windows actually gave us (Settings says if one is taken)
function bindKeys({ call, talk } = prefs) {
  globalShortcut.unregisterAll();
  const bind = (acc, fn) => { if (!acc) return true; try { return globalShortcut.register(acc, fn); } catch { return false; } };
  bound.call = bind(call, () => (mode === 'panel' ? win.webContents.send('listen') : setMode('panel')));
  bound.talk = bind(talk, () => { setMode('panel'); win.webContents.send('listen'); });
  return bound.call && bound.talk;
}

// ---------- Debugging what's on screen ----------
// Any app (an editor, a browser, a slide, a PDF, a photo of code): the screen under the mouse is captured with Max
// hidden, NVIDIA's vision model finds the code, an overlay points at it and asks "Is this it?" (or lets you drag a
// box around it), then the model reads that part out at full resolution. If the same code is open in an editor,
// that file is used instead, so fixes can be saved to it.
// Windows PowerShell for the two things Electron can't do reliably here: copy one exact screen, and OCR (below).
function powershell(script, env, ms = 20000) {
  return new Promise((resolve, reject) => require('child_process').execFile('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
    { env: { ...process.env, ...env }, timeout: ms, windowsHide: true, maxBuffer: 8e6 }, (err, stdout) => (err ? reject(err) : resolve(stdout))));
}
// The screen under the mouse, copied by its exact rectangle in real pixels. (Electron's desktopCapturer doesn't always
// say which picture is which screen; with two monitors it handed over the other one.) DPI-aware, so a scaled display
// is copied at full size. Max's own see-through windows aren't in the copy; Settings is made invisible for it.
const SHOT = `Add-Type -AssemblyName System.Drawing
Add-Type -Name Dpi -Namespace MaxCode -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
$null = [MaxCode.Dpi]::SetProcessDPIAware()
$r = $env:MAXCODE_RECT -split ','
$b = New-Object System.Drawing.Bitmap ([int]$r[2]), ([int]$r[3]), ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.CopyFromScreen([int]$r[0], [int]$r[1], 0, 0, $b.Size)
$b.Save($env:MAXCODE_SHOT, [System.Drawing.Imaging.ImageFormat]::Png)`;
// The display under the mouse, or `display`; Max's windows hidden for it unless hide is false (the note following your
// code: those windows are left out of what it reads instead, so nothing flickers).
async function capture({ hide = true, display } = {}) {
  // Tests: MAXCODE_TEST_SCREEN=image.png stands in for the screen (no real screen is captured).
  if (process.env.MAXCODE_TEST_SCREEN) return { display: screen.getPrimaryDisplay(), img: nativeImage.createFromPath(process.env.MAXCODE_TEST_SCREEN) };
  display ||= screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const px = screen.dipToScreenRect(null, display.bounds);
  const file = path.join(app.getPath('temp'), `maxcode-shot-${process.pid}${hide ? '' : '-t'}.png`);
  const others = hide ? [win, settings, callout].filter((w) => w && !w.isDestroyed()) : [];
  others.forEach((w) => w.setOpacity(0));
  if (hide) await new Promise((r) => setTimeout(r, 180));
  try {
    await powershell(SHOT, { MAXCODE_RECT: [px.x, px.y, px.width, px.height].join(','), MAXCODE_SHOT: file });
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) throw new Error('empty');
    return { display, img };
  } catch { throw new Error("I couldn't capture the screen."); } finally {
    others.forEach((w) => !w.isDestroyed() && w.setOpacity(1));
    fs.rm(file, () => {});
  }
}
// The model takes inline images up to ~180 KB: smaller JPEGs until it fits.
function shrink(img, maxW) {
  for (let w = Math.min(maxW, img.getSize().width); ; w = Math.round(w * 0.8)) {
    const im = img.getSize().width > w ? img.resize({ width: w, quality: 'best' }) : img;
    for (const q of [85, 70, 55]) {
      const b = im.toJPEG(q);
      if (b.length < 175000 || w < 400) return { b64: b.toString('base64'), size: im.getSize() };
    }
  }
}
function json(text) {
  const m = /\{[\s\S]*\}/.exec(String(text).replace(/```(?:json)?/g, ''));
  try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
}
async function look(prompt, img, maxW, maxTokens) {
  const { b64, size } = shrink(img, maxW);
  const text = await ask({ model: VL_MODEL, temperature: 0, max_tokens: maxTokens, chat_template_kwargs: { enable_thinking: false },
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt(size) }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] });
  return { out: json(text), size };
}
// The overlay over that screen: points at box ([x0, y0, x1, y1] in its own coordinates) and asks, or with no box
// lets you drag one. Resolves { rect } or null (cancelled).
function pointAt(display, box) {
  const o = new BrowserWindow({
    ...display.bounds, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  o.setAlwaysOnTop(true, 'screen-saver');
  o.loadFile(path.join(__dirname, 'ui', 'point.html'), { query: { box: box ? box.join(',') : '' } });
  return new Promise((resolve) => {
    const answer = (e, a) => { if (e.sender === o.webContents) { resolve(a); o.close(); } };
    ipcMain.on('pointAnswer', answer);
    o.on('closed', () => { ipcMain.removeListener('pointAnswer', answer); resolve(null); });
  });
}
const EXT = { python: '.py', javascript: '.js', typescript: '.ts', java: '.java', c: '.c', 'c++': '.cpp', 'c#': '.cs', go: '.go', rust: '.rs',
  html: '.html', css: '.css', sql: '.sql', php: '.php', ruby: '.rb', kotlin: '.kt', swift: '.swift', bash: '.sh', powershell: '.ps1' };
// Where those lines are on screen. The vision model reads code well but is poor at saying where it is, so Windows' own
// text recognition (Windows.Media.Ocr, built into Windows 10/11, runs on the PC) finds the lines it read, and the box
// goes round them. [x0, y0, x1, y1] in the display's coordinates, or null.
const OCR = `Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(); $t.Result }
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$out = foreach ($tile in ($env:MAXCODE_OCR -split ';')) {
  $p, $ox, $oy = $tile -split '\\|'
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($p)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $stream.Dispose()
  foreach ($line in $ocr.Lines) {
    $r = @($line.Words | ForEach-Object { $_.BoundingRect })
    [pscustomobject]@{ t = $line.Text
      x0 = [int]$ox + ($r | ForEach-Object { $_.X } | Measure-Object -Minimum).Minimum; y0 = [int]$oy + ($r | ForEach-Object { $_.Y } | Measure-Object -Minimum).Minimum
      x1 = [int]$ox + ($r | ForEach-Object { $_.X + $_.Width } | Measure-Object -Maximum).Maximum; y1 = [int]$oy + ($r | ForEach-Object { $_.Y + $_.Height } | Measure-Object -Maximum).Maximum }
  }
}
# ASCII only: the console mangles other letters (a "·" on screen came out as a control character and broke the JSON).
[regex]::Replace((ConvertTo-Json -Compress @($out)), '[^ -~]', { param($m) '\\u{0:x4}' -f [int][char]$m.Value })`;
// The OCR engine reads nothing at all on some full screens (a busy wallpaper behind the code, on Nihal's PC), yet reads
// the same screen fine in parts. So it reads four overlapping quarters at full sharpness, in one PowerShell, and the
// lines are put back in screen positions; a line read twice in an overlap is kept once.
async function ocr(img) {
  const { width: W, height: H } = img.getSize(), tw = Math.min(W, Math.ceil(W / 2) + 120), th = Math.min(H, Math.ceil(H / 2) + 120);
  const tiles = [[0, 0], [W - tw, 0], [0, H - th], [W - tw, H - th]].map(([x, y], i) => {
    const file = path.join(app.getPath('temp'), `maxcode-ocr-${process.pid}-${i}.png`);
    fs.writeFileSync(file, img.crop({ x, y, width: tw, height: th }).toPNG());
    return { file, x, y };
  });
  try {
    const all = [].concat(JSON.parse(await powershell(OCR, { MAXCODE_OCR: tiles.map((t) => `${t.file}|${t.x}|${t.y}`).join(';') }) || '[]'))
      .filter((o) => o && o.t);
    return all.filter((o, i) => !all.slice(0, i).some((p) => p.t === o.t && Math.abs(p.y0 - o.y0) < 6 && Math.abs(p.x0 - o.x0) < 6));
  } catch { return []; } finally { tiles.forEach((t) => fs.rm(t.file, () => {})); }
}
// How alike two lines are (0-1): shared pairs of letters, ignoring spaces and case (OCR drops and adds those).
function alike(a, b) {
  const pairs = (s) => { s = s.toLowerCase().replace(/\s+/g, ''); const m = new Map(); for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1); return [m, Math.max(1, s.length - 1)]; };
  const [pa, na] = pairs(a), [pb, nb] = pairs(b);
  let both = 0;
  for (const [k, n] of pa) both += Math.min(n, pb.get(k) || 0);
  return (2 * both) / (na + nb);
}
// Which OCR lines are the code's lines: the biggest run of matches that sit together (a stray match elsewhere, like
// the file's name in a tab title matching its #include line, is a run of its own), with the spacing between lines so
// the ones OCR missed (short ones like "}", or ones with squiggles under them) can be placed too. In image pixels.
function matchLines(seen, code) {
  const all = code.split('\n');
  const lines = all.map((l, i) => ({ t: l.trim(), i })).filter((l) => l.t.length >= 3);
  const hits = [];   // OCR lines matched to the code's lines, with i: which line of the code
  for (const l of lines) {
    let best = null, score = 0.55;
    for (const o of seen) { const sc = alike(l.t, String(o.t)); if (sc > score) { score = sc; best = o; } }
    if (best) hits.push({ ...best, i: l.i });
  }
  if (!hits.length || (hits.length < 2 && lines.length > 1)) return null;
  hits.sort((a, b) => a.y0 - b.y0);
  const lineH = hits.map((h) => h.y1 - h.y0).sort((a, b) => a - b)[Math.floor(hits.length / 2)] || 20;
  const runs = [[hits[0]]];
  for (const h of hits.slice(1)) {
    const run = runs[runs.length - 1];
    if (h.y0 - run[run.length - 1].y1 > 5 * lineH) runs.push([h]); else run.push(h);
  }
  const block = runs.reduce((x, y) => (y.length > x.length ? y : x)).slice();
  // A stray match close above or below (the tab title "#includestdio.h" sits just above the code) doesn't fit the line
  // spacing of the rest: such ends are dropped, or they'd throw the spacing off and Apply fix would click the tab.
  if (block.length > 2) {
    const stepOf = (a, b) => (b.y0 - a.y0) / (b.i - a.i);
    const steps = block.slice(1).map((h, j) => stepOf(block[j], h)).filter((s) => s > 0 && Number.isFinite(s)).sort((a, b) => a - b);
    const med = steps[Math.floor(steps.length / 2)];
    const fits = (a, b) => { const s = stepOf(a, b); return s > 0 && Math.abs(s - med) <= med * 0.35; };
    while (med && block.length > 2 && !fits(block[0], block[1])) block.shift();
    while (med && block.length > 2 && !fits(block[block.length - 2], block[block.length - 1])) block.pop();
  }
  const top = block[0], bottom = block[block.length - 1];
  const step = bottom.i > top.i ? (bottom.y0 - top.y0) / (bottom.i - top.i) : lineH * 1.35;
  // As wide as the longest line, by the width of the letters OCR found (long lines are often the ones it missed).
  const charW = block.map((h) => (h.x1 - h.x0) / Math.max(1, String(h.t).length)).sort((a, b) => a - b)[Math.floor(block.length / 2)];
  const x0 = Math.min(...block.map((h) => h.x0)), widest = Math.max(...all.map((l) => l.replace(/\t/g, '    ').trimEnd().length));
  const x1 = Math.max(...block.map((h) => h.x1), x0 + (widest + 5) * charW);   // + a few: OCR's letter width runs a bit small
  return { all, block, top, bottom, step, lineH, x0, x1, lineY: (i) => top.y0 + (i - top.i) * step };
}
let screenSeen = null;   // the last screen read: { seen (OCR lines), k (screen points per image pixel), display }
async function findOnScreen(img, code, display) {
  const seen = await ocr(img), k = display.size.width / img.getSize().width;
  screenSeen = { seen, k, display };
  if (process.env.MAXCODE_DEBUG) console.log('[screen] display', display.id, display.bounds, 'image', img.getSize(), 'OCR lines', seen.length, JSON.stringify(seen.slice(0, 40).map((o) => o.t)));
  const m = matchLines(seen, code);
  if (!m) return null;
  const first = m.all.findIndex((l) => l.trim()), last = m.all.length - 1 - [...m.all].reverse().findIndex((l) => l.trim()), pad = 18;
  const box = [m.x0, Math.min(m.top.y0, m.lineY(first)), m.x1, Math.max(m.bottom.y1, m.lineY(last) + m.lineH)].map((v) => v * k);
  return [Math.max(0, box[0] - pad), Math.max(0, box[1] - pad), Math.min(display.size.width, box[2] + pad), Math.min(display.size.height, box[3] + pad)].map(Math.round);
}

// ---------- Explaining and fixing the code where it is on screen ----------
// After a screen read, each line of the code has a place on screen (screenMap). Max's notes show in a small callout
// next to the line, with an arrow at it (ui/callout.*). While it's up, the screen is read again every 1.5 s so the note
// follows the code (scrolled, window moved, lines added by a fix) and hides while the code is out of sight. "Apply fix"
// clicks into the code, wherever it is now, and makes the fix in the editor's copied text, so it works in any editor.
// Ctrl+Z in the editor undoes it.
let screenMap = null, callout = null, note = null, codeNow = '', typing = false, tracking = false;
// Line i (0-based) of the screen code: its middle and the code block's left and right, in screen points.
function lineOnScreen(i) {
  const { m, k, display } = screenMap;
  return { y: display.bounds.y + (m.lineY(i) + m.lineH / 2) * k, x0: display.bounds.x + m.x0 * k, x1: display.bounds.x + m.x1 * k, display };
}
const CALLOUT = { width: 380, height: 230, arrowY: 34 };
ipcMain.on('screenNote', (_e, n) => {
  note = n;
  if (n.code) codeNow = n.code;   // the code as it is now (after fixes), to find it on screen again
  placeNote();
});
function placeNote() {
  if (!screenMap || !note) return;
  const at = lineOnScreen(note.line - 1), area = at.display.workArea;
  const right = at.x1 + 12 + CALLOUT.width <= area.x + area.width;   // beside the code on the right, else on its left
  const x = right ? at.x1 + 12 : Math.max(area.x, at.x0 - 12 - CALLOUT.width);
  const y = Math.max(area.y, Math.min(at.y - CALLOUT.arrowY, area.y + area.height - CALLOUT.height));
  const send = () => callout.webContents.send('note', { ...note, side: right ? 'left' : 'right', arrowY: at.y - y });
  if (callout && !callout.isDestroyed()) {
    const b = callout.getBounds();
    if (Math.abs(b.x - x) > 2 || Math.abs(b.y - y) > 2) callout.setBounds({ x: Math.round(x), y: Math.round(y), width: CALLOUT.width, height: CALLOUT.height });
    if (!callout.isVisible()) callout.showInactive();
    return send();
  }
  callout = new BrowserWindow({
    x: Math.round(x), y: Math.round(y), width: CALLOUT.width, height: CALLOUT.height, frame: false, transparent: true, resizable: false,
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  callout.setAlwaysOnTop(true, 'screen-saver');
  callout.loadFile(path.join(__dirname, 'ui', 'callout.html'));
  callout.webContents.once('did-finish-load', send);
}
// The code found on screen again: OCR lines on Max's own windows (the panel may show the same code) don't count.
function findCode(seen, display, k, code) {
  const ours = [win, settings, callout].filter((w) => w && !w.isDestroyed() && w.isVisible() && w.getOpacity() > 0).map((w) => w.getBounds());
  const mine = (o) => ours.some((b) => { const x = display.bounds.x + ((o.x0 + o.x1) / 2) * k, y = display.bounds.y + ((o.y0 + o.y1) / 2) * k; return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height; });
  return matchLines(seen.filter((o) => !mine(o)), code);
}
async function track() {
  if (tracking || typing || !callout || callout.isDestroyed() || !screenMap || !codeNow) return;
  tracking = true;
  try {
    const { display, img } = await capture({ hide: false, display: screenMap.display });
    const k = display.size.width / img.getSize().width, m = findCode(await ocr(img), display, k, codeNow);
    if (typing || !callout || callout.isDestroyed()) return;
    if (!m) { callout.hide(); return; }   // scrolled away, another tab, minimised: back when the code is
    screenMap = { m, k, display };
    placeNote();
  } catch {} finally { tracking = false; }
}
setInterval(track, 1500);
ipcMain.on('hideNotes', () => { if (callout && !callout.isDestroyed()) callout.close(); callout = null; });
// The callout's buttons go to the tutor page as commands (tutor.js onTutor).
ipcMain.on('calloutAct', (_e, cmd) => {
  if (cmd === 'close') { if (callout && !callout.isDestroyed()) callout.close(); callout = null; return; }
  win.webContents.send('tutor', { kind: 'cmd', cmd });
});
// Fixing in the editor: click into the code, copy the whole document (Ctrl+A, Ctrl+C), make the fix in that real text
// (shared/tutor.js fixInText: exact indentation and line endings kept), paste it all back (Ctrl+A, Ctrl+V). Works in any
// editor, and one Ctrl+Z there undoes it. Keys are sent as real key presses (keybd_event): SendKeys' Shift+End became
// numpad End with Num Lock on, so nothing was selected. MAXCODE_EXPECT_WINDOW (tests) refuses any other window.
const KEYS = `Add-Type -Name Input -Namespace MaxCode -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, System.UIntPtr e); [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, System.UIntPtr e); [DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow(); [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(System.IntPtr h, System.Text.StringBuilder s, int n);'
$null = [MaxCode.Input]::SetProcessDPIAware()
$at = $env:MAXCODE_AT -split ','
function Press($vk) { [MaxCode.Input]::keybd_event($vk, 0, 0, [UIntPtr]::Zero); [MaxCode.Input]::keybd_event($vk, 0, 2, [UIntPtr]::Zero) }
function Ctrl($vk) { [MaxCode.Input]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero); Press $vk; [MaxCode.Input]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero); Start-Sleep -Milliseconds 120 }
if ($env:MAXCODE_STEP -ne 'paste') {
  $null = [MaxCode.Input]::SetCursorPos([int]$at[0], [int]$at[1])
  [MaxCode.Input]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero); [MaxCode.Input]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 250
}
if ($env:MAXCODE_EXPECT_WINDOW) {
  $t = New-Object System.Text.StringBuilder 256; $null = [MaxCode.Input]::GetWindowText([MaxCode.Input]::GetForegroundWindow(), $t, 256)
  if (-not $t.ToString().Contains($env:MAXCODE_EXPECT_WINDOW)) { exit 3 }
}
if ($env:MAXCODE_STEP -eq 'copy') { Ctrl 0x41; Ctrl 0x43; Start-Sleep -Milliseconds 200 }
if ($env:MAXCODE_STEP -eq 'paste') { Ctrl 0x41; Ctrl 0x56; Start-Sleep -Milliseconds 250 }
$null = [MaxCode.Input]::SetCursorPos([int]$at[2], [int]$at[3])`;
// Fix all sends `fixes` (each { line, find, replace }): one copy, every fix made in the text, one paste. Resolves to which
// of them landed (true/false each).
ipcMain.handle('typeFix', async (_e, { line, find, replace, fixes, code }) => {
  const list = fixes || [{ line, find, replace }];
  typing = true;
  try { return await typeFix(list, code || codeNow || list[0].find); } finally { typing = false; setTimeout(track, 400); }
});
async function typeFix(list, code) {
  // Where to click: anywhere in the code puts the caret in that editor, and the fix itself is made in the copied text,
  // so the exact line doesn't matter (lines move as fixes add some, you scroll, the window moves).
  const { display, img } = await capture();
  const k = display.size.width / img.getSize().width, m = findCode(await ocr(img), display, k, code);
  if (!m) throw new Error("I can't see your code on screen right now. Bring it back into view, then press Apply fix again.");
  screenMap = { m, k, display };
  const mid = m.block[Math.floor(m.block.length / 2)], x = mid.x0 + 2, y = (mid.y0 + mid.y1) / 2;   // a line in the middle: surely the code
  const point = (px, py) => screen.dipToScreenPoint({ x: Math.round(display.bounds.x + px * k), y: Math.round(display.bounds.y + py * k) });
  const at = point(x, y), back = screen.dipToScreenPoint(screen.getCursorScreenPoint());
  const where = { MAXCODE_AT: [at.x, at.y, back.x, back.y].join(',') }, old = clipboard.readText();
  clipboard.writeText('');   // so a copy that didn't happen can't be mistaken for the document
  try {
    await powershell(KEYS, { ...where, MAXCODE_STEP: 'copy' });
    let doc = clipboard.readText();
    const landed = list.map((f) => { const t = tutorCode.fixInText(doc, f.find, f.replace, f.line); if (t) doc = t; return !!t; });
    if (!landed.some(Boolean)) {
      await powershell(KEYS, { ...where, MAXCODE_STEP: 'click' });   // just the click: drops the select-all, changes nothing
      throw new Error("I couldn't find that code in your editor, so I didn't change anything.");
    }
    clipboard.writeText(doc);
    await powershell(KEYS, { ...where, MAXCODE_STEP: 'paste' });
    return landed;
  } finally {
    setTimeout(() => clipboard.writeText(old), 1500);   // your clipboard, as it was
  }
}

ipcMain.handle('screenCode', async () => {
  const { display, img } = await capture();
  const read = await look(() => 'Copy out the source code you can see in this screenshot (in a code editor, terminal, browser, slide, document, chat or a photo, anywhere), exactly as written, line by line, without line numbers. If there are several pieces of code, take the biggest. Reply with only JSON: {"lang":"the programming language, e.g. C, Python, Java","code":"the code"}. If there is no code on screen, reply {"code":""}.',
    img, 1600, 4000);   // a failure here (a daily limit, no internet) is the answer: say it, don't pretend there's no code
  const box = read?.out?.code ? await findOnScreen(img, String(read.out.code), display).catch(() => null) : null;
  const found = { out: { lang: read?.out?.lang } };
  if (process.env.MAXCODE_TEST_SCREEN || process.env.MAXCODE_DEBUG) console.log('[screen] first read:', JSON.stringify(read?.out), '| located:', box);
  if (box) win.webContents.send('say', 'Is this the code?');
  const answer = await pointAt(display, box);
  if (!answer) return null;
  const { width: iw, height: ih } = img.getSize(), f = iw / display.size.width, pad = 8;
  const [x0, y0, x1, y1] = answer.rect;
  // Read with room to spare: OCR boxes stop short of long lines, and a dragged box is rarely exact.
  const cx = Math.max(0, Math.round((x0 - 30) * f)), cy = Math.max(0, Math.round((y0 - 24) * f));
  const cw = Math.min(iw - cx, Math.round((x1 - x0 + 30 + Math.max(160, (x1 - x0) * 0.6)) * f));
  const ch = Math.min(ih - cy, Math.round((y1 - y0 + 48) * f));
  const crop = img.crop({ x: cx, y: cy, width: cw, height: ch });
  const { out } = await look(() => 'Transcribe the source code in this image exactly as written: every line, the same indentation, no line numbers, nothing fixed or added. Reply with only JSON: {"lang":"the programming language, e.g. C, Python, Java","code":"the code"}. If there is no code, reply {"code":""}.',
    crop, 1800, 8000).catch(() => ({ out: null }));
  if (process.env.MAXCODE_TEST_SCREEN || process.env.MAXCODE_DEBUG) console.log('[screen] first read:', JSON.stringify(read?.out), '| box:', box, '| crop:', crop.getSize(), '| re-read:', JSON.stringify(out));
  const code = String(out?.code || (answer.rect === box || String(answer.rect) === String(box) ? read?.out?.code : '') || '').replace(/\r/g, '');
  if (!code.trim()) throw new Error("I couldn't read any code there. Try dragging a box around it.");
  const lang = String(out?.lang || found?.out?.lang || '');
  // Where each line is: from OCR when it matched; otherwise spaced evenly down the box you confirmed (it holds the code),
  // so the notes and fixes always go on your real code, never only into Max's panel.
  const m = screenSeen && matchLines(screenSeen.seen, code);
  codeNow = code;
  if (m) screenMap = { m, k: screenSeen.k, display: screenSeen.display };
  else {
    const step = (y1 - y0) / Math.max(1, code.replace(/\n+$/, '').split('\n').length);
    screenMap = { m: { x0, x1, lineH: step, lineY: (i) => y0 + i * step }, k: 1, display };
  }
  return { files: [{ name: `on screen${EXT[lang.toLowerCase()] || ''}`, code }], onScreen: true };
});

function openSettings() {
  if (settings && !settings.isDestroyed()) return settings.focus();
  settings = new BrowserWindow({
    width: 340, height: 300, useContentSize: true, resizable: false, maximizable: false, minimizable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1e28' : '#fbfaf7', title: 'Max Code settings',
    icon: path.join(__dirname, 'assets', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  settings.setMenu(null);
  settings.loadFile(path.join(__dirname, 'ui', 'settings.html'));
  // Exactly as tall as what's in it.
  settings.webContents.on('did-finish-load', async () => {
    const h = await settings.webContents.executeJavaScript("document.querySelector('.homebox').offsetHeight + 30");
    settings.setContentSize(340, Math.min(Math.ceil(h), screen.getPrimaryDisplay().workArea.height - 60));
  });
  settings.on('closed', () => { if (win && !win.isDestroyed()) win.webContents.send('keyChanged'); });
}

async function open() {
  await Promise.all([loadKey(KEY_FILE()), loadKey(VOICE_KEY_FILE()), loadKey(PLUS_KEY_FILE())]);
  prefs = { ...prefs, ...readJSON(PREFS()) };
  nativeTheme.themeSource = prefs.theme;
  win = new BrowserWindow({
    ...hideBounds(), frame: false, transparent: true, resizable: false, maximizable: false, skipTaskbar: true,
    hasShadow: false, alwaysOnTop: prefs.onTop, title: 'Max Code', icon: path.join(__dirname, 'assets', 'icon.png'), show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    // First run: Max sits on screen so you meet him (nothing to set up: the server answers until you add keys).
    if (!prefs.met) { prefs.met = true; savePrefs(); setMode('pet'); } else handTimer = setTimeout(() => win.hide(), HAND_FOR);
  });
  bindKeys();
  // The tray icon: a click opens (or closes) his panel, right-click has the same menu as Max.
  tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
  tray.setToolTip('Max Code');
  tray.on('click', () => setMode(mode === 'panel' ? 'pet' : 'panel'));
  tray.on('right-click', () => tray.popUpContextMenu(menu()));
  if (prefs.wake) setTimeout(() => asr().catch(() => {}), 5000);   // warm Whisper up (downloads it the first time)
}
// Links open in the browser, never inside the app (both windows).
app.on('web-contents-created', (_e, wc) => wc.setWindowOpenHandler(({ url }) => {
  if (/^https:\/\//.test(url)) shell.openExternal(url);
  return { action: 'deny' };
}));

// Test runs get their own settings folder and run beside the installed Max instead of closing it.
if (process.env.MAXCODE_TEST_SCREEN) app.setPath('userData', `${app.getPath('userData')}-test`);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) setMode('panel'); });
  app.whenReady().then(open);
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
