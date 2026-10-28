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
  $('.panes').style.minHeight = `${Math.max(...[...document.querySelectorAll('[data-pane]')].map((p) => p.offsetHeight))}px`;
  tab('general');

  // ---------- The key ----------
  async function keyState() {
    const has = await window.max.hasKey();
    $('#keyMsg').textContent = has ? 'Saved. Paste a new one to replace it.' : 'Needed for Max to answer. Kept encrypted on this PC.';
    if (!has) tab('keys');
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
    $('#voiceMsg').textContent = has ? 'Saved: Max talks in his ElevenLabs voice.' : 'For Max\'s spoken voice.';
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

  // ---------- The shortcuts: click the box, press the keys ----------
  const pretty = (acc) => acc.replace('Control', 'Ctrl').replace('Super', 'Win').replace(/\+/g, ' + ');
  // An Electron accelerator from a key press, or '' while only modifiers are held.
  function accelerator(e) {
    const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : /^Digit\d$/.test(e.code) ? e.code.slice(5)
      : /^F\d{1,2}$/.test(e.code) ? e.code : e.code === 'Space' ? 'Space' : /^Arrow/.test(e.code) ? e.code.slice(5) : '';
    const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean);
    if (!key || (!mods.length && !/^F\d/.test(key))) return '';   // a bare letter would fire while typing anywhere
    return [...mods, key].join('+');
  }
  const keys = {};   // pref -> its accelerator now
  function keyBox(pref) {
    const box = $(`#${pref}`), msg = $(`#${pref}Msg`);
    box.addEventListener('focus', () => { box.value = 'Press the keys…'; msg.className = 'msg'; msg.textContent = 'Esc to cancel'; });
    box.addEventListener('blur', () => { box.value = pretty(keys[pref] || ''); if (!msg.classList.contains('bad')) msg.textContent = ''; });
    box.addEventListener('keydown', async (e) => {
      e.preventDefault();
      if (e.key === 'Escape') return box.blur();
      const acc = accelerator(e);
      if (!acc) return;
      try {
        await window.max.setPref(pref, acc);
        keys[pref] = acc;
        msg.className = 'msg';
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

  keyState();
  voiceState();
})();
