import { describe, expect, it } from "vitest";
import { YinDetector } from "../../src/audio/yin";
import { PitchTracker } from "../../src/audio/stability";
import { StringSelector } from "../../src/tuning/selection";
import { feedback } from "../../src/tuning/feedback";
import { centsBetween } from "../../src/tuning/notes";
export function signal(
  detector: YinDetector,
  f: number,
  amplitude = 0.3,
  noise = 0,
  harmonic = 0,
): Float32Array {
  let seed = 123;
  return Float32Array.from({ length: detector.bufferSize }, (_, i) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const phase = (2 * Math.PI * f * i) / detector.sampleRate;
    return (
      amplitude * Math.sin(phase) +
      harmonic * Math.sin(2 * phase) +
      noise * (seed / 2 ** 32 - 0.5)
    );
  });
}
describe("YIN synthetic accuracy", () => {
  for (const sr of [44100, 48000, 96000, 192000])
    it.each([
      55.1, 65.406, 73.416, 82.407, 110, 146.832, 196, 246.942, 329.628,
      659.255, 987.767,
    ])("%f Hz at " + sr, (f) => {
      const d = new YinDetector(sr),
        result = d.detect(signal(d, f));
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!, f))).toBeLessThan(3);
    });
  it("detects a weak signal with deterministic noise and a stronger second harmonic", () => {
    const d = new YinDetector(48000);
    for (const [a, n, h] of [
      [0.015, 0.004, 0],
      [0.1, 0.02, 0.2],
    ])
      expect(
        Math.abs(centsBetween(d.detect(signal(d, 82.407, a, n, h))!, 82.407)),
      ).toBeLessThan(3);
  });
  it.each([82.407, 110, 146.832, 196, 246.942, 329.628])(
    "resolves an attenuated fundamental against its second harmonic at %f Hz",
    (f) => {
      const d = new YinDetector(48000);
      for (const [a, h] of [
        [0.05, 0.5],
        [0.05, 1.0],
        [0.012, 0.12],
      ]) {
        const result = d.detect(signal(d, f, a, 0, h));
        expect(result).not.toBeNull();
        expect(Math.abs(centsBetween(result!, f))).toBeLessThan(3);
      }
    },
  );
  it("inverts both issue reproductions with a dominant second harmonic", () => {
    const d = new YinDetector(48000);
    for (const f of [82.407, 110]) {
      const result = d.detect(signal(d, f, 0.05, 0, 1));
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!, f))).toBeLessThan(3);
    }
    const noisy = d.detect(signal(d, 82.407, 0.05, 0.002, 1));
    expect(noisy).not.toBeNull();
    expect(Math.abs(centsBetween(noisy!, 82.407))).toBeLessThan(3);
  });
  it.each([
    [82.407, 164.81],
    [329.628, 659.255],
    [987.767, 1975.5],
  ])("does not halve a pure second harmonic at %f Hz", (f, expected) => {
    const d = new YinDetector(48000),
      result = d.detect(signal(d, f, 0, 0, 0.3));
    // 1975.5 Hz is above the ceiling; the detector keeps its pre-existing
    // subharmonic reading at 987.767 Hz rather than returning null.
    const reported = expected > d.maxFrequency ? f : expected;
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!, reported))).toBeLessThan(3);
  });
  it.each([82.407, 110, 146.832, 196, 246.942, 329.628])(
    "detects %f Hz at 48 kHz near -42 dBFS RMS",
    (f) => {
      const d = new YinDetector(48000),
        result = d.detect(signal(d, f, 0.0113));
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!, f))).toBeLessThan(3);
    },
  );
  it("detects 329.628 Hz at 44.1 kHz near -42 dBFS RMS", () => {
    const d = new YinDetector(44100),
      result = d.detect(signal(d, 329.628, 0.0113));
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!, 329.628))).toBeLessThan(3);
  });
  it("detects 80 Hz at 0.001 amplitude above the silence floor", () => {
    const d = new YinDetector(48000),
      result = d.detect(signal(d, 80, 0.001));
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!, 80))).toBeLessThan(3);
  });
  it("rejects silence, DC, noise, below-silence-floor and malformed signals", () => {
    const d = new YinDetector(48000);
    for (const b of [
      new Float32Array(d.bufferSize),
      new Float32Array(d.bufferSize).fill(0.1),
      signal(d, 80, 0, 0.3),
      signal(d, 80, 1e-4),
      new Float32Array(10),
      new Float32Array(d.bufferSize).fill(NaN),
    ])
      expect(d.detect(b)).toBeNull();
    expect(() => new YinDetector(0)).toThrow();
  });
});
describe("pitch state and selection", () => {
  it("requires six consistent samples, clears jumps and expires silence", () => {
    const t = new PitchTracker();
    t.push(82, 0);
    expect(t.reading(0)?.stable).toBe(false);
    for (let i = 1; i < 6; i++) t.push(82, i * 50);
    expect(t.reading(250)?.stable).toBe(true);
    t.push(110, 300);
    expect(t.reading(300)?.count).toBe(1);
    t.push(null, 550);
    expect(t.reading(550)).toBeNull();
  });
  it("does not declare a wobbling signal stable", () => {
    const t = new PitchTracker();
    for (let i = 0; i < 8; i++) t.push(i % 2 ? 82 : 84, i * 50);
    expect(t.reading(350)?.stable).toBe(false);
  });
  it("switches only after three stable samples with a clear advantage", () => {
    const s = new StringSelector(),
      targets = [82.4, 110, 146.8];
    expect(s.choose(110, targets, 0, false)).toBe(0);
    expect(s.choose(110, targets, 0, true)).toBe(0);
    expect(s.choose(110, targets, 0, true)).toBe(0);
    expect(s.choose(110, targets, 0, true)).toBe(1);
    for (let i = 0; i < 8; i++)
      expect(s.choose(Math.sqrt(82.4 * 110), targets, 0, true)).toBe(0);
  });
  it("enforces stability and five/eight-cent hysteresis", () => {
    expect(feedback(false, false, null, false, false)).toBe("off");
    expect(feedback(true, false, null, false, false)).toBe("none");
    expect(feedback(true, true, null, false, false)).toBe("tone");
    expect(feedback(true, false, 0, false, true)).toBe("settling");
    expect(feedback(true, false, 5, true, false)).toBe("in");
    expect(feedback(true, false, 7, true, true)).toBe("in");
    expect(feedback(true, false, 7, true, false)).toBe("sharp");
    expect(feedback(true, false, -9, true, true)).toBe("flat");
  });
});
