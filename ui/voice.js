// Talking to Max: the mic button, the Talk to Max shortcut, or "Max" (wake.js) records until you stop talking,
// main.js turns it into text (local Whisper, or ElevenLabs with a key) and sends it where it belongs: the tutor's own
// commands, a new lesson or debug, or a question about the code on screen. Max answers out loud through tutor.js say().
'use strict';
(() => {
  const clean = (e) => String(e?.message || e).replace(/^Error invoking remote method '\w+': (Error: )?/, '');
  $('#mute').insertAdjacentHTML('beforebegin', `<button class="icon" id="mic" title="Talk to Max" aria-label="Talk to Max">
    <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button>`);
  document.body.insertAdjacentHTML('beforeend', '<div class="heard" id="heard" hidden></div>');

  let toastTimer = null;
  function toast(text) {
    $('#heard').textContent = text;
    $('#heard').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#heard').hidden = true; }, 4000);
  }
  function state(s) {   // '' | listening | hearing
    $('#mic').className = `icon ${s}`;
    $('#mic').title = s === 'listening' ? 'Listening… click to stop' : 'Talk to Max';
    document.body.classList.toggle('listening', s === 'listening');
  }

  let rec = null;
  async function listen() {
    if (rec) return rec.stop();   // a second click: done talking
    stopVoice();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch {
      return toast("I can't reach your microphone. Check Windows' microphone privacy settings.");
    }
    // 16 kHz samples, as Whisper wants them. Stops by itself 1.4 s after you stop talking (or after 6 s of nothing,
    // or 20 s in all).
    const ctx = new AudioContext({ sampleRate: 16000 }), proc = ctx.createScriptProcessor(2048, 1, 1);
    ctx.createMediaStreamSource(stream).connect(proc);
    proc.connect(ctx.destination);
    const chunks = [], t0 = Date.now();
    let spoke = false, quiet = Date.now(), noise = 0.01, done = false;
    async function finish() {
      if (done) return;
      done = true;
      proc.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      rec = null;
      if (!spoke) { state(''); return toast("I didn't hear anything."); }
      state('hearing');
      const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      try {
        const text = await window.max.transcribe(all.buffer);
        if (!text) return toast("I didn't catch that.");
        toast(`“${text}”`);
        await window.max.heard(text, !!S.kind && $('#home').hidden);
      } catch (e) { toast(clean(e)); } finally { state(''); }
    }
    proc.onaudioprocess = (e) => {
      if (done) return;
      const d = new Float32Array(e.inputBuffer.getChannelData(0));
      chunks.push(d);
      let sum = 0; for (const v of d) sum += v * v;
      const rms = Math.sqrt(sum / d.length);
      if (rms > Math.max(0.015, noise * 3)) { spoke = true; quiet = Date.now(); } else if (!spoke) noise = noise * 0.9 + rms * 0.1;
      if ((spoke && Date.now() - quiet > 1400) || (!spoke && Date.now() - t0 > 6000) || Date.now() - t0 > 20000) finish();
    };
    rec = { stop: finish };
    state('listening');
  }
  $('#mic').onclick = listen;
  window.max.onListen(listen);
  // "Max, teach me Rust": the rest of what was said (local Whisper, main.js) goes straight in.
  window.max.onWakeWords((text) => { toast(`“${text}”`); window.max.heard(text, !!S.kind && $('#home').hidden).catch((e) => toast(clean(e))); });
  window.max.onSay((text) => say(text));
})();
