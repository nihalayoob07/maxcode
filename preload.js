'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// The same window.max the tutor page uses in the full app (app/preload.js), minus everything but the tutor.
// No voice in Max Code: speaking does nothing.
contextBridge.exposeInMainWorld('max', {
  onTutor: () => {},
  onStream: () => {},
  onTts: () => {},
  speak: () => Promise.resolve(),
  cancelSpeak: () => {},
  tutorState: () => {},
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
  openKeyPage: () => ipcRenderer.invoke('openKeyPage'),
  intent: (text) => ipcRenderer.invoke('intent', text),
  editorCode: () => ipcRenderer.invoke('editorCode'),
});
