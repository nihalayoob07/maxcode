// Max Code's menu, over the shared tutor page (tutor.js) inside the chibi's panel: ask anything, debug, explain.
// The NVIDIA key and the courses live in the settings window (settings.js). It calls the tutor's own functions
// (lesson, pick, openCourse, debug, showDrop).
'use strict';
(() => {
  // Title bar: Home; no voice here, so no mute; keep-on-top is a setting; close puts Max back to sitting.
  $('#mute').remove();
  $('#pin').remove();
  $('.brand').textContent = 'Max Code';
  $('#close').title = 'Close';
  $('#close').insertAdjacentHTML('beforebegin', '<button class="chip" id="homeBtn">Home</button>');

  document.body.insertAdjacentHTML('beforeend', `
  <section class="home" id="home">
    <div class="homebox" id="nokey" hidden>
      <h1>Hi, I'm Max</h1>
      <p>I explain code, teach languages and find bugs. First I need a free NVIDIA API key.</p>
      <button class="btn p" id="addKey">Add the key in Settings</button>
    </div>
    <div class="homebox" id="start" hidden>
      <h1>What do you want to do?</h1>
      <input id="askHome" placeholder="Ask anything, e.g. how do pointers work in C" autocomplete="off" spellcheck="false">
      <div class="grid">
        <button class="card" data-go="editor"><b>Debug my code</b><span>The file open in VS Code, Cursor or Windsurf</span></button>
        <button class="card" data-go="debug"><b>Debug a file</b><span>Drop a file or paste a program</span></button>
        <button class="card" data-go="explain"><b>Explain code</b><span>Walk through a program line by line</span></button>
      </div>
      <a href="#" class="small" id="toSettings">Courses and settings</a>
    </div>
  </section>`);

  async function home() {
    const has = await window.max.hasKey();
    $('#nokey').hidden = has;
    $('#start').hidden = !has;
    $('#home').hidden = false;
    if (has) $('#askHome').focus();
  }
  const leave = () => { $('#home').hidden = true; };

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
  });
  $('#askHome').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = $('#askHome').value;
    $('#askHome').value = '';
    request(t);
  });
  const settings = (e) => { e.preventDefault(); window.max.openSettings(); };
  $('#addKey').onclick = settings;
  $('#toSettings').onclick = settings;
  $('#homeBtn').onclick = () => { reset(null); render(); home(); };
  $('#dropCancel').addEventListener('click', home);   // the drop box opened from home: back to it

  // A course picked in Settings opens here.
  window.max.onStartCourse((lang) => { leave(); openCourse(lang); });
  // Opening the panel, or closing Settings (the key may have just been added), refreshes the menu.
  const refresh = () => { if (!$('#home').hidden) home(); };
  window.max.onMode((m) => { if (m === 'panel') refresh(); });
  window.max.onKeyChanged(refresh);

  home();
})();
