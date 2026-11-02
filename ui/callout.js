// Max's note beside a line of code on screen (main.js screenNote): what's wrong, the fix, and Apply fix, which main.js
// types into the app right there. The buttons go back to the tutor page as commands.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  window.max.onNote((n) => {
    $('#call').className = `call ${n.side}`;
    $('#call').style.setProperty('--arrow', `${Math.round(n.arrowY - 2)}px`);
    $('#title').className = n.fixed ? 'ok' : '';
    $('#log').hidden = !n.done;   // "Just fix it": what was fixed, and the log with every change
    $('#reveal').hidden = !n.reveal;   // a hint first; Show me tells the whole story
    $('#title').textContent = n.done ? `Fixed ${n.done} problem${n.done > 1 ? 's' : ''}` : n.reveal ? `#${n.n} · hint` : !n.total ? 'All clear' : `#${n.n} · ${n.kind || 'error'}${n.title ? ` · ${n.title}` : ''}${n.fixed ? ' · fixed' : ''}`;
    // `name` in Max's text shows as code (escaped first, like tutor.js rich)
    $('#say').innerHTML = String(n.say ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`([^`\n]+)`/g, '<code>$1</code>');
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
  $('#log').onclick = () => window.max.calloutAct('log');
  $('#reveal').onclick = () => window.max.calloutAct('reveal');
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
