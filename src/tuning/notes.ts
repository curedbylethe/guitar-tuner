const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(note: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (!match) throw new RangeError(`Invalid note: ${note}`);
  return 12 * (Number(match[3]) + 1) + SEMITONES[match[1]!]! + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}
export function midiToFrequency(midi: number): number { return 440 * 2 ** ((midi - 69) / 12); }
export function centsBetween(frequency: number, target: number): number { return 1200 * Math.log2(frequency / target); }
export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
export function formatCents(cents: number): string {
  return (cents > 0.5 ? '+' : cents < -0.5 ? '−' : '±') + Math.abs(cents).toFixed(0) + '¢';
}
