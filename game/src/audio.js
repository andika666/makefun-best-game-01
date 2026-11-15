// Sound effects and a small title jingle, all synthesized with WebAudio.
// No audio files are loaded; every sound is an oscillator or filtered noise.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.jingleTimer = null;
    this.jingleStep = 0;
    try {
      this.muted = window.localStorage.getItem('emberfield-muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Create the context on a user gesture (browsers require one). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem('emberfield-muted', this.muted ? '1' : '0');
    } catch {
      /* storage unavailable; mute still applies this session */
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** A short oscillator blip with a pitch slide and a decay envelope. */
  tone(freq, endFreq, duration, type, volume, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** A burst of filtered noise (whooshes, thuds, roars). */
  noise(duration, volume, filterFreq, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  shoot() {
    this.tone(880, 420, 0.09, 'square', 0.10);
  }
  hitEnemy() {
    this.tone(220, 140, 0.07, 'triangle', 0.12);
  }
  killEnemy() {
    this.tone(520, 90, 0.16, 'sawtooth', 0.10);
    this.noise(0.12, 0.08, 900);
  }
  pickup() {
    this.tone(1320, 1760, 0.07, 'sine', 0.09);
  }
  hurt() {
    this.tone(160, 60, 0.25, 'sawtooth', 0.20);
    this.noise(0.18, 0.14, 500);
  }
  dash() {
    this.noise(0.22, 0.16, 2400);
  }
  levelUp() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.14, i * 0.07));
  }
  bossRoar() {
    this.tone(90, 45, 0.7, 'sawtooth', 0.22);
    this.noise(0.7, 0.18, 300);
  }
  click() {
    this.tone(700, 700, 0.05, 'sine', 0.10);
  }
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.15, i * 0.12));
  }
  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, f * 0.94, 0.3, 'triangle', 0.15, i * 0.16));
  }

  /** Start the title jingle: a slow lantern melody, one note every 0.42 s. */
  startJingle() {
    if (!this.ctx || this.jingleTimer !== null) return;
    const melody = [392, 0, 523, 0, 659, 0, 523, 392, 0, 440, 0, 523, 587, 0, 659, 0];
    this.jingleStep = 0;
    this.jingleTimer = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const f = melody[this.jingleStep % melody.length];
      this.jingleStep++;
      if (f > 0) this.tone(f, f, 0.4, 'sine', 0.07);
    }, 420);
  }

  stopJingle() {
    if (this.jingleTimer !== null) {
      window.clearInterval(this.jingleTimer);
      this.jingleTimer = null;
    }
  }
}
