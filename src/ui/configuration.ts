import {
  GROUPS,
  TUNINGS,
  supportedReference,
  type Tuning,
} from "../tuning/presets";
import type { Settings } from "../state/settings";
import { formatCents, centsBetween, midiToFrequency } from "../tuning/notes";
import type { PitchReading } from "../audio/stability";
import { element, text } from "./dom";
export const desktop = (): boolean => matchMedia("(min-width:960px)").matches;
export const automatic = (state: Settings): boolean =>
  state.auto && !(state.mode === "custom" && !state.ref);
export function syncToggle(): void {
  element("#tuning-toggle").setAttribute(
    "aria-expanded",
    String(desktop() || !element("#tuning-panel").classList.contains("closed")),
  );
}
export function closePanel(): void {
  if (!desktop()) {
    element("#tuning-panel").classList.add("closed");
    syncToggle();
    element("#tuning-toggle").focus();
  }
}
export function buildConfiguration(): void {
  element("#panel-preset").innerHTML = GROUPS.map(
    (group) =>
      `<div class="group"><h3>${group.name}</h3><div class="list" role="radiogroup" aria-label="${group.name}">` +
      group.tunings
        .map(
          (t) =>
            `<label class="row"><input type="radio" name="preset" value="${t.id}"><span class="mark-r" aria-hidden="true"></span><span class="name">${t.name}</span><span class="notes">${t.notes.join(" ").replace(/\d/g, "")}</span></label>`,
        )
        .join("") +
      "</div></div>",
  ).join("");
  element("#base").innerHTML = TUNINGS.map(
    (t) =>
      `<option value="${t.id}">${t.name} — ${t.notes.join(" ").replace(/\d/g, "")}</option>`,
  ).join("");
  element("#stages").innerHTML = [
    "Select a string",
    "Wait for a stable reading",
    "Record the reference",
    "Tune the rest",
  ]
    .map(
      (title, i) =>
        `<li data-st="todo"><span class="k">0${i + 1}</span><span class="t">${title}</span><span class="w"></span><span class="s"></span></li>`,
    )
    .join("");
}
export function buildStrings(tuning: Tuning, targets: readonly number[]): void {
  element("#custom-string").innerHTML = tuning.notes
    .map((note, i) => `<option value="${i}">String ${6 - i} · ${note}</option>`)
    .join("");
  element("#strings").innerHTML = tuning.notes
    .map(
      (note, i) =>
        `<button type="button" class="str" data-i="${i}"><span class="r1"><span class="n">${6 - i}</span><span class="tag"></span></span><span class="note">${note}</span><span class="r3"><span>${targets[i]!.toFixed(1)} Hz</span><span class="done" aria-hidden="true"></span></span></button>`,
    )
    .join("");
}
export function renderConfiguration(
  state: Settings,
  tuning: Tuning,
  targets: readonly number[],
  tuned: ReadonlySet<number>,
): void {
  element<HTMLInputElement>(`input[name=mode][value=${state.mode}]`).checked =
    true;
  element<HTMLInputElement>(
    `input[name=preset][value=${state.preset}]`,
  ).checked = true;
  element<HTMLSelectElement>("#base").value = state.base;
  element("#panel-preset").hidden = state.mode !== "preset";
  element("#panel-custom").hidden = state.mode !== "custom";
  element("#custom-strip").hidden = state.mode !== "custom";
  const noReference = state.mode === "custom" && !state.ref;
  element<HTMLInputElement>("#auto").disabled = noReference;
  element<HTMLInputElement>("#auto").checked = automatic(state);
  text(
    "auto-label",
    noReference
      ? "Automatic detection: off until a reference is recorded"
      : `Automatic detection: ${automatic(state) ? "on" : "off"}`,
  );
  element<HTMLButtonElement>("#clr").disabled = !state.ref;
  text("note", tuning.notes[state.sel]!);
  text("target", targets[state.sel]!.toFixed(2) + " Hz");
  text("rec", `Record string ${6 - state.sel} as reference`);
  element<HTMLSelectElement>("#custom-string").value = String(state.sel);
  document
    .querySelectorAll(".js-name")
    .forEach((node) => (node.textContent = tuning.name));
  document
    .querySelectorAll(".js-notes")
    .forEach(
      (node) =>
        (node.textContent =
          tuning.notes.join(" ").replace(/\d/g, "") +
          (state.mode === "custom"
            ? state.ref
              ? " · relative"
              : " · custom"
            : "")),
    );
  element("#strings")
    .querySelectorAll<HTMLButtonElement>(".str")
    .forEach((button, i) => {
      const selected = i === state.sel,
        reference = state.mode === "custom" && state.ref?.i === i;
      button.classList.toggle("on", selected);
      button.classList.toggle("tuned", tuned.has(i));
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector(".tag")!.textContent = selected
        ? "Selected"
        : reference
          ? "Reference"
          : "";
      button.setAttribute(
        "aria-label",
        `String ${6 - i}, ${tuning.notes[i]}, ${targets[i]!.toFixed(1)} hertz${selected ? ", selected" : ""}${tuned.has(i) ? ", in tune" : ""}${reference ? ", reference" : ""}`,
      );
    });
}
export function renderCustom(
  state: Settings,
  tuning: Tuning,
  reading: PitchReading | null,
  live: boolean,
  tone: boolean,
  simulated: boolean,
): void {
  const supported =
    !reading ||
    supportedReference(tuning, { i: state.sel, f: reading.frequency });
  const canRecord =
    !!reading?.stable && supported && !tone && live && !simulated;
  element<HTMLButtonElement>("#rec").disabled = !canRecord;
  const reason = !supported
    ? "This reference would put a string outside the supported 55–1000 Hz range."
    : simulated
      ? "Reference recording is unavailable in simulation."
      : !live
        ? "Record is off until the microphone is listening."
        : tone
          ? "Record is off while the reference tone plays."
          : !reading
            ? "Record is off until a string is heard. Pluck it and let it ring."
            : canRecord
              ? ""
              : "Record is off until the reading is stable. Keep the string ringing.";
  text("rec-why", state.mode === "custom" ? reason : "");
  if (state.mode !== "custom") return;
  const done = [true, !!state.ref || canRecord, !!state.ref, false],
    current = done.indexOf(false);
  const details = [
    `String ${6 - state.sel} (${tuning.notes[state.sel]}) selected. Pick another in Strings to change it.`,
    state.ref
      ? "Reading was stable when recorded."
      : canRecord
        ? `Stable at ${reading!.frequency.toFixed(2)} Hz.`
        : reason,
    state.ref
      ? `String ${6 - state.ref.i} recorded at ${state.ref.f.toFixed(2)} Hz, ${formatCents(centsBetween(state.ref.f, midiToFrequency(tuning.midi[state.ref.i]!)))} from A4 = 440 pitch.`
      : "Press Record reference.",
    state.ref
      ? "Tune each string to its target. Clear the reference to start over."
      : "Unlocks after the reference is recorded.",
  ];
  const titles = [
    "Select a string",
    "Wait for a stable reading",
    "Record the reference",
    "Tune the rest",
  ];
  text(
    "step-now",
    `Step ${current + 1} of 4 · ${titles[current]}. ${details[current]}`,
  );
  element("#stages")
    .querySelectorAll<HTMLElement>("li")
    .forEach((li, i) => {
      li.dataset.st = done[i] ? "done" : i === current ? "now" : "todo";
      const word = done[i] ? "Done" : i === current ? "Now" : "Next";
      if (li.querySelector(".w")!.textContent !== word)
        li.querySelector(".w")!.textContent = word;
      if (li.querySelector(".s")!.textContent !== details[i])
        li.querySelector(".s")!.textContent = details[i]!;
    });
}
