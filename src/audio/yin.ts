/** YIN's cumulative mean normalized difference. Detection is decided by the
 * normalized difference falling below 0.12, not by input level; a numeric
 * variance floor rejects only silence, DC and denormals.
 * Lag bounds scale with sample rate; a 1024-lag cap cannot see C2 at 96 kHz.
 * Work buffers are reused. The analysis window is ~43 ms plus one maximum period.
 */
const MIN_VARIANCE = 1e-8;
export class YinDetector {
  readonly minFrequency = 55;
  readonly maxFrequency = 1000;
  readonly window: number;
  readonly maxLag: number;
  readonly bufferSize: number;
  private readonly difference: Float32Array;
  constructor(readonly sampleRate: number) {
    if (
      !Number.isFinite(sampleRate) ||
      sampleRate < 8000 ||
      sampleRate > 192000
    )
      throw new RangeError("Unsupported sample rate");
    this.window = Math.ceil((sampleRate * 2048) / 48000);
    this.maxLag = Math.ceil(sampleRate / this.minFrequency) + 1;
    this.bufferSize = 2 ** Math.ceil(Math.log2(this.window + this.maxLag + 1));
    this.difference = new Float32Array(this.maxLag + 1);
  }
  detect(buffer: Float32Array): number | null {
    if (buffer.length < this.window + this.maxLag + 1) return null;
    let energy = 0,
      mean = 0;
    for (let i = 0; i < this.window + this.maxLag; i++) {
      const sample = buffer[i]!;
      if (!Number.isFinite(sample)) return null;
      if (i < this.window) {
        energy += sample * sample;
        mean += sample;
      }
    }
    // DC offsets are not a signal; use variance rather than raw RMS.
    // Numeric silence floor only: rejects zero, DC and denormals, not quiet strings.
    const variance = Math.max(0, energy / this.window - (mean / this.window) ** 2);
    if (variance < MIN_VARIANCE) return null;
    const d = this.difference;
    let running = 0;
    d[0] = 1;
    for (let lag = 1; lag <= this.maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < this.window; i++) {
        const delta = buffer[i]! - buffer[i + lag]!;
        sum += delta * delta;
      }
      running += sum;
      d[lag] = running ? (sum * lag) / running : 1;
    }
    for (
      let lag = Math.max(2, Math.floor(this.sampleRate / this.maxFrequency));
      lag < this.maxLag;
      lag++
    ) {
      if (d[lag]! >= 0.12) continue;
      // Search the first threshold basin rather than stopping at the first tiny
      // local rise: weak/noisy input can otherwise bias the period by many cents.
      const end = Math.min(this.maxLag - 1, Math.ceil(lag * 1.25));
      let best = lag;
      for (let candidate = lag + 1; candidate <= end; candidate++)
        if (d[candidate]! < d[best]!) best = candidate;
      lag = best;
      const a = d[lag - 1]!,
        b = d[lag]!,
        c = d[lag + 1]!;
      const denominator = a - 2 * b + c;
      const frequency =
        this.sampleRate /
        (lag + (denominator ? (a - c) / (2 * denominator) : 0));
      return frequency >= this.minFrequency && frequency <= this.maxFrequency
        ? frequency
        : null;
    }
    return null;
  }
}
