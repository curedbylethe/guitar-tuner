import type { Feedback } from "../tuning/feedback";
import { formatCents } from "../tuning/notes";
import { element, text } from "./dom";
const WORDS = {
  off: ["Microphone off", "Start the microphone, then pluck a string."],
  none: ["Listening", "Pluck the string and let it ring."],
  settling: ["Settling", "Keep the string ringing."],
  flat: ["Flat", "Tune up"],
  sharp: ["Sharp", "Tune down"],
  in: ["In tune", "Hold it there"],
} as const;
export class Meter {
  private shown = 0;
  private announcement = "";
  constructor() {
    const gauge = element("#gauge");
    for (let cents = -50; cents <= 50; cents += 5) {
      const tick = document.createElement("div");
      tick.className =
        "tick" +
        (cents % 10 === 0 ? " major" : "") +
        (cents === 0 ? " zero" : "");
      tick.style.left = cents + 50 + "%";
      gauge.insertBefore(tick, element("#needle"));
    }
  }
  render(
    state: Feedback,
    note: string,
    frequency: number | null,
    cents: number,
    provenance: string,
  ): void {
    const [word, hint] =
      state === "tone"
        ? [`Playing ${note} tone`, "Wait for it to finish, or stop it."]
        : WORDS[state];
    text("state", word);
    text("hint", hint);
    element("#state").dataset.s = state;
    text("heard", frequency ? frequency.toFixed(2) + " Hz" : "—");
    text("cents", frequency ? formatCents(cents) : "—");
    element("#cents").classList.toggle("dim", !frequency);
    text("prov", provenance);
    const clamped = Math.max(-50, Math.min(50, cents));
    this.shown += ((frequency ? clamped : 0) - this.shown) * 0.25;
    element("#needle").style.left = this.shown + 50 + "%";
    element("#dev").style.left = Math.min(50, this.shown + 50) + "%";
    element("#dev").style.width = Math.abs(this.shown) + "%";
    const gauge = element("#gauge");
    gauge.classList.toggle("in", state === "in");
    gauge.classList.toggle("idle", !frequency);
    element("#bylo").hidden = !(frequency && cents < -50);
    element("#byhi").hidden = !(frequency && cents > 50);
    gauge.setAttribute(
      "aria-valuenow",
      String(Math.round(frequency ? clamped : 0)),
    );
    gauge.setAttribute(
      "aria-valuetext",
      frequency
        ? `${formatCents(cents)}, ${word}${Math.abs(cents) > 50 ? ", beyond scale" : ""}`
        : "No reading",
    );
    const announcement = state + note + (Math.abs(cents) > 50 ? "b" : "");
    if (announcement !== this.announcement) {
      this.announcement = announcement;
      text(
        "announce",
        ["flat", "sharp", "in"].includes(state)
          ? `${note} ${word.toLowerCase()}. ${hint}.`
          : state === "none"
            ? "Listening."
            : state === "settling"
              ? "Settling."
              : "",
      );
    }
    text("tonebtn", state === "tone" ? "Stop tone" : `Play ${note} tone`);
  }
}
