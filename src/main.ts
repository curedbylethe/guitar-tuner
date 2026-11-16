import { Microphone } from "./audio/microphone";
import { ReferenceTone } from "./audio/tone";
import { PitchTracker, type PitchReading } from "./audio/stability";
import {
  defaults,
  readSettings,
  writeSettings,
  type SettingsStorage,
} from "./state/settings";
import { frequencies, getTuning, supportedReference } from "./tuning/presets";
import { centsBetween } from "./tuning/notes";
import { feedback } from "./tuning/feedback";
import { StringSelector } from "./tuning/selection";
import { element, showError } from "./ui/dom";
import {
  automatic,
  buildConfiguration,
  buildStrings,
  closePanel,
  renderConfiguration,
  renderCustom,
  syncToggle,
} from "./ui/configuration";
import { Meter } from "./ui/meter";

let storage: SettingsStorage | null = null;
try {
  storage = localStorage;
} catch {
  /* Safari/private policies can disable access itself. */
}
const state = storage ? readSettings(storage) : defaults();
const tracker = new PitchTracker(),
  selector = new StringSelector(),
  tuned = new Set<number>();
const meter = new Meter();
let latched = false,
  animation = 0,
  analysisTimer = 0;
const tuning = () =>
  getTuning(state.mode === "preset" ? state.preset : state.base);
const targets = () =>
  frequencies(tuning(), state.mode === "custom" ? state.ref : null);
const save = () => {
  if (storage) writeSettings(storage, state);
};
const reset = () => {
  tracker.reset();
  selector.reset();
  latched = false;
};
const mic = new Microphone(() => {
  const button = element<HTMLButtonElement>("#mic");
  button.textContent =
    mic.status === "listening"
      ? "Stop microphone"
      : mic.status === "requesting"
        ? "Cancel microphone request"
        : "Start microphone";
  button.classList.toggle("primary", mic.status === "off");
  if (mic.status === "off") {
    reset();
    tuned.clear();
  }
}, showError);
const tone = new ReferenceTone(reset, showError);
const simulations: Record<string, number | null> = {
  flat: -12,
  sharp: 19,
  in: 1,
  beyond: -63,
  settling: -12,
  none: null,
};
const simulation = new URLSearchParams(location.search).get("state");
const simulated = simulation !== null && Object.hasOwn(simulations, simulation);
function refresh(): void {
  reset();
  tuned.clear();
  tone.stop();
  save();
  buildStrings(tuning(), targets());
  renderConfiguration(state, tuning(), targets(), tuned);
}
function reading(now: number): PitchReading | null {
  if (!simulated) return tracker.reading(now);
  const cents = simulations[simulation!];
  return cents === null || cents === undefined
    ? null
    : {
        frequency: targets()[state.sel]! * 2 ** (cents / 1200),
        stable: simulation !== "settling",
        count: simulation === "settling" ? 2 : 8,
        spread: simulation === "settling" ? 99 : 0,
      };
}
function analyze(): void {
  const now = performance.now();
  if (mic.status === "listening" && !tone.active) {
    tracker.push(mic.sample(), now);
    const pitch = tracker.reading(now);
    if (pitch && automatic(state)) {
      const selected = selector.choose(
        pitch.frequency,
        targets(),
        state.sel,
        pitch.stable,
      );
      if (selected !== state.sel) {
        state.sel = selected;
        latched = false;
        save();
      }
    }
  }
}
function frame(now: number): void {
  animation = requestAnimationFrame(frame);
  const live = mic.status === "listening" || simulated;
  const pitch = live && !tone.active ? reading(now) : null;
  const cents = pitch
    ? centsBetween(pitch.frequency, targets()[state.sel]!)
    : 0;
  const status = feedback(
    live,
    tone.active,
    pitch ? cents : null,
    !!pitch?.stable,
    latched,
  );
  latched = status === "in";
  if (status === "in") tuned.add(state.sel);
  else if (status === "flat" || status === "sharp") tuned.delete(state.sel);
  renderConfiguration(state, tuning(), targets(), tuned);
  renderCustom(state, tuning(), pitch, live, tone.active, simulated);
  meter.render(
    status,
    tuning().notes[state.sel]!,
    pitch?.frequency ?? null,
    cents,
    tone.active
      ? "Reference tone"
      : simulated
        ? "Simulation"
        : mic.status === "listening"
          ? "Live input · microphone"
          : mic.status === "requesting"
            ? "Waiting for permission"
            : "Idle",
  );
}
buildConfiguration();
refresh();
element("#strings").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>(".str");
  if (!button) return;
  state.sel = Number(button.dataset.i);
  state.auto = false;
  reset();
  tone.stop();
  save();
});
element<HTMLSelectElement>("#custom-string").addEventListener(
  "change",
  (event) => {
    state.sel = Number((event.target as HTMLSelectElement).value);
    state.auto = false;
    reset();
    tone.stop();
    save();
  },
);
element<HTMLInputElement>("#auto").addEventListener("change", (event) => {
  state.auto = (event.target as HTMLInputElement).checked;
  selector.reset();
  save();
});
document
  .querySelectorAll<HTMLInputElement>("input[name=mode]")
  .forEach((input) =>
    input.addEventListener("change", () => {
      state.mode = input.value === "custom" ? "custom" : "preset";
      refresh();
      closePanel();
    }),
  );
element("#panel-preset").addEventListener("change", (event) => {
  state.preset = (event.target as HTMLInputElement).value;
  refresh();
  closePanel();
});
element<HTMLSelectElement>("#base").addEventListener("change", (event) => {
  state.base = (event.target as HTMLSelectElement).value;
  state.ref = null;
  refresh();
  closePanel();
});
element("#tuning-toggle").addEventListener("click", () => {
  element("#tuning-panel").classList.toggle("closed");
  syncToggle();
});
matchMedia("(min-width:960px)").addEventListener("change", syncToggle);
syncToggle();
element("#mic").addEventListener("click", () => {
  showError("");
  if (mic.status === "off") {
    reset();
    void mic.start();
  } else mic.stop();
});
element("#tonebtn").addEventListener("click", () => {
  showError("");
  if (tone.active) tone.stop();
  else void tone.play(targets()[state.sel]!);
});
element("#rec").addEventListener("click", () => {
  const pitch = tracker.reading(performance.now());
  if (
    !pitch?.stable ||
    tone.active ||
    mic.status !== "listening" ||
    simulated ||
    !supportedReference(tuning(), { i: state.sel, f: pitch.frequency })
  )
    return;
  state.ref = { i: state.sel, f: pitch.frequency };
  refresh();
});
element("#clr").addEventListener("click", () => {
  state.ref = null;
  refresh();
});
function pause(): void {
  mic.stop();
  tone.stop();
  reset();
  cancelAnimationFrame(animation);
  clearInterval(analysisTimer);
}
function resume(): void {
  cancelAnimationFrame(animation);
  clearInterval(analysisTimer);
  analysisTimer = window.setInterval(analyze, 50);
  animation = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
  else resume();
});
window.addEventListener("pagehide", pause);
window.addEventListener("pageshow", resume);
resume();
