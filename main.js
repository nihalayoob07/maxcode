// Max Code: Max's coding tutor and debugger. With no keys it goes through the free Max Code server (server/, on
// Vercel), which holds Nihal's NVIDIA and ElevenLabs keys and gives each install a daily allowance. A user who adds
// their own keys (kept encrypted on this PC with safeStorage) goes straight to NVIDIA / ElevenLabs, with no limits. The tutor (shared/, ui/tutor.*) came from max-assistant.
'use strict';
const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, nativeTheme, net, safeStorage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const tutorCode = require('./shared/tutor');

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const VL_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';   // reads code off the screen
const SERVER = 'https://maxcode-server-weld.vercel.app';
const KEY_FILE = () => path.join(app.getPath('userData'), 'key.bin');
const VOICE_KEY_FILE = () => path.join(app.getPath('userData'), 'voice-key.bin');
const COURSES = () => path.join(app.getPath('userData'), 'courses.json');
const PREFS = () => path.join(app.getPath('userData'), 'prefs.json');
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
// A random id for this install, made on first run: what the server counts the daily allowance against.
let install = '';
function installId() {
  const f = path.join(app.getPath('userData'), 'install-id');
  try { install ||= fs.readFileSync(f, 'utf8').trim(); } catch {}
  if (!install) fs.writeFileSync(f, (install = require('crypto').randomUUID()));
  return install;
}
// The server's own words when it says no (a daily limit, not set up yet).
const serverSays = async (res) => (await res.clone().json().catch(() => null))?.error;

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

