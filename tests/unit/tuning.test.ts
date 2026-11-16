import { describe, expect, it } from "vitest";
import {
  centsBetween,
  median,
  midiToFrequency,
  noteToMidi,
  octaveAmbiguous,
} from "../../src/tuning/notes";
import {
  frequencies,
  getTuning,
  TUNINGS,
  supportedReference,
} from "../../src/tuning/presets";
import {
  defaults,
  readSettings,
  writeSettings,
} from "../../src/state/settings";
describe("tuning domain", () => {
  it.each([
    ["A4", 69],
    ["E2", 40],
    ["Eb2", 39],
    ["F#3", 54],
    ["C-1", 0],
    ["C10", 132],
  ])("parses %s", (note, midi) => expect(noteToMidi(note)).toBe(midi));
  it("rejects invalid names", () => expect(() => noteToMidi("H2")).toThrow());
  it("calculates reference frequencies and cents", () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(40)).toBeCloseTo(82.4069, 4);
    expect(centsBetween(880, 440)).toBe(1200);
    expect(centsBetween(440 * 2 ** (-5 / 1200), 440)).toBeCloseTo(-5, 8);
  });
  it.each([1200, -1200, 1180, -1220])(
    "treats %i cents as octave-ambiguous",
    (cents) => expect(octaveAmbiguous(cents)).toBe(true),
  );
  it.each([0, 700, 1150, 1250, 2400, -2400])(
    "treats %i cents as unambiguous",
    (cents) => expect(octaveAmbiguous(cents)).toBe(false),
  );
  it("keeps six strings ordered low to high in every preset", () => {
    expect(TUNINGS).toHaveLength(11);
    for (const tuning of TUNINGS) {
      expect(tuning.notes).toHaveLength(6);
      expect([...tuning.midi].sort((a, b) => a - b)).toEqual(tuning.midi);
    }
    expect(getTuning("standard").notes).toEqual([
      "E2",
      "A2",
      "D3",
      "G3",
      "B3",
      "E4",
    ]);
  });
  it("anchors relative tuning to any reference string", () => {
    const f = frequencies(getTuning("standard"), { i: 1, f: 100 });
    expect(f[1]).toBe(100);
    expect(centsBetween(f[5]!, f[0]!)).toBeCloseTo(2400, 8);
    expect(median([80, 81, 500, 82])).toBe(81.5);
  });
});
it("rejects references that move other strings outside the detector range", () => {
  expect(supportedReference(getTuning("standard"), { i: 0, f: 400 })).toBe(
    false,
  );
  expect(supportedReference(getTuning("standard"), { i: 5, f: 55 })).toBe(
    false,
  );
  expect(supportedReference(getTuning("standard"), { i: 1, f: 110 })).toBe(
    true,
  );
});
describe("settings boundary", () => {
  const storage = (text: string) => ({
    getItem: () => text,
    setItem: () => {},
  });
  it.each([
    "null",
    "[]",
    "bad",
    '{"mode":"invalid","sel":1.5,"ref":{"i":8,"f":80}}',
    '{"ref":{"i":0,"f":1e999},"auto":"false"}',
  ])("validates %s", (text) =>
    expect(readSettings(storage(text))).toEqual(defaults()),
  );
  it("loads valid settings", () =>
    expect(
      readSettings(
        storage(
          JSON.stringify({
            ...defaults(),
            mode: "custom",
            ref: { i: 0, f: 80 },
          }),
        ),
      ),
    ).toMatchObject({ mode: "custom", ref: { i: 0, f: 80 } }));
  it("handles unavailable storage", () => {
    const broken = {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    };
    expect(readSettings(broken)).toEqual(defaults());
    expect(() => writeSettings(broken, defaults())).not.toThrow();
  });
});
