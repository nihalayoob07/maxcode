// Max as a small chibi (main.js sizes the window). He hides under the bottom of the screen with a hand peeking out;
// click the hand (or Ctrl+Alt+M) and he rises. Click him to open the tutor as a panel above him, drag him anywhere,
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
      <g class="me">
        <rect x="36" y="76" width="48" height="40" rx="16" fill="#15171a" stroke="#2c3036"/>
        <path d="M48 78q12 9 24 0" fill="none" stroke="#007ba7" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M54 84v10M66 84v10" stroke="#ff2d95" stroke-width="1.6" stroke-linecap="round"/>
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
        <g class="eyes">
          <ellipse cx="50" cy="56" rx="3.4" ry="4.4" fill="#1b1c22"/><circle cx="51.3" cy="54.4" r="1.3" fill="#fff"/>
          <ellipse cx="70" cy="56" rx="3.4" ry="4.4" fill="#1b1c22"/><circle cx="71.3" cy="54.4" r="1.3" fill="#fff"/>
        </g>
        <g class="glasses" fill="#fff" fill-opacity=".1" stroke="#1b1c22" stroke-width="2">
          <circle cx="50" cy="56" r="8.5"/><circle cx="70" cy="56" r="8.5"/>
          <path d="M58.5 55q1.5-2 3 0M41.5 54l-5-2M78.5 54l5-2" fill="none"/>
        </g>
        <ellipse cx="44" cy="64" rx="4" ry="2.4" fill="#ff2d95" opacity=".3"/>
        <ellipse cx="76" cy="64" rx="4" ry="2.4" fill="#ff2d95" opacity=".3"/>
        <path class="mouth" d="M56 66q4 3 8 0" fill="none" stroke="#7a3b3b" stroke-width="1.8" stroke-linecap="round"/>
      </g>
      <rect class="screen" x="38" y="90" width="44" height="24" rx="3" fill="#1f2328" stroke="#007ba7" stroke-width="1.5"/>
      <circle class="glow" cx="60" cy="102" r="3" fill="#4fb8e0"/>
      <path d="M30 114h60l-5 6H35z" fill="#2b2f35"/>
      <circle cx="36" cy="110" r="5" fill="#f2d6c2"/><circle cx="84" cy="110" r="5" fill="#f2d6c2"/>
    </svg>
  </div>`);
  document.body.insertAdjacentHTML('beforeend', `
  <div id="hand" title="Max is hiding. Click to call him (Ctrl+Alt+M)" role="button" aria-label="Call Max">
    <svg viewBox="0 0 50 56" aria-hidden="true">
      <g class="wave">
        <rect x="15" y="38" width="20" height="20" fill="#15171a"/>
        <rect x="13.5" y="35" width="23" height="5" rx="2.5" fill="#007ba7"/>
        <rect x="15.5" y="9" width="4.6" height="16" rx="2.3" fill="#f2d6c2"/>
        <rect x="20.6" y="5" width="4.6" height="18" rx="2.3" fill="#f2d6c2"/>
        <rect x="25.7" y="6" width="4.6" height="17" rx="2.3" fill="#f2d6c2"/>
        <rect x="30.8" y="10" width="4.4" height="15" rx="2.2" fill="#f2d6c2"/>
        <rect x="15" y="18" width="20.5" height="18" rx="7" fill="#f2d6c2"/>
        <ellipse cx="13" cy="26" rx="3" ry="6" transform="rotate(-30 13 26)" fill="#f2d6c2"/>
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
  chibi.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (!dragged && Math.hypot(e.screenX - start.x, e.screenY - start.y) < 4) return;
    dragged = true;
    window.max.drag(e.screenX - last.x, e.screenY - last.y);
    last = { x: e.screenX, y: e.screenY };
  });
  chibi.addEventListener('pointerup', () => {
    if (start && !dragged) window.max.mode(document.body.classList.contains('pet') ? 'panel' : 'pet');
    start = null;
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
  const IDLE = 5 * 60 * 1000;
  let lastActive = Date.now();
  const active = () => { lastActive = Date.now(); };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) document.addEventListener(ev, active, { passive: true });
  setInterval(() => {
    if (!$('#busy').hidden) return active();
    if (!cls.contains('hide') && Date.now() - lastActive > IDLE) window.max.mode('hide');
  }, 10000);
  // Thinking pose while the tutor waits on NVIDIA (tutor.js shows #busy).
  new MutationObserver(() => chibi.classList.toggle('thinking', !$('#busy').hidden))
    .observe($('#busy'), { attributes: true, attributeFilter: ['hidden'] });
})();
