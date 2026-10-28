// Max Code's settings window: the NVIDIA key and the options. Kept small; main.js sizes it to fit.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');

  // ---------- The key ----------
  async function keyState() {
    const has = await window.max.hasKey();
    $('#keySteps').hidden = has;
    $('#keyMsg').textContent = has ? 'Saved, encrypted on this PC. Paste a new one to replace it.' : 'Stays on this PC, encrypted; only sent to NVIDIA.';
    if (!has) $('#key').focus();
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

  // ---------- The call shortcut: click the box, press the keys ----------
  const pretty = (acc) => acc.replace('Control', 'Ctrl').replace('Super', 'Win').replace(/\+/g, ' + ');
  let call = '';
  // An Electron accelerator from a key press, or '' while only modifiers are held.
  function accelerator(e) {
    const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : /^Digit\d$/.test(e.code) ? e.code.slice(5)
      : /^F\d{1,2}$/.test(e.code) ? e.code : e.code === 'Space' ? 'Space' : /^Arrow/.test(e.code) ? e.code.slice(5) : '';
    const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean);
    if (!key || (!mods.length && !/^F\d/.test(key))) return '';   // a bare letter would fire while typing anywhere
    return [...mods, key].join('+');
  }
  const box = $('#call'), callMsg = $('#callMsg');
  box.addEventListener('focus', () => { box.value = 'Press the keys…'; callMsg.className = 'msg'; callMsg.textContent = 'Esc to cancel'; });
  box.addEventListener('blur', () => { box.value = pretty(call); if (!callMsg.classList.contains('bad')) callMsg.textContent = ''; });
  box.addEventListener('keydown', async (e) => {
    e.preventDefault();
    if (e.key === 'Escape') return box.blur();
    const acc = accelerator(e);
    if (!acc) return;
    try {
      await window.max.setPref('call', acc);
      call = acc;
      callMsg.className = 'msg';
      box.blur();
    } catch (err) {
      callMsg.className = 'msg bad';
      callMsg.textContent = clean(err);
      box.blur();
    }
  });

  // ---------- Options ----------
  (async () => {
    const p = await window.max.prefs();
    call = p.call;
    box.value = pretty(call);
    $('#onTop').checked = p.onTop;
    $('#login').checked = p.login;
    $('#theme').value = p.theme;
  })();
  $('#onTop').onchange = (e) => window.max.setPref('onTop', e.target.checked);
  $('#login').onchange = (e) => window.max.setPref('login', e.target.checked);
  $('#theme').onchange = (e) => window.max.setPref('theme', e.target.value);
  $('#quit').onclick = () => window.max.quit();

  keyState();
})();
