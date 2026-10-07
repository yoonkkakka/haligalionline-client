// Fully synthesized background music via the Web Audio API — no audio
// files, no licensing questions, fits the "자체개발 엔진" approach. A short
// upbeat pentatonic loop (melody + simple root/fifth bass) scheduled with
// a lookahead timer so it doesn't drift like a naive setInterval would.
//
// Timbre choices matter a lot here: a low-register square wave reads as an
// alarm/horror-game drone, not "fun". Melody uses a soft triangle wave in a
// bright, high-ish register and the bass uses a warm sine — both read as
// cute/playful rather than ominous (confirmed against explicit user
// feedback that an earlier square-wave/low-register version sounded scary).

const NOTE_FREQS: Record<string, number> = {
  C3: 130.81,
  G3: 196.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
};

interface Step {
  melody: string | null;
  bass: string | null;
  dur: number; // seconds
}

// One bar of a bright, bouncy C-major-pentatonic skip (up, little hop, back
// down) with a warm root/fifth bass underneath — repeats indefinitely.
const STEPS: Step[] = [
  { melody: "C5", bass: "C3", dur: 0.18 },
  { melody: "E5", bass: null, dur: 0.18 },
  { melody: "G5", bass: null, dur: 0.18 },
  { melody: "E5", bass: null, dur: 0.18 },
  { melody: "A5", bass: "G3", dur: 0.18 },
  { melody: "G5", bass: null, dur: 0.18 },
  { melody: "E5", bass: null, dur: 0.18 },
  { melody: "D5", bass: null, dur: 0.18 },
];

const SCHEDULE_AHEAD = 0.2; // seconds
const SCHEDULER_INTERVAL_MS = 50;
const VOLUME = 0.12;

export class BackgroundMusic {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;
  private schedulerHandle: number | null = null;
  private playing = false;
  private muted: boolean;

  constructor(initiallyMuted = false) {
    this.muted = initiallyMuted;
  }

  start() {
    if (this.playing) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return; // no Web Audio support — silently skip, not fatal
    this.ctx = new Ctx();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.muted ? 0 : VOLUME;
    this.gainNode.connect(this.ctx.destination);
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.playing = true;
    this.stepIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  private scheduler = () => {
    if (!this.ctx || !this.playing) return;
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      const step = STEPS[this.stepIndex % STEPS.length];
      this.playStep(step, this.nextStepTime);
      this.nextStepTime += step.dur;
      this.stepIndex++;
    }
    this.schedulerHandle = window.setTimeout(this.scheduler, SCHEDULER_INTERVAL_MS);
  };

  private playStep(step: Step, time: number) {
    if (step.melody) this.pluck(step.melody, time, step.dur, "triangle", 0.5);
    if (step.bass) this.pluck(step.bass, time, step.dur * 4, "sine", 0.35);
  }

  private pluck(note: string, time: number, dur: number, type: OscillatorType, relativeVolume: number) {
    if (!this.ctx || !this.gainNode) return;
    const freq = NOTE_FREQS[note];
    if (!freq) return;
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Quick attack, exponential decay — a soft plucked/bell feel.
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(relativeVolume, time + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.9);
    osc.connect(envelope);
    envelope.connect(this.gainNode);
    osc.start(time);
    osc.stop(time + dur);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : VOLUME;
  }

  stop() {
    this.playing = false;
    if (this.schedulerHandle !== null) window.clearTimeout(this.schedulerHandle);
    this.schedulerHandle = null;
    this.ctx?.close();
    this.ctx = null;
  }
}
