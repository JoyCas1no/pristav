// ---------- фоновая музыка: процедурная, WebAudio, без файлов ----------
// Минорный «канцелярский джаз»: бас, арпеджио, редкая мелодия на пентатонике, шумовой метроном.
// Включается после первого касания (как и звуки); в суде темп выше (mood = 1).
const Music = {
  on: false, mood: 0, step: 0, next: 0, timer: 0, master: null,
  BARS: [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60], [40, 56, 59, 64], [45, 57, 60, 64]],
  PENT: [69, 72, 74, 76, 79, 81],
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  start() {
    const c = Snd.ctx; if (this.on || !settings.music || !c) return;
    if (!this.master) { this.master = c.createGain(); this.master.gain.value = .5; this.master.connect(c.destination); }
    this.on = true; this.next = c.currentTime + .15; this.timer = setInterval(() => this.pump(), 120);
  },
  stop() { this.on = false; clearInterval(this.timer); },
  sync() { if (settings.music) this.start(); else this.stop(); },
  eighth() { return 60 / (this.mood ? 112 : 88) / 2; },
  note(m, t, dur, type, vol) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = this.hz(m);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + .05);
  },
  tick(t, vol, freq) {
    const c = Snd.ctx; if (!Snd.noiseBuf) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Snd.noiseBuf; f.type = "highpass"; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + .07);
  },
  pump() {
    const c = Snd.ctx; if (!c || !this.on) return;
    if (c.state !== "running") { this.next = c.currentTime + .1; return; }
    if (this.next < c.currentTime) this.next = c.currentTime + .05;
    while (this.next < c.currentTime + .4) { try { this.play(this.step++, this.next); } catch (e) {} this.next += this.eighth(); }
  },
  play(s, t) {
    const bar = Math.floor(s / 8) % 8, e = s % 8, ch = this.BARS[bar], d = this.eighth(), tense = this.mood === 1;
    if (e === 0) this.note(ch[0] - 12, t, d * 3.6, "triangle", .2);
    else if (e === 4) this.note(ch[0] - 5, t, d * 3, "triangle", .13);
    else if (tense && (e === 2 || e === 6)) this.note(ch[0] - 12, t, d * 1.2, "triangle", .09);
    const arp = [1, 2, 3, 2, 1, 3, 2, 3][e];
    if (tense || e % 2 === 0) this.note(ch[arp] + 12, t, d * 1.6, "triangle", tense ? .06 : .045);
    const h = (bar * 7 + e * 13 + (bar > 3 ? 3 : 0)) % 11;
    if (h < (tense ? 5 : 3)) this.note(this.PENT[(h + bar) % 6], t, d * 1.8, "sine", .075);
    if (e % 2 === 1) this.tick(t, tense ? .05 : .03, 6000);
    if (e === 2 || e === 6) this.tick(t, .05, 1800);
  }
};
document.addEventListener("visibilitychange", () => { const c = Snd.ctx; if (!c) return; if (document.hidden) c.suspend(); else if (settings.sound || settings.music) c.resume(); });
