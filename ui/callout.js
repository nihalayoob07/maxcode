// Max's note beside a line of code on screen (main.js screenNote): what's wrong, the fix, and Apply fix, which main.js
// types into the app right there. The buttons go back to the tutor page as commands.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  window.max.onNote((n) => {
    $('#call').className = `call ${n.side}`;
    $('#call').style.setProperty('--arrow', `${Math.round(n.arrowY - 2)}px`);
    $('#title').className = n.fixed ? 'ok' : '';
    $('#title').textContent = !n.total ? 'All clear' : `#${n.n} · ${n.kind || 'error'}${n.title ? ` · ${n.title}` : ''}${n.fixed ? ' · fixed' : ''}`;
    $('#say').textContent = n.say;
    $('#fixBox').hidden = !n.fix;
    $('#fix').textContent = n.fix || '';
    $('#err').hidden = !n.error;
    $('#err').textContent = n.error || '';
    $('#count').textContent = n.total ? `${n.n} / ${n.total}` : '';
    $('#prev').hidden = $('#next').hidden = !n.total;
    $('#prev').disabled = n.n <= 1;
    $('#next').disabled = n.n >= n.total;
    $('#apply').hidden = !n.fix;
    $('#apply').disabled = false;
    $('#apply').textContent = 'Apply fix';
    $('#all').hidden = !(n.fixable > 1);
    $('#all').disabled = false;
    $('#all').textContent = `Fix all ${n.fixable}`;
  });
  $('#all').onclick = () => {
    $('#all').disabled = $('#apply').disabled = true;
    $('#all').textContent = 'Fixing…';
    window.max.calloutAct('fixAll');
  };
  $('#prev').onclick = () => window.max.calloutAct('prev');
  $('#next').onclick = () => window.max.calloutAct('next');
  $('#close').onclick = () => window.max.calloutAct('close');
  $('#apply').onclick = () => {
    $('#apply').disabled = true;
    $('#apply').textContent = 'Fixing…';
    window.max.calloutAct('applyHere');
  };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') window.max.calloutAct('close'); });
})();
