import { TUNINGS, type Reference } from '../tuning/presets';
export interface Settings { mode: 'preset' | 'custom'; preset: string; base: string; ref: Reference | null; sel: number; auto: boolean }
export interface SettingsStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const STORAGE_KEY = 'aporia-tuner';
export const defaults = (): Settings => ({ mode: 'preset', preset: 'standard', base: 'standard', ref: null, sel: 0, auto: true });
export function readSettings(storage: SettingsStorage): Settings {
  const state = defaults();
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return state;
    const data = value as Record<string, unknown>;
    state.mode = data.mode === 'custom' ? 'custom' : 'preset';
    for (const key of ['preset', 'base'] as const) if (typeof data[key] === 'string' && TUNINGS.some(t => t.id === data[key])) state[key] = data[key];
    if (typeof data.sel === 'number' && Number.isInteger(data.sel) && data.sel >= 0 && data.sel < 6) state.sel = data.sel;
    if (typeof data.auto === 'boolean') state.auto = data.auto;
    if (data.ref && typeof data.ref === 'object') {
      const ref = data.ref as Record<string, unknown>;
      if (typeof ref.i === 'number' && Number.isInteger(ref.i) && ref.i >= 0 && ref.i < 6 && typeof ref.f === 'number' && Number.isFinite(ref.f) && ref.f >= 55 && ref.f <= 1000) state.ref = { i: ref.i, f: ref.f };
    }
  } catch { /* Storage may be disabled or contain an older, malformed record. */ }
  return state;
}
export function writeSettings(storage: SettingsStorage, settings: Settings): void {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Tuning remains usable without persistence. */ }
}
