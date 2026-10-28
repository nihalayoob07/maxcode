// Max as a small chibi sitting on the screen (main.js sizes the window). Click him to open the tutor as a panel
// above him, drag him anywhere, right-click for Settings and Quit. He looks at his laptop while NVIDIA answers.
'use strict';
(() => {
  // The tutor page goes into a panel; fixed overlays (home, drop box) stay inside it (pet.css).
  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.append(...document.body.childNodes);
  document.body.append(panel);
  document.body.classList.add('pet');

  document.body.insertAdjacentHTML('beforeend', `
  <div id="chibi" title="Max Code: click to open, drag to move, right-click for settings" role="button" aria-label="Open Max Code">
    <svg viewBox="0 0 120 130" aria-hidden="true">
      <ellipse cx="60" cy="125" rx="36" ry="4" fill="#000" opacity=".35"/>
      <g class="think"><circle cx="92" cy="14" r="3"/><circle cx="102" cy="10" r="3"/><circle cx="112" cy="6" r="3"/></g>
      <g class="me">
        <rect x="36" y="76" width="48" height="40" rx="16" fill="#15171a" stroke="#2c3036"/>
        <path d="M48 78q12 9 24 0" fill="none" stroke="#007ba7" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M54 84v10M66 84v10" stroke="#ff2d95" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M27 50a33 33 0 0 1 66 0" fill="none" stroke="#ff2d95" stroke-width="4" stroke-linecap="round"/>
        <circle cx="60" cy="50" r="28" fill="#f2d6c2"/>
        <path d="M32 48c-2-18 12-30 28-30s30 10 28 30c-4-6-9-10-12-11 1 4 0 7-2 9-3-6-10-10-16-10 1 3 0 6-3 8-2-4-6-6-9-6 0 4-6 8-14 10z" fill="#1b1c22"/>
        <path d="M71 21c5 2 9 6 11 11" stroke="#ff2d95" stroke-width="3" stroke-linecap="round" fill="none"/>
        <rect x="25" y="42" width="10" height="18" rx="5" fill="#ff2d95"/>
        <rect x="85" y="42" width="10" height="18" rx="5" fill="#ff2d95"/>
        <g class="eyes">
          <ellipse cx="50" cy="56" rx="4" ry="5.2" fill="#1b1c22"/><circle cx="51.5" cy="54" r="1.5" fill="#fff"/>
          <ellipse cx="70" cy="56" rx="4" ry="5.2" fill="#1b1c22"/><circle cx="71.5" cy="54" r="1.5" fill="#fff"/>
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
  const chibi = $('#chibi');

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

  window.max.onMode((m) => document.body.classList.toggle('pet', m === 'pet'));
  // Thinking pose while the tutor waits on NVIDIA (tutor.js shows #busy).
  new MutationObserver(() => chibi.classList.toggle('thinking', !$('#busy').hidden))
    .observe($('#busy'), { attributes: true, attributeFilter: ['hidden'] });
})();