// One chat request: to NVIDIA with the user's own key, or through the Max Code server without one. net.fetch goes
// through the PC's proxy settings like a browser would.
const asks = new Map();   // id -> AbortController, so the tutor can cancel a question it replaced
async function ask(body, id, key = readKey()) {
  const ctl = new AbortController();
  if (id) asks.set(id, ctl);
  const timer = setTimeout(() => ctl.abort(), 280000);
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

ipcMain.handle('hasKey', () => !!readKey());
// A new key is tried with a one-word question before it's saved.
ipcMain.handle('setKey', async (_e, key) => {
  key = String(key || '').trim();
  if (!/^nvapi-\S{20,}$/.test(key)) throw new Error('That doesn\'t look like an NVIDIA key. It starts with "nvapi-".');
  await ask({ model: MODEL, messages: [{ role: 'user', content: 'Say OK.' }], max_tokens: 5 }, null, key);
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
  const level = LEVELS[prefs.level] || LEVELS.beginner;
  messages = messages.map((m, i) => (i === 0 && m.role === 'system' ? { ...m, content: `${m.content} ${level}` } : m));
  return ask({ model: MODEL, messages, temperature: 0.3, max_tokens: think ? 16000 : 4000,
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
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Max-Install': installId() }, body: JSON.stringify({ text }),
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
const HIDE = { width: 50, height: 56 }, PET = { width: 120, height: 130 }, PANEL = { width: 440, height: 640 };
const HAND_FOR = 2 * 60 * 1000;
let win = null, settings = null, mode = 'hide';
let prefs = { onTop: true, theme: 'system', call: 'Control+Alt+M', talk: 'Control+Alt+Space', wake: true, level: 'beginner' };   // theme: system | light (Paper) | dark (Frost)

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
ipcMain.handle('prefs', () => ({ wake: prefs.wake, talk: prefs.talk, level: prefs.level, call: prefs.call, theme: prefs.theme, onTop: prefs.onTop, login: app.getLoginItemSettings().openAtLogin }));
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
function bindKeys({ call, talk } = prefs) {
  globalShortcut.unregisterAll();
  const bind = (acc, fn) => { if (!acc) return true; try { return globalShortcut.register(acc, fn); } catch { return false; } };
  return bind(call, () => (mode === 'panel' ? win.webContents.send('listen') : setMode('panel')))
    && bind(talk, () => { setMode('panel'); win.webContents.send('listen'); });
}

// ---------- Debugging what's on screen ----------
// Any app (an editor, a browser, a slide, a PDF, a photo of code): the screen under the mouse is captured with Max
// hidden, NVIDIA's vision model finds the code, an overlay points at it and asks "Is this it?" (or lets you drag a
// box around it), then the model reads that part out at full resolution. If the same code is open in an editor,
// that file is used instead, so fixes can be saved to it.
async function capture() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const others = [win, settings].filter((w) => w && !w.isDestroyed());
  others.forEach((w) => w.setOpacity(0));
  await new Promise((r) => setTimeout(r, 180));
  try {
    const sf = display.scaleFactor;
    const sources = await desktopCapturer.getSources({ types: ['screen'],
      thumbnailSize: { width: Math.round(display.size.width * sf), height: Math.round(display.size.height * sf) } });
    const src = sources.find((s) => s.display_id === String(display.id)) || sources[0];
    if (!src || src.thumbnail.isEmpty()) throw new Error("I couldn't capture the screen.");
    return { display, img: src.thumbnail };
  } finally { others.forEach((w) => !w.isDestroyed() && w.setOpacity(1)); }
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
ipcMain.handle('screenCode', async () => {
  const { display, img } = await capture();
  const W = display.size.width, H = display.size.height;
  const found = await look(({ width, height }) => `This is a ${width}x${height} pixel screenshot. Find the source code on it: in a code editor, terminal, browser, slide, document, chat or a photo, anywhere. If there are several, pick the biggest block of code. Reply with only JSON: {"found":true,"box":[left,top,right,bottom],"lang":"Python"}, the box in pixels of this image, tight around the code itself (not the whole window). If there is no code on screen, reply {"found":false}.`,
    img, 1280, 300).catch(() => null);
  let box = null;
  if (found?.out?.found && Array.isArray(found.out.box) && found.out.box.length === 4) {
    const k = W / found.size.width;
    const [x0, y0, x1, y1] = found.out.box.map((v) => Math.round(Number(v) * k));
    if (x1 - x0 > 30 && y1 - y0 > 15) box = [Math.max(0, x0), Math.max(0, y0), Math.min(W, x1), Math.min(H, y1)];
  }
  if (box) win.webContents.send('say', 'Is this the code?');
  const answer = await pointAt(display, box);
  if (!answer) return null;
  const f = img.getSize().width / W, pad = 8;
  const [x0, y0, x1, y1] = answer.rect;
  const crop = img.crop({ x: Math.max(0, Math.round(x0 * f) - pad), y: Math.max(0, Math.round(y0 * f) - pad),
    width: Math.min(img.getSize().width, Math.round((x1 - x0) * f) + 2 * pad), height: Math.min(img.getSize().height, Math.round((y1 - y0) * f) + 2 * pad) });
  const { out } = await look(() => 'Transcribe the source code in this image exactly as written: every line, the same indentation, no line numbers, nothing fixed or added. Reply with only JSON: {"lang":"Python","code":"the code"}. If there is no code, reply {"code":""}.',
    crop, 1800, 8000);
  const code = String(out?.code || '').replace(/\r/g, '');
  if (!code.trim()) throw new Error("I couldn't read any code there. Try dragging a box around it.");
  const lang = String(out?.lang || found?.out?.lang || '');
  // The same code open in an editor: use that file, so fixes can be saved to it.
  const ed = await tutorCode.editorCode().catch(() => null);
  const line = code.split('\n').map((s) => s.trim()).find((s) => s.length > 10);
  if (ed && line && ed.files[0]?.code.includes(line)) { tutorCode.allow(ed.files); return ed; }
  return { files: [{ name: `on screen${EXT[lang.toLowerCase()] || ''}`, code }] };
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

function open() {
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
  if (prefs.wake) setTimeout(() => asr().catch(() => {}), 5000);   // warm Whisper up (downloads it the first time)
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
