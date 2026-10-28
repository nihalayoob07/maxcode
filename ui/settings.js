// Max Code's settings window: the NVIDIA key, courses with progress, and the options.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const COURSES = ['C', 'C++', 'Python', 'Java', 'JavaScript', 'C#', 'Go', 'Rust'];
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');

  // ---------- The key ----------
  async function keyState() {
    const has = await window.max.hasKey();
    $('#keyState').textContent = has ? 'Your key is saved. Paste a new one to replace it.' : 'Max needs a free NVIDIA API key to answer.';
    $('#keySteps').hidden = has;
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
      msg.textContent = 'Saved. Click Max to start.';
      keyState();
    } catch (e) {
      msg.className = 'msg bad';
      msg.textContent = clean(e);
    } finally { $('#saveKey').disabled = false; }
  }
  $('#saveKey').onclick = saveKey;
  $('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });

  // ---------- Courses ----------
  async function courses() {
    const all = await window.max.courses();
    const box = $('#courses');
    box.replaceChildren(...COURSES.map((lang) => {
      const c = all[lang], total = c?.syllabus?.length || 0, done = c?.done?.length || 0;
      const b = document.createElement('button');
      b.className = 'card';
      b.append(Object.assign(document.createElement('b'), { textContent: lang }),
        Object.assign(document.createElement('span'), { textContent: total ? `${done} / ${total} lessons done` : 'Not started' }));
      b.onclick = () => window.max.startCourse(lang);
      return b;
    }));
  }

  // ---------- Options ----------
  (async () => {
    const p = await window.max.prefs();
    $('#onTop').checked = p.onTop;
    $('#login').checked = p.login;
    $('#theme').value = p.theme;
  })();
  $('#onTop').onchange = (e) => window.max.setPref('onTop', e.target.checked);
  $('#login').onchange = (e) => window.max.setPref('login', e.target.checked);
  $('#theme').onchange = (e) => window.max.setPref('theme', e.target.value);
  $('#quit').onclick = () => window.max.quit();

  keyState();
  courses();
  window.addEventListener('focus', courses);   // progress made in the panel shows when you come back
})();
