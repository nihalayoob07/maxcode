// Max as a small chibi (main.js sizes the window). He hides under the bottom of the screen with a hand peeking out;
// click the hand (or the call shortcut, set in Settings) and he rises. Click him to open the tutor as a panel above him, drag him anywhere,
// right-click for Settings and Quit. He looks at his laptop while NVIDIA answers, and hides after 5 idle minutes.
'use strict';
(() => {
  // The tutor page goes into a panel; fixed overlays (home, drop box) stay inside it (pet.css).
  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.append(...document.body.childNodes);
  document.body.append(panel);
  document.body.classList.add('pet', 'hide');

  document.body.insertAdjacentHTML('beforeend', `
  <div id="chibi" title="Max Code: click to open, drag to move, right-click for settings" role="button" aria-label="Open Max Code">
    <svg viewBox="0 0 120 130" aria-hidden="true">
      <ellipse cx="60" cy="125" rx="36" ry="4" fill="#000" opacity=".35"/>
      <g class="think"><circle cx="92" cy="14" r="3"/><circle cx="102" cy="10" r="3"/><circle cx="112" cy="6" r="3"/></g>
      <g class="k k-owl zzz" fill="#9aa8d6" font-family="Segoe UI, sans-serif" font-weight="700">
        <text x="20" y="38" font-size="9">z</text><text x="11" y="27" font-size="11">z</text><text x="2" y="15" font-size="13">Z</text>
      </g>
      <g class="me">
        <rect class="shirt" x="36" y="76" width="48" height="40" rx="16" fill="#15171a" stroke="#2c3036"/>
        <g class="hoodie">
          <path d="M48 78q12 9 24 0" fill="none" stroke="#007ba7" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M54 84v10M66 84v10" stroke="#ff2d95" stroke-width="1.6" stroke-linecap="round"/>
        </g>
        <g class="k k-pyjamas">
          <path d="M49 78l11 8 11-8" fill="none" stroke="#f4e7a1" stroke-width="2.2" stroke-linejoin="round"/>
          <g fill="#f4e7a1"><circle cx="42" cy="86" r="1.3"/><circle cx="79" cy="84" r="1.3"/><circle cx="60" cy="90" r="1.1"/></g>
          <path d="M44 80a3 3 0 1 0 3 4 2.4 2.4 0 1 1-3-4z" fill="#f4e7a1"/>
        </g>
        <circle cx="60" cy="50" r="28" fill="#f2d6c2"/>
        <g fill="#2a1d18">
          <circle cx="35" cy="47" r="7"/><circle cx="36" cy="37" r="8"/><circle cx="43" cy="28" r="8"/><circle cx="52" cy="23" r="8"/>
          <circle cx="62" cy="21" r="8"/><circle cx="72" cy="24" r="8"/><circle cx="80" cy="31" r="8"/><circle cx="85" cy="40" r="7"/>
          <circle cx="86" cy="48" r="6"/><circle cx="46" cy="36" r="6"/><circle cx="56" cy="33" r="6"/><circle cx="66" cy="33" r="6"/><circle cx="75" cy="37" r="5.5"/>
        </g>
        <g fill="none" stroke="#3a2a22" stroke-width="1.3" stroke-linecap="round">
          <path d="M40 30a5 5 0 0 1 6-3M58 18a5 5 0 0 1 7 1M76 26a5 5 0 0 1 4 5M50 33a4 4 0 0 1 6-2M68 31a4 4 0 0 1 5 2"/>
        </g>
        <path d="M27 50a33 33 0 0 1 66 0" fill="none" stroke="#ff2d95" stroke-width="4" stroke-linecap="round"/>
        <rect x="25" y="42" width="10" height="18" rx="5" fill="#ff2d95"/>
        <rect x="85" y="42" width="10" height="18" rx="5" fill="#ff2d95"/>
        <g class="k k-owl" fill="#7a5a9a" opacity=".35"><ellipse cx="50" cy="63.5" rx="5" ry="1.7"/><ellipse cx="70" cy="63.5" rx="5" ry="1.7"/></g>
        <g class="eyes">
          <ellipse cx="50" cy="56" rx="3.4" ry="4.4" fill="#1b1c22"/><circle cx="51.3" cy="54.4" r="1.3" fill="#fff"/>
          <ellipse cx="70" cy="56" rx="3.4" ry="4.4" fill="#1b1c22"/><circle cx="71.3" cy="54.4" r="1.3" fill="#fff"/>
          <g class="k k-sleepy k-owl lids" fill="#f2d6c2" stroke="#1b1c22" stroke-width="1.2">
            <path d="M45.8 50.8h8.4v5.2h-8.4z" stroke="none"/><path d="M45.8 56h8.4" fill="none"/>
            <path d="M65.8 50.8h8.4v5.2h-8.4z" stroke="none"/><path d="M65.8 56h8.4" fill="none"/>
          </g>
        </g>
        <g class="dizzy-eyes" fill="none" stroke="#1b1c22" stroke-width="1.3" stroke-linecap="round">
          <path d="M50 56a1 1 0 0 1 1.6.4 2 2 0 0 1-2.4 1.6 3 3 0 0 1-2.2-3.6 4 4 0 0 1 4.8-2.6"><animateTransform attributeName="transform" type="rotate" from="0 50 56" to="360 50 56" dur=".8s" repeatCount="indefinite"/></path>
          <path d="M70 56a1 1 0 0 1 1.6.4 2 2 0 0 1-2.4 1.6 3 3 0 0 1-2.2-3.6 4 4 0 0 1 4.8-2.6"><animateTransform attributeName="transform" type="rotate" from="0 70 56" to="360 70 56" dur=".8s" repeatCount="indefinite"/></path>
        </g>
        <path class="shut" d="M46 57q4 3 8 0M66 57q4 3 8 0" fill="none" stroke="#1b1c22" stroke-width="1.6" stroke-linecap="round"/>
        <g class="glasses" fill="#fff" fill-opacity=".1" stroke="#1b1c22" stroke-width="2">
          <circle cx="50" cy="56" r="8.5"/><circle cx="70" cy="56" r="8.5"/>
          <path d="M58.5 55q1.5-2 3 0M41.5 54l-5-2M78.5 54l5-2" fill="none"/>
        </g>
        <g class="shades">
          <path d="M40 51h18v6a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5zM62 51h18v6a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5z" fill="#111"/>
          <path d="M58 53h4M40 53l-4-1.5M80 53l4-1.5" stroke="#111" stroke-width="2" fill="none"/><path d="M43 54l4-1.5M65 54l4-1.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>
        </g>
        <path class="sweat" d="M84 36q3.5 5 0 8a3.5 3.5 0 0 1-3.5-3.5q0-2 3.5-4.5z" fill="#7cc7ff"/>
        <ellipse cx="44" cy="64" rx="4" ry="2.4" fill="#ff2d95" opacity=".3"/>
        <ellipse cx="76" cy="64" rx="4" ry="2.4" fill="#ff2d95" opacity=".3"/>
        <path class="mouth" d="M56 66q4 3 8 0" fill="none" stroke="#7a3b3b" stroke-width="1.8" stroke-linecap="round"/>
        <ellipse class="mouth-o" cx="60" cy="67.5" rx="2.6" ry="3.2" fill="#7a3b3b"/>

        <g class="k k-nightcap">
          <path d="M37 25C40 5 70-1 98 10c-6 2-10 8-15 15z" fill="#3d4f9c"/>
          <rect x="34" y="21" width="52" height="9" rx="4.5" fill="#f4e7a1"/><circle cx="99" cy="11" r="5" fill="#f4e7a1"/>
        </g>
        <g class="k k-santa">
          <path d="M37 25C40 5 70-1 98 10c-6 2-10 8-15 15z" fill="#d62c3a"/>
          <rect x="34" y="21" width="52" height="9" rx="4.5" fill="#fff"/><circle cx="99" cy="11" r="5" fill="#fff"/>
        </g>
        <g class="k k-cap">
          <path d="M34 33C34 9 86 9 86 33z" fill="#007ba7"/><rect x="53" y="27" width="14" height="6" rx="3" fill="#2a1d18"/>
          <path d="M34 33h52" stroke="#00597a" stroke-width="2.5"/><circle cx="60" cy="12" r="2" fill="#00597a"/>
        </g>
        <g class="k k-halloween">
          <ellipse cx="60" cy="26" rx="37" ry="5.5" fill="#2b1b3d"/>
          <path d="M42 25c8-7 16-19 28-24-4 9 0 17 8 24z" fill="#2b1b3d"/>
          <path d="M44 21q16 4 32 0l1 3.5q-17 4.5-34 0z" fill="#ff8a1f"/>
        </g>
        <g class="k k-party">
          <path d="M48 25 63 2l13 21z" fill="#ff2d95"/>
          <path d="M54 16l13 3M58 9l8 2" stroke="#7cc7ff" stroke-width="2.5"/><circle cx="63" cy="3" r="3.2" fill="#ffd23f"/>
          <g class="confetti"><rect x="20" y="14" width="3" height="5" fill="#7cc7ff" transform="rotate(20 21 16)"/>
            <rect x="96" y="22" width="3" height="5" fill="#ffd23f" transform="rotate(-25 97 24)"/>
            <rect x="28" y="4" width="3" height="5" fill="#4ec98b" transform="rotate(50 29 6)"/><circle cx="90" cy="6" r="1.8" fill="#ff2d95"/></g>
        </g>
      </g>
      <rect class="screen" x="38" y="90" width="44" height="24" rx="3" fill="#1f2328" stroke="#007ba7" stroke-width="1.5"/>
      <circle class="glow" cx="60" cy="102" r="3" fill="#4fb8e0"/>
      <text class="k k-leet" x="60" y="105" text-anchor="middle" font-family="Consolas, monospace" font-size="8" font-weight="700" fill="#39ff14">1337</text>
      <g class="orbit" transform="translate(60 20) scale(1 .35)"><g fill="#ffd23f">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.2s" repeatCount="indefinite"/>
        <path d="M34 -6l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z"/><path d="M-34 -6l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z"/><path d="M0 28l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z"/><path d="M0 -40l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z"/>
      </g></g>
      <g class="k k-friday notes" fill="#ff2d95" font-family="Segoe UI Symbol, sans-serif" font-size="13"><text x="8" y="44">♪</text><text x="100" y="56">♫</text></g>
      <path d="M30 114h60l-5 6H35z" fill="#2b2f35"/>
      <circle cx="36" cy="110" r="5" fill="#f2d6c2"/><circle class="rhand" cx="84" cy="110" r="5" fill="#f2d6c2"/>

      <g class="k k-sleepy">
        <g class="steam" fill="none" stroke="#c9ced8" stroke-width="1.4" stroke-linecap="round"><path d="M17 96q-2-3 0-6t0-6"/><path d="M22 97q-2-3 0-6t0-6"/></g>
        <path d="M27 103h3a3 3 0 0 1 0 7h-3" fill="none" stroke="#fbfaf7" stroke-width="2"/>
        <rect x="13" y="99" width="15" height="16" rx="3" fill="#fbfaf7"/><rect x="13" y="104" width="15" height="3" fill="#ff2d95"/>
      </g>
      <g class="k k-birthday">
        <ellipse cx="18" cy="119" rx="12" ry="2.5" fill="#d9d9e0"/>
        <rect x="8" y="104" width="20" height="14" rx="3" fill="#ff8fc4"/>
        <path d="M8 107q2.5 4 5 0t5 0 5 0 5 0v-1a3 3 0 0 0-3-3H11a3 3 0 0 0-3 3z" fill="#fff"/>
        <rect x="16.8" y="95" width="2.4" height="8" rx="1" fill="#7cc7ff"/>
        <ellipse class="flame" cx="18" cy="92.5" rx="2" ry="3" fill="#ffb42b"/>
      </g>
      <g class="k k-halloween">
        <ellipse cx="104" cy="113" rx="11" ry="9" fill="#ff8a1f"/>
        <path d="M98 105q-3 8 0 16M110 105q3 8 0 16" fill="none" stroke="#d96d0f" stroke-width="1.2"/>
        <rect x="102.5" y="101" width="3" height="5" rx="1" fill="#4a7a2a"/>
        <path d="M99 111l2.5-3 2.5 3zM105 111l2.5-3 2.5 3zM99 115q5 4 10 0q-5 2-10 0z" fill="#2b1b3d"/>
      </g>
      <g class="k k-lunch snack">
        <path d="M78 106l17-6-3 13z" fill="#e9c48a" stroke="#b98a4e" stroke-width="1"/>
        <path d="M79.5 106.5l14-5" stroke="#6cbf5a" stroke-width="2" stroke-linecap="round"/>
        <circle cx="84" cy="110" r="5" fill="#f2d6c2"/>
      </g>
      <g class="sparkles" fill="#ffd23f">
        <path d="M18 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M102 40l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/>
        <path d="M24 72l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z"/>
      </g>
    </svg>
  </div>`);
  document.body.insertAdjacentHTML('beforeend', `
  <div id="hand" title="Max is hiding. Click to call him" role="button" aria-label="Call Max">
    <svg viewBox="8 4 30 50" aria-hidden="true">
      <g class="wave">
        <rect class="sleeve" x="15" y="38" width="20" height="20" fill="#15171a"/>
        <rect class="cuff" x="13.5" y="35" width="23" height="5" rx="2.5" fill="#007ba7"/>
        <path d="M16.5 31 11.5 22.5" stroke="#f2d6c2" stroke-width="5" stroke-linecap="round"/>
        <rect x="15.5" y="9" width="4.6" height="16" rx="2.3" fill="#f2d6c2"/>
        <rect x="20.6" y="5" width="4.6" height="18" rx="2.3" fill="#f2d6c2"/>
        <rect x="25.7" y="6" width="4.6" height="17" rx="2.3" fill="#f2d6c2"/>
        <rect x="30.8" y="10" width="4.4" height="15" rx="2.2" fill="#f2d6c2"/>
        <rect x="15" y="18" width="20.5" height="18" rx="7" fill="#f2d6c2"/>
      </g>
    </svg>
  </div>`);
  const chibi = $('#chibi'), hand = $('#hand');

  // Click opens/closes the panel; a press that moves is a drag (main.js moves the window).
  let start = null, last = null, dragged = false;
  chibi.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    chibi.setPointerCapture(e.pointerId);
    start = last = { x: e.screenX, y: e.screenY };
    dragged = false;
  });
  // Easter eggs: a reaction plays for a while (pet.css draws each one).
  const react = (name, ms) => {
    chibi.classList.add(name);
    setTimeout(() => chibi.classList.remove(name), ms);
  };
  // Shaken while dragged (lots of quick changes of direction): dizzy.
  let flips = [], lastDx = 0;
  chibi.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (!dragged && Math.hypot(e.screenX - start.x, e.screenY - start.y) < 4) return;
    dragged = true;
    const dx = e.screenX - last.x;
    if (Math.abs(dx) > 4) {
      if (lastDx && Math.sign(dx) !== Math.sign(lastDx)) flips = [...flips.filter((t) => Date.now() - t < 1200), Date.now()];
      lastDx = dx;
    }
    window.max.drag(dx, e.screenY - last.y);
    last = { x: e.screenX, y: e.screenY };
  });
  // One click opens/closes the panel; poked three times quickly, he gets dizzy instead.
  let pokes = 0, pokeTimer = null;
  chibi.addEventListener('pointerup', () => {
    if (start && dragged && flips.length >= 6) react('dizzy', 3000);
    if (start && !dragged) {
      pokes++;
      clearTimeout(pokeTimer);
      if (pokes >= 3) { pokes = 0; react('dizzy', 3000); }
      else pokeTimer = setTimeout(() => { pokes = 0; window.max.mode(document.body.classList.contains('pet') ? 'panel' : 'pet'); }, 250);
    }
    start = null; flips = []; lastDx = 0;
  });
  // Hovered for 2 s: he waves.
  let hoverTimer = null;
  chibi.addEventListener('pointerenter', () => { hoverTimer = setTimeout(() => react('wave', 2200), 2000); });
  chibi.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  document.addEventListener('maxwave', () => react('wave', 2200));   // "hi Max" typed (home.js)
  // The Konami code (↑ ↑ ↓ ↓ ← → ← → B A) in the panel: sunglasses for a minute.
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konami = 0;
  document.addEventListener('keydown', (e) => {
    konami = e.key.toLowerCase() === KONAMI[konami].toLowerCase() ? konami + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (konami === KONAMI.length) { konami = 0; react('shades', 60000); say('Deal with it.'); }
  });
  chibi.addEventListener('contextmenu', (e) => { e.preventDefault(); window.max.petMenu(); });
  chibi.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') window.max.mode('panel'); });
  chibi.tabIndex = 0;

  // Sinking plays before main.js shrinks the window to the hand; rising plays once it has grown.
  const cls = document.body.classList;
  window.max.onMode((m) => {
    active();
    if (m === 'hide') {
      cls.add('pet');
      chibi.classList.add('sink');
      setTimeout(() => { cls.add('hide'); chibi.classList.remove('sink'); }, 340);
      return;
    }
    if (cls.contains('hide')) { chibi.classList.add('rise'); setTimeout(() => chibi.classList.remove('rise'), 450); }
    cls.remove('hide');
    cls.toggle('pet', m === 'pet');
  });
  hand.addEventListener('click', () => window.max.mode('pet'));
  hand.addEventListener('contextmenu', (e) => { e.preventDefault(); window.max.petMenu(); });

  // Back into hiding after 5 minutes with no clicks, typing or answers coming in.
  // What he's wearing (costume.js): checked every minute.
  const dress = () => {
    for (const c of [...cls].filter((c) => c.startsWith('c-'))) cls.remove(c);
    for (const c of costumes(new Date())) cls.add(`c-${c}`);
  };
  dress();
  setInterval(dress, 60000);

  // A jump and sparkles when a fix is applied (a tick in the gutter) or a practice answer is right.
  let wins = 0, bugs = 0;
  new MutationObserver(() => {
    const n = document.querySelectorAll('#code .g b.ok, #code .head.ok').length;
    if (n > wins) { chibi.classList.remove('cheer'); void chibi.offsetWidth; chibi.classList.add('cheer'); }
    wins = n;
    const b = document.querySelectorAll('#code .head.bad').length;   // bugs found: a sweat drop and a red screen
    if (b > bugs) react('oops', 2600);
    bugs = b;
  }).observe($('#code'), { childList: true, subtree: true });
  chibi.addEventListener('animationend', (e) => { if (e.animationName === 'jump') chibi.classList.remove('cheer'); });

  const IDLE = 5 * 60 * 1000;
  let lastActive = Date.now();
  const active = () => { lastActive = Date.now(); chibi.classList.remove('nap'); };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) document.addEventListener(ev, active, { passive: true });
  setInterval(() => {
    if (!$('#busy').hidden) return active();
    // Sitting with nothing to do for 2.5 minutes: he nods off (a hover wakes him).
    if (cls.contains('pet') && !cls.contains('hide') && Date.now() - lastActive > 150000) chibi.classList.add('nap');
    if (!cls.contains('hide') && Date.now() - lastActive > IDLE) window.max.mode('hide');
  }, 10000);
  // Thinking pose while the tutor waits on NVIDIA (tutor.js shows #busy).
  new MutationObserver(() => chibi.classList.toggle('thinking', !$('#busy').hidden))
    .observe($('#busy'), { attributes: true, attributeFilter: ['hidden'] });
})();
