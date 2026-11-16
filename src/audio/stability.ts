import { centsBetween, median } from "../tuning/notes";
export interface PitchReading {
  frequency: number;
  stable: boolean;
  count: number;
  spread: number;
}
export class PitchTracker {
  private history: number[] = [];
  private lastSignal = -Infinity;
  reset(): void {
    this.history = [];
    this.lastSignal = -Infinity;
  }
  push(frequency: number | null, now: number): void {
    if (
      frequency !== null &&
      Number.isFinite(frequency) &&
      frequency >= 55 &&
      frequency <= 1000
    ) {
      if (
        now - this.lastSignal > 200 ||
        (this.history.length &&
          Math.abs(centsBetween(frequency, median(this.history))) > 70)
      )
        this.history = [];
      this.history.push(frequency);
      if (this.history.length > 8) this.history.shift();
      this.lastSignal = now;
    } else if (now - this.lastSignal > 200) this.reset();
  }
  reading(now: number): PitchReading | null {
    if (!this.history.length || now - this.lastSignal > 200) return null;
    const last = this.history.slice(-6);
    const spread = Math.abs(centsBetween(Math.max(...last), Math.min(...last)));
    return {
      frequency: median(this.history.slice(-5)),
      stable: last.length >= 6 && spread < 10,
      count: this.history.length,
      spread,
    };
  }
}
