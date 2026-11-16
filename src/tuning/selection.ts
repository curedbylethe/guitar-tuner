import { centsBetween } from "./notes";
/** Require a clear 20-cent advantage over three fresh, stable detections. */
export class StringSelector {
  private candidate = -1;
  private count = 0;
  reset(): void {
    this.candidate = -1;
    this.count = 0;
  }
  choose(
    frequency: number,
    targets: readonly number[],
    current: number,
    stable: boolean,
  ): number {
    if (!stable) {
      this.reset();
      return current;
    }
    let best = current;
    targets.forEach((target, i) => {
      if (
        Math.abs(centsBetween(frequency, target)) <
        Math.abs(centsBetween(frequency, targets[best]!))
      )
        best = i;
    });
    const improvement =
      Math.abs(centsBetween(frequency, targets[current]!)) -
      Math.abs(centsBetween(frequency, targets[best]!));
    if (best === current || improvement < 20) {
      this.reset();
      return current;
    }
    if (this.candidate !== best) {
      this.candidate = best;
      this.count = 0;
    }
    if (++this.count < 3) return current;
    this.reset();
    return best;
  }
}
