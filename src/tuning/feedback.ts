export type Feedback = 'off' | 'none' | 'settling' | 'flat' | 'sharp' | 'in' | 'tone';
export function feedback(live: boolean, tone: boolean, cents: number | null, stable: boolean, latched: boolean): Feedback {
  if (tone) return 'tone';
  if (!live) return 'off';
  if (cents === null) return 'none';
  if (!stable) return 'settling';
  if (Math.abs(cents) <= (latched ? 8 : 5)) return 'in';
  return cents < 0 ? 'flat' : 'sharp';
}
