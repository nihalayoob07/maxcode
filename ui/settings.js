// Max Code's settings window: the NVIDIA key and the options. Kept small; main.js sizes it to fit.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');

  // ---------- The tabs: General, Voice, Keys. The window is as tall as the tallest one (main.js), so it never jumps. ----------
  function tab(name) {
    for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === name);
    for (const p of document.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== name;
  }
  for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => tab(b.dataset.tab);
  // As tall as the tallest tab, measured once the key messages have loaded (they change the Keys tab's height).
  function fit() {
    const panes = [...document.querySelectorAll('[data-pane]')], open = panes.find((p) => !p.hidden);
    panes.forEach((p) => { p.hidden = false; });
    $('.panes').style.minHeight = '';
    $('.panes').style.minHeight = `${Math.max(...panes.map((p) => p.offsetHeight))}px`;
    panes.forEach((p) => { p.hidden = p !== open; });
    window.max.fitSettings($('.homebox').offsetHeight + 30);
  }
  tab('general');

  // ---------- The key ----------
  async function keyState() {
    const has = await window.max.hasKey();
    $('#keyMsg').className = has === 'lost' ? 'msg bad' : 'msg';
    $('#keyMsg').textContent = has === true ? 'Saved: no daily limit. Paste a new one to replace it.'
      : has === 'lost' ? "Your saved key couldn't be read (a bug in an older version). Paste it again, please."
      : 'Max works without it, with a daily limit. Your own free key removes it.';
  }
  $('#getKey').onclick = (e) => { e.preventDefault(); window.max.openKeyPage(); };
  async function saveKey() {
    const msg = $('#keyMsg');
    msg.className = 'msg';
    msg.textContent = 'Checking the key with NVIDIA…';
    $('#saveKey').disabled = true;
    try {
      await window.max.setKey($('#key').value);
      $('#key').value = '';
      await keyState();
      msg.textContent = 'Saved. Click Max to start.';
    } catch (e) {
      msg.className = 'msg bad';
      msg.textContent = clean(e);
    } finally { $('#saveKey').disabled = false; }
  }
  $('#saveKey').onclick = saveKey;
  $('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });

  // ---------- The ElevenLabs key (Max's voice and ears) ----------
  async function voiceState() {
    const has = await window.max.hasVoiceKey();
    $('#voiceMsg').className = 'msg';
    $('#voiceMsg').textContent = has === true ? 'Saved: no daily limit on his voice.'
      : has === 'lost' ? "Your saved key couldn't be read (a bug in an older version). Paste it again, please." : 'Your own ElevenLabs account: no daily limit.';
  }
  $('#getVoiceKey').onclick = (e) => { e.preventDefault(); window.max.openKeyPage('voice'); };
  async function saveVoiceKey() {
    const msg = $('#voiceMsg');
    msg.className = 'msg';
    msg.textContent = 'Checking the key with ElevenLabs…';
    $('#saveVoiceKey').disabled = true;
    try {
      await window.max.setVoiceKey($('#voiceKey').value);
      $('#voiceKey').value = '';
      await voiceState();
    } catch (e) {
      msg.className = 'msg bad';
      msg.textContent = clean(e);
    } finally { $('#saveVoiceKey').disabled = false; }
  }
  $('#saveVoiceKey').onclick = saveVoiceKey;
  $('#voiceKey').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveVoiceKey(); });

  // ---------- Max Plus (unlimited voice on the Max Code server) ----------
  async function plusState() {
    const has = await window.max.hasPlusKey();
    $('#plusMsg').className = has === 'lost' ? 'msg bad' : 'msg';
    $('#plusMsg').textContent = has === true ? 'Max Plus is on: his voice has no daily limit.'
      : has === 'lost' ? "Your saved licence couldn't be read. Paste it again, please." : 'Free voice is about a minute a day.';
  }
  $('#buyPlus').onclick = async (e) => {
    e.preventDefault();
    try { await window.max.buyPlus(); } catch (err) { Object.assign($('#plusMsg'), { className: 'msg bad', textContent: clean(err) }); }
  };
  async function savePlusKey() {
    const msg = $('#plusMsg');
    msg.className = 'msg';
    msg.textContent = 'Checking the licence…';
    $('#savePlusKey').disabled = true;
    try {
      await window.max.setPlusKey($('#plusKey').value);
      $('#plusKey').value = '';
      await plusState();
    } catch (err) {
      msg.className = 'msg bad';
      msg.textContent = clean(err);
    } finally { $('#savePlusKey').disabled = false; }
  }
  $('#savePlusKey').onclick = savePlusKey;
  $('#plusKey').addEventListener('keydown', (e) => { if (e.key === 'Enter') savePlusKey(); });

  // ---------- The shortcuts: click the box, press the keys ----------
  const pretty = (acc) => acc.replace('Control', 'Ctrl').replace('Super', 'Win').replace(/\+/g, ' + ');
  // Any key, alone or with Ctrl / Alt / Shift / Win, as an Electron accelerator; '' while only modifiers are held.
  // (Esc cancels; a modifier on its own can't be a shortcut in Windows.)
  const NAMED = { Space: 'Space', Enter: 'Return', NumpadEnter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete',
    Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', CapsLock: 'Capslock', ScrollLock: 'Scrolllock',
    NumLock: 'Numlock', PrintScreen: 'PrintScreen', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', NumpadAdd: 'numadd', NumpadSubtract: 'numsub',
    NumpadMultiply: 'nummult', NumpadDivide: 'numdiv', NumpadDecimal: 'numdec', MediaPlayPause: 'MediaPlayPause',
    MediaTrackNext: 'MediaNextTrack', MediaTrackPrevious: 'MediaPreviousTrack', MediaStop: 'MediaStop',
    AudioVolumeUp: 'VolumeUp', AudioVolumeDown: 'VolumeDown', AudioVolumeMute: 'VolumeMute' };
  function accelerator(e) {
    const c = e.code;
    const key = /^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^Numpad\d$/.test(c) ? `num${c.slice(6)}`
      : /^F\d{1,2}$/.test(c) ? c : /^Arrow/.test(c) ? c.slice(5) : NAMED[c] || '';
    if (!key) return '';
    return [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super', key].filter(Boolean).join('+');
  }

  const keys = {};   // pref -> its accelerator now
  function keyBox(pref) {
    const box = $(`#${pref}`), msg = $(`#${pref}Msg`);
    box.addEventListener('focus', () => { box.value = 'Press the keys…'; msg.className = 'msg'; msg.textContent = 'Esc to cancel'; });
    box.addEventListener('blur', () => { box.value = pretty(keys[pref] || ''); if (msg.textContent === 'Esc to cancel') msg.textContent = ''; });
    box.addEventListener('keydown', async (e) => {
      e.preventDefault();
      if (e.key === 'Escape') return box.blur();
      const acc = accelerator(e);
      if (!acc) return;
      try {
        await window.max.setPref(pref, acc);
        keys[pref] = acc;
        msg.className = 'msg';
        // A lone ordinary key (no Ctrl/Alt/Win) is caught everywhere, typing included: say so.
        msg.textContent = /^([A-Z0-9`=[\];',./\\-]|Space|Return|Tab|Backspace)$/.test(acc) ? `Note: pressing ${pretty(acc)} anywhere will now call Max, even while you type.` : '';
      } catch (err) {
        msg.className = 'msg bad';
        msg.textContent = clean(err);
      }
      box.blur();
    });
  }
  keyBox('call');
  keyBox('talk');

  // ---------- Options ----------
  (async () => {
    const p = await window.max.prefs();
    keys.call = p.call; keys.talk = p.talk;
    $('#call').value = pretty(p.call);
    $('#talk').value = pretty(p.talk);
    for (const k of ['call', 'talk']) if (!p.bound[k]) Object.assign($(`#${k}Msg`), { className: 'msg bad', textContent: 'Another app already uses this shortcut. Click the box to pick another.' });
    $('#wake').checked = p.wake;
    $('#onTop').checked = p.onTop;
    $('#login').checked = p.login;
    $('#theme').value = p.theme;
    $('#level').value = p.level;
  })();
  $('#onTop').onchange = (e) => window.max.setPref('onTop', e.target.checked);
  $('#login').onchange = (e) => window.max.setPref('login', e.target.checked);
  $('#theme').onchange = (e) => window.max.setPref('theme', e.target.value);
  $('#level').onchange = (e) => window.max.setPref('level', e.target.value);
  $('#wake').onchange = (e) => window.max.setPref('wake', e.target.checked);
  $('#quit').onclick = () => window.max.quit();

  Promise.all([keyState(), voiceState(), plusState()]).then(fit);
})();
