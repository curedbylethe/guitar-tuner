/** A separate short-lived context makes tone cleanup independent of microphone ownership. */
export class ReferenceTone {
  active = false;
  private generation = 0;
  private context: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  constructor(private readonly changed: () => void, private readonly failed: (message: string) => void,
    private readonly createContext: () => AudioContext = () => new AudioContext()) {}
  async play(frequency: number): Promise<void> {
    this.stop();
    const generation = ++this.generation;
    this.active = true; this.changed();
    try {
      const context = this.createContext(); this.context = context;
      await context.resume();
      if (generation !== this.generation) return;
      const now = context.currentTime, duration = 2.4;
      const envelope = context.createGain(); this.gains.push(envelope);
      envelope.gain.setValueAtTime(0.0001,now); envelope.gain.exponentialRampToValueAtTime(0.4,now+0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001,now+duration); envelope.connect(context.destination);
      for (const [type, multiplier, volume] of [['triangle',1,1],['sine',2,0.3]] as const) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type; oscillator.frequency.value = frequency*multiplier; gain.gain.value = volume;
        oscillator.connect(gain); gain.connect(envelope);
        this.oscillators.push(oscillator); this.gains.push(gain);
        oscillator.onended = () => { if (generation === this.generation) this.stop(); };
        oscillator.start(now); oscillator.stop(now+duration);
      }
    } catch { if (generation === this.generation) { this.stop(); this.failed('Reference tone could not be played. Try again in a supported browser.'); } }
  }
  stop(): void {
    ++this.generation;
    for (const oscillator of this.oscillators) { oscillator.onended = null; try { oscillator.stop(); } catch { /* Already stopped by its scheduled end. */ } oscillator.disconnect(); }
    this.gains.forEach(gain => gain.disconnect()); this.oscillators = []; this.gains = [];
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.active = false; this.changed();
  }
}
