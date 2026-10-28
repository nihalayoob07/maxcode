'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// The same window.max the tutor page uses in the full app (app/preload.js), minus everything but the tutor.
// The voice is ElevenLabs with the user's own key (main.js).
contextBridge.exposeInMainWorld('max', {
  onTutor: (fn) => ipcRenderer.on('tutor', (_e, job) => fn(job)),
  onStream: () => {},
  onTts: (fn) => ipcRenderer.on('tts', (_e, d) => fn(d)),
  speak: (id, text) => ipcRenderer.invoke('speak', id, text),
  cancelSpeak: (id) => ipcRenderer.send('cancelSpeak', id),
  tutorState: (w) => ipcRenderer.send('tutorState', w),
  cancelChat: (id) => ipcRenderer.send('chat-cancel', id),
  tutorAsk: (id, messages, think) => ipcRenderer.invoke('tutorAsk', id, messages, !!think),
  course: (lang, data) => ipcRenderer.invoke('course', lang, data),
  tutorSave: (fix) => ipcRenderer.invoke('tutorSave', fix),
  tutorRead: (p) => ipcRenderer.invoke('tutorRead', p),
  tutorWin: (what) => ipcRenderer.invoke('tutorWin', what),
  filePath: (file) => webUtils.getPathForFile(file),
  // Max Code only
  hasKey: () => ipcRenderer.invoke('hasKey'),
  setKey: (key) => ipcRenderer.invoke('setKey', key),
  openKeyPage: (which) => ipcRenderer.invoke('openKeyPage', which),
  hasVoiceKey: () => ipcRenderer.invoke('hasVoiceKey'),
  setVoiceKey: (key) => ipcRenderer.invoke('setVoiceKey', key),
  transcribe: (audio) => ipcRenderer.invoke('transcribe', audio),
  heard: (text, onScreen) => ipcRenderer.invoke('heard', text, onScreen),
  onListen: (fn) => ipcRenderer.on('listen', () => fn()),
  intent: (text) => ipcRenderer.invoke('intent', text),
  editorCode: () => ipcRenderer.invoke('editorCode'),
  // The chibi and the settings window
  mode: (m) => ipcRenderer.send('mode', m),
  onMode: (fn) => ipcRenderer.on('mode', (_e, m) => fn(m)),
  drag: (dx, dy) => ipcRenderer.send('drag', dx, dy),
  petMenu: () => ipcRenderer.send('petMenu'),
  openSettings: () => ipcRenderer.send('openSettings'),
  onKeyChanged: (fn) => ipcRenderer.on('keyChanged', () => fn()),
  prefs: () => ipcRenderer.invoke('prefs'),
  setPref: (name, on) => ipcRenderer.invoke('setPref', name, on),
  courses: () => ipcRenderer.invoke('courses'),
  quit: () => ipcRenderer.send('quit'),
});
