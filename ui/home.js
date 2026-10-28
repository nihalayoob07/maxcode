// Max Code's menu, over the shared tutor page (tutor.js) inside the chibi's panel: ask anything, debug, explain.
// Courses are here too; the NVIDIA key and the options live in the settings window (settings.js). It calls the
// tutor's own functions (lesson, pick, openCourse, debug, showDrop).
'use strict';
(() => {
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');
  const COMMON = ['Python', 'JavaScript', 'HTML', 'CSS', 'Java', 'C', 'C++', 'C#', 'SQL'];
  const COURSES = ['Python', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SQL', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift', 'Dart', 'PHP', 'Ruby', 'Bash', 'PowerShell', 'Lua', 'Perl', 'R', 'MATLAB', 'Julia', 'Scala', 'Haskell', 'Elixir', 'Erlang', 'Clojure', 'F#', 'OCaml', 'Lisp', 'Objective-C', 'Assembly', 'Zig', 'Fortran', 'COBOL', 'Visual Basic', 'Pascal', 'Solidity', 'Groovy', 'Prolog', 'Ada'];

  // Title bar: Home, the mic (voice.js) and mute; keep-on-top is a setting; close puts Max back to sitting.
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
        <button class="card" data-go="editor"><b>Debug my code</b><span>Whatever code is on your screen, in any app</span></button>
        <button class="card" data-go="debug"><b>Debug a file</b><span>Drop a file or paste a program</span></button>
        <button class="card" data-go="explain"><b>Explain code</b><span>Walk through a program line by line</span></button>
        <button class="card" data-go="courses"><b>Courses</b><span>Learn a language lesson by lesson</span></button>
      </div>
      <a href="#" class="small" id="toSettings">Settings</a>
    </div>
    <div class="homebox" id="courseBox" hidden>
      <a href="#" class="small back" id="coursesBack">← Back</a>
      <h1>Courses</h1>
      <p>Max teaches a language lesson by lesson. Progress is saved on this PC.</p>
      <input id="courseFilter" placeholder="Search all 43 languages" autocomplete="off" spellcheck="false">
      <div class="courses" id="courses"></div>
    </div>
  </section>`);

  async function home() {
    const has = await window.max.hasKey();
    $('#nokey').hidden = has;
    $('#start').hidden = !has;
    $('#courseBox').hidden = true;
    $('#home').hidden = false;
    if (has) $('#askHome').focus();
  }
  const leave = () => { $('#home').hidden = true; };

  // ---------- The ways in ----------
  async function courses() {
    const all = await window.max.courses();
    $('#courses').replaceChildren(...COURSES.map((lang) => {
      const c = all[lang], total = c?.syllabus?.length || 0, done = c?.done?.length || 0;
      const b = document.createElement('button');
      b.className = 'card';
      b.append(Object.assign(document.createElement('b'), { textContent: lang }),
        Object.assign(document.createElement('span'), { textContent: total ? `${done} / ${total} done` : 'Not started' }));
      b.onclick = () => { leave(); openCourse(lang); };
      b.dataset.common = COMMON.includes(lang) || total ? '1' : '';
      return b;
    }));
    $('#start').hidden = $('#nokey').hidden = true;
    $('#courseBox').hidden = false;
    $('#courseFilter').value = '';
    filter();
    $('#courseFilter').focus();
  }
  // The common languages (and any you've started) show; the rest come up when you search.
  function filter() {
    const q = $('#courseFilter').value.trim().toLowerCase();
    for (const b of $('#courses').children) b.hidden = q ? !b.firstChild.textContent.toLowerCase().includes(q) : !b.dataset.common;
  }
  $('#courseFilter').addEventListener('input', filter);
  $('#coursesBack').onclick = (e) => { e.preventDefault(); home(); };

  async function go(what) {
    if (what === 'courses') return courses();
    leave();
    if (what === 'debug' || what === 'explain') return showDrop(what);
    // Debug my code: Max finds the code on the screen and asks if that's it (main.js screenCode).
    reset(null); render();
    busy('Max is looking at your screen');
    let code;
    try { code = await window.max.screenCode(); } catch (e) { busy(null); return task(clean(e), 'bad'); }
    busy(null);
    if (!code) return home();   // cancelled
    debug(code.files, code);
  }
  // A typed request goes where the spoken one would in the full app (tutor.js intent()).
  async function request(text) {
    text = text.trim();
    if (!text) return;
    if (/^\W*(?:hi|hello|hey|yo|sup|hiya|howdy)\b[\s\w,!.']{0,10}$/i.test(text)) {   // just a hello
      document.dispatchEvent(new Event('maxwave'));
      return say('Hi! What are we coding today?');
    }
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

  // Opening the panel, or closing Settings (the key may have just been added), refreshes the menu.
  const refresh = () => { if (!$('#home').hidden) home(); };
  window.max.onTutor((job) => (job.kind === 'screen' ? go('editor') : leave()));   // a spoken request (main.js)
  window.max.onMode((m) => { if (m === 'panel') refresh(); });
  window.max.onKeyChanged(refresh);

  home();
})();
