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

// Experimental: steer and aim with the pointer, at any angle, instead of
// only along the eight keyboard directions.
const MOUSE_KEY = 'argentina-1810-mouse';
export const controls = { mouse: localStorage.getItem(MOUSE_KEY) !== 'off' };

export function setMouseControl(on: boolean): void {
  controls.mouse = on;
  localStorage.setItem(MOUSE_KEY, on ? 'on' : 'off');
}
