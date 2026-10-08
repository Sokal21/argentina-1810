// Which screen effects are on. Remembered between reloads.
export type Effect = 'grain' | 'light' | 'crt';

export const EFFECTS: [Effect, string][] = [
  ['grain', 'Grano'],
  ['light', 'Luz'],
  ['crt', 'CRT'],
];

const KEY = 'argentina-1810-fx';

function load(): Record<Effect, boolean> {
  const defaults = { grain: true, light: true, crt: true };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

export const fx: Record<Effect, boolean> = load();

export function setEffect(name: Effect, on: boolean): void {
  fx[name] = on;
  localStorage.setItem(KEY, JSON.stringify(fx));
}
