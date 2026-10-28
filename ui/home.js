// Max Code's home screen, over the shared tutor page (tutor.js): the NVIDIA key on first run, then the ways in
// that voice gives in the full app. It calls the tutor's own functions (lesson, pick, openCourse, debug, showDrop).
'use strict';
(() => {
  const COURSES = ['C', 'C++', 'Python', 'Java', 'JavaScript', 'C#', 'Go', 'Rust'];
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');

  // Title bar: Home and minimise; no voice here, so no mute; not kept on top until pinned.
  $('#mute').remove();
  $('#pin').classList.remove('on');
  $('.brand').textContent = 'MAX CODE';
  $('#pin').insertAdjacentHTML('beforebegin', '<button class="chip" id="homeBtn">Home</button>');
  $('#close').insertAdjacentHTML('beforebegin', `<button class="icon" id="min" title="Minimise" aria-label="Minimise">
    <svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>`);

  document.body.insertAdjacentHTML('beforeend', `
  <section class="home" id="home">
    <div class="homebox" id="setup" hidden>
      <h1>Welcome to Max Code</h1>
      <p>Max explains code, teaches languages and finds bugs. It runs on NVIDIA's AI, which needs a free API key.</p>
      <ol>
        <li><a href="#" id="getKey">Open NVIDIA's key page</a> and sign in (free).</li>
        <li>Click <b>Generate API Key</b> and copy it.</li>
        <li>Paste it here.</li>
      </ol>
      <div class="row">
        <input id="key" type="password" placeholder="nvapi-…" autocomplete="off" spellcheck="false">
        <button class="btn p" id="saveKey">Save</button>
      </div>
      <div class="msg" id="keyMsg">Your key stays on this PC, encrypted.</div>
    </div>
    <div class="homebox" id="start" hidden>
      <h1>What do you want to do?</h1>
      <input id="askHome" placeholder="Ask anything, e.g. how do pointers work in C" autocomplete="off" spellcheck="false">
      <div class="grid">
        <button class="card" data-go="editor"><b>Debug my code</b><span>The file open in VS Code, Cursor or Windsurf</span></button>
        <button class="card" data-go="debug"><b>Debug a file</b><span>Drop a file or paste a program</span></button>
        <button class="card" data-go="explain"><b>Explain code</b><span>Walk through a program line by line</span></button>
      </div>
      <h2>Courses</h2>
      <div class="acts start">${COURSES.map((l) => `<button class="btn" data-course="${l}">${l}</button>`).join('')}</div>
      <a href="#" class="small" id="changeKey">Change NVIDIA key</a>
    </div>
  </section>`);

  async function home() {
    const has = await window.max.hasKey();
    $('#setup').hidden = has;
    $('#start').hidden = !has;
    $('#home').hidden = false;
    (has ? $('#askHome') : $('#key')).focus();
  }
  const leave = () => { $('#home').hidden = true; };

  // ---------- First run: the key ----------
  $('#getKey').onclick = (e) => { e.preventDefault(); window.max.openKeyPage(); };
  async function saveKey() {
    const msg = $('#keyMsg');
    msg.className = 'msg';
    msg.textContent = 'Checking the key with NVIDIA…';
    $('#saveKey').disabled = true;
    try {
      await window.max.setKey($('#key').value);
      $('#key').value = '';
      msg.textContent = 'Your key stays on this PC, encrypted.';
      home();
    } catch (e) {
      msg.className = 'msg bad';
      msg.textContent = clean(e);
    } finally { $('#saveKey').disabled = false; }
  }
  $('#saveKey').onclick = saveKey;
  $('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
  $('#changeKey').onclick = (e) => { e.preventDefault(); $('#start').hidden = true; $('#setup').hidden = false; $('#key').focus(); };

  // ---------- The ways in ----------
  async function go(what) {
    leave();
    if (what === 'debug' || what === 'explain') return showDrop(what);
    const code = await window.max.editorCode();
    if (!code) return showDrop('debug', "I can't see a code file open in your editor. Drop it here, or paste the program");
    debug(code.files, code);
  }
  // A typed request goes where the spoken one would in the full app (tutor.js intent()).
  async function request(text) {
    text = text.trim();
    if (!text) return;
    const job = await window.max.intent(text);
    leave();
    if (job?.kind === 'course') return openCourse(job.lang);
    if (job?.kind === 'debug') return go('editor');
    if (job?.kind === 'explain') return showDrop('explain');
    if (job?.lang) return lesson(text, job.lang);
    pick(text);
  }
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-go]');
    if (card) go(card.dataset.go);
    const c = e.target.closest('[data-course]');
    if (c) { leave(); openCourse(c.dataset.course); }
  });
  $('#askHome').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = $('#askHome').value;
    $('#askHome').value = '';
    request(t);
  });
  $('#homeBtn').onclick = () => { reset(null); render(); home(); };
  $('#min').onclick = () => window.max.tutorWin('min');
  $('#dropCancel').addEventListener('click', home);   // the drop box opened from home: back to it

  home();
})();
