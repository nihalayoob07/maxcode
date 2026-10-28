// Talking to Max: the mic button (or the call shortcut pressed again with the panel open) records until you stop
// talking, ElevenLabs turns it into text (main.js), and main.js sends it where it belongs: the tutor's own commands,
// a new lesson or debug, or a question about the code on screen. Max answers out loud through tutor.js say().
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
    if (!await window.max.hasVoiceKey()) { toast('Add an ElevenLabs key in Settings to talk to Max.'); return window.max.openSettings(); }
    stopVoice();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch {
      return toast("I can't reach your microphone. Check Windows' microphone privacy settings.");
    }
    // Stops by itself 1.4 s after you stop talking (or after 6 s of nothing, or 20 s in all).
    const ctx = new AudioContext(), meter = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(meter);
    const wave = new Uint8Array(meter.fftSize), t0 = Date.now();
    let spoke = false, quiet = Date.now();
    const chunks = [];
    rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    rec.ondataavailable = (e) => chunks.push(e.data);
    const tick = setInterval(() => {
      meter.getByteTimeDomainData(wave);
      let peak = 0;
      for (const v of wave) peak = Math.max(peak, Math.abs(v - 128));
      if (peak > 12) { spoke = true; quiet = Date.now(); }
      if ((spoke && Date.now() - quiet > 1400) || (!spoke && Date.now() - t0 > 6000) || Date.now() - t0 > 20000) rec?.stop();
    }, 100);
    rec.onstop = async () => {
      clearInterval(tick);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      rec = null;
      if (!spoke) { state(''); return toast("I didn't hear anything."); }
      state('hearing');
      try {
        const text = await window.max.transcribe(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer());
        if (!text) return toast("I didn't catch that.");
        toast(`“${text}”`);
        await window.max.heard(text, !!S.kind && $('#home').hidden);
      } catch (e) { toast(clean(e)); } finally { state(''); }
    };
    rec.start();
    state('listening');
  }
  $('#mic').onclick = listen;
  window.max.onListen(listen);
})();
