// The overlay over the screen (main.js pointAt): Max's pointer flies in from his corner to the code he found and
// asks "Is this the code?". Yes sends that box; "No" (or no code found) lets you drag a box around the right part.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const box = new URLSearchParams(location.search).get('box');
  const show = (r) => {
    Object.assign($('#hole').style, { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2] - r[0]}px`, height: `${r[3] - r[1]}px` });
    $('#hole').hidden = false;
  };
  function select() {
    document.body.classList.add('select');
    $('#ask').hidden = $('#pointer').hidden = $('#hole').hidden = true;
    $('#banner').hidden = false;
    let from = null;
    const rect = (e) => [Math.min(from[0], e.clientX), Math.min(from[1], e.clientY), Math.max(from[0], e.clientX), Math.max(from[1], e.clientY)];
    document.onpointerdown = (e) => { from = [e.clientX, e.clientY]; $('#banner').hidden = true; };
    document.onpointermove = (e) => { if (from) show(rect(e)); };
    document.onpointerup = (e) => {
      if (!from) return;
      const r = rect(e);
      from = null;
      if (r[2] - r[0] > 20 && r[3] - r[1] > 12) window.max.pointAnswer({ rect: r });
      else { $('#hole').hidden = true; $('#banner').hidden = false; }
    };
  }
  if (box) {
    const r = box.split(',').map(Number);
    show(r);
    // The pointer starts at the bottom right (where Max sits) and flies to the box's bottom-right corner, tip first.
    const p = $('#pointer');
    Object.assign(p.style, { left: `${innerWidth - 120}px`, top: `${innerHeight - 140}px` });
    p.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(p.style, { left: `${Math.min(r[2] - 9, innerWidth - 60)}px`, top: `${Math.min(r[3] - 6, innerHeight - 60)}px` });
      setTimeout(() => p.classList.add('tap'), 900);
    }));
    const ask = $('#ask');
    ask.hidden = false;
    const below = r[3] + 16 + 90 < innerHeight;
    Object.assign(ask.style, { left: `${Math.max(16, Math.min(r[0], innerWidth - 300))}px`, top: `${below ? r[3] + 16 : Math.max(16, r[1] - 100)}px` });
    $('#yes').onclick = () => window.max.pointAnswer({ rect: r });
    $('#no').onclick = select;
    $('#yes').focus();
  } else {
    $('#banner').textContent = "I couldn't spot code. Drag a box around it · Esc to cancel";
    select();
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
    if (e.key === 'Enter' && box && !document.body.classList.contains('select')) $('#yes').click();
  });
})();
