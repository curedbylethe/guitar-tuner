import { midiToFrequency, noteToMidi } from './notes';
export interface Tuning { readonly id: string; readonly name: string; readonly notes: readonly string[]; readonly midi: readonly number[] }
export interface Reference { readonly i: number; readonly f: number }
const definitions = [
  ['Standard and drop', [
    ['standard', 'Standard', 'E2 A2 D3 G3 B3 E4'],
    ['drop-d', 'Drop D', 'D2 A2 D3 G3 B3 E4'],
    ['double-drop-d', 'Double drop D', 'D2 A2 D3 G3 B3 D4'],
  ]],
  ['Open', [
    ['open-d', 'Open D', 'D2 A2 D3 F#3 A3 D4'], ['open-g', 'Open G', 'D2 G2 D3 G3 B3 D4'],
    ['open-e', 'Open E', 'E2 B2 E3 G#3 B3 E4'], ['open-a', 'Open A', 'E2 A2 E3 A3 C#4 E4'],
    ['open-c', 'Open C', 'C2 G2 C3 G3 C4 E4'],
  ]],
  ['Alternate', [
    ['dadgad', 'DADGAD', 'D2 A2 D3 G3 A3 D4'], ['half-down', 'Half step down', 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4'],
    ['full-down', 'Full step down', 'D2 G2 C3 F3 A3 D4'],
  ]],
] as const;
export const GROUPS = definitions.map(([name, items]) => ({ name, tunings: items.map(([id, title, text]): Tuning => {
  const notes = text.split(' '); return { id, name: title, notes, midi: notes.map(noteToMidi) };
}) }));
export const TUNINGS = GROUPS.flatMap(group => group.tunings);
export function getTuning(id: string): Tuning { return TUNINGS.find(tuning => tuning.id === id) ?? TUNINGS[0]!; }
export function frequencies(tuning: Tuning, reference: Reference | null = null): number[] {
  return tuning.midi.map(note => reference ? reference.f * 2 ** ((note - tuning.midi[reference.i]!) / 12) : midiToFrequency(note));
}
/** Relative tuning must keep every target inside the detector's supported range. */
export function supportedReference(tuning: Tuning, reference: Reference): boolean {
  return Number.isInteger(reference.i) && reference.i >= 0 && reference.i < tuning.notes.length &&
    Number.isFinite(reference.f) && frequencies(tuning,reference).every(f => f >= 55 && f <= 1000);
}
