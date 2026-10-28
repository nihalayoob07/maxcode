// Listening for "Max": the mic stays open in this window and bursts of sound go to main.js, where local Whisper checks
// whether they start with his name. Ported from the full app's ui/wake.js:
// - A short burst in a quiet room is checked once, as soon as it stops (0.35 s of quiet).
// - Over continuous sound (music, a video) there's never a gap, so the last 2 s are checked every 1.4 s instead.
// It pauses while Max listens to you (voice.js) or talks (tutor.js `playing`), so it never hears itself.
// ponytail: no echo canceller here (the full app subtracts the speakers' loopback); add aec.js if videos wake him.
'use strict';
(() => {
  let ctx = null, stream = null;
  async function start() {
    if (ctx) return;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch { return; }
    ctx = new AudioContext({ sampleRate: 16000 });
    const proc = ctx.createScriptProcessor(2048, 1, 1);
    ctx.createMediaStreamSource(stream).connect(proc);
    proc.connect(ctx.destination);
    const WINDOW = 16000 * 2, STRIDE_MS = 1400, MAX_BURST = 16000 * 6;
    let noise = 0.01, speaking = false, chunks = [], preroll = [], lastVoice = 0, startedAt = 0, lastCheck = 0, busy = false, long = false;
    const join = (list) => {
      const a = new Float32Array(list.reduce((n, c) => n + c.length, 0));
      let o = 0; for (const c of list) { a.set(c, o); o += c.length; }
      return a;
    };
    const check = (audio, sliding) => { busy = true; window.max.wake(audio.buffer, sliding).catch(() => {}).finally(() => { busy = false; }); };
    proc.onaudioprocess = (e) => {
      if (document.body.classList.contains('listening') || playing.length) { speaking = false; chunks = []; return; }
      const d = new Float32Array(e.inputBuffer.getChannelData(0));
      let sum = 0; for (const v of d) sum += v * v;
      const rms = Math.sqrt(sum / d.length);
      const threshold = Math.max(0.015, noise * 3), now = performance.now();
      if (!speaking) {
        noise = noise * 0.97 + rms * 0.03;
        preroll.push(d); if (preroll.length > 4) preroll.shift();
        if (rms > threshold) { speaking = true; long = false; chunks = [...preroll]; lastVoice = startedAt = lastCheck = now; }
        return;
      }
      chunks.push(d);
      if (rms > threshold) lastVoice = now;
      let total = chunks.reduce((n, c) => n + c.length, 0);
      while (total > MAX_BURST) { total -= chunks.shift().length; long = true; }
      if (now - lastVoice >= 350) {
        speaking = false;
        if (!busy && !long && now - startedAt >= 300) check(join(chunks));
        chunks = [];
        return;
      }
      if (now - startedAt > 2000 && now - lastCheck >= STRIDE_MS && !busy) {
        lastCheck = now;
        const win = [];
        for (let i = chunks.length - 1, n = 0; i >= 0 && n < WINDOW; i--) { win.unshift(chunks[i]); n += chunks[i].length; }
        check(join(win), true);
      }
    };
  }
  function stop() {
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close();
    ctx = stream = null;
  }
  window.max.onWakePref((on) => (on ? start() : stop()));
  window.max.prefs().then((p) => p.wake && start());
})();
