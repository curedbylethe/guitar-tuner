/** YIN's cumulative mean normalized difference. Detection is decided by the
 * normalized difference falling below 0.12, not by input level; a numeric
 * variance floor rejects only silence, DC and denormals.
 * Lag bounds scale with sample rate; a 1024-lag cap cannot see C2 at 96 kHz.
 * Two work buffers are reused: `difference` (cumulative mean, for threshold and
 * interpolation) and `raw` (unnormalized, for the octave extension). An extension
 * step doubles a basin lag when the raw difference drops clearly at that period.
 * The analysis window is ~43 ms plus one maximum period.
 */
const MIN_VARIANCE = 1e-8;
const RESIDUAL = 0.002;
const MARGIN = 0.001;
export class YinDetector {
  readonly minFrequency = 55;
  readonly maxFrequency = 1000;
  readonly window: number;
  readonly maxLag: number;
  readonly bufferSize: number;
  private readonly difference: Float32Array;
  private readonly raw: Float32Array;
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
    this.raw = new Float32Array(this.maxLag + 1);
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
      this.raw[lag] = sum;
      d[lag] = running ? (sum * lag) / running : 1;
    }
    const nd = (lag: number) => this.raw[lag]! / (2 * this.window * variance);
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
      let chosen = best;
      // The cumulative-mean `d` cannot be compared across lags, but the raw
      // difference can: when a weak fundamental hides behind its second harmonic,
      // the doubled lag fits far better. Doubling only, iterated; lowest notes
      // sit at the lag ceiling and skip this step.
      while (chosen * 2 <= this.maxLag - 1) {
        // Above three quarters of the range, doubling would leave the guitar band
        // and turn an out-of-range harmonic into a spurious low subharmonic.
        if (this.sampleRate / chosen > (this.maxFrequency * 3) / 4) break;
        const centre = chosen * 2;
        const from = Math.floor(centre * 0.92);
        const to = Math.min(this.maxLag - 1, Math.ceil(centre * 1.08));
        if (from > to) break;
        let candidate = from;
        for (let p = from; p <= to; p++)
          if (nd(p) < nd(candidate)) candidate = p;
        if (nd(chosen) < RESIDUAL) break;
        if (!(nd(candidate) <= nd(chosen) - MARGIN)) break;
        chosen = candidate;
      }
      const a = d[chosen - 1]!,
        b = d[chosen]!,
        c = d[chosen + 1]!;
      const denominator = a - 2 * b + c;
      const frequency =
        this.sampleRate /
        (chosen + (denominator ? (a - c) / (2 * denominator) : 0));
      return frequency >= this.minFrequency && frequency <= this.maxFrequency
        ? frequency
        : null;
    }
    return null;
  }
}
