// Which screen effects are on. Remembered between reloads.
export type Effect = 'grain' | 'light' | 'crt' | 'snow' | 'leaves' | 'finish' | 'outline';

export const EFFECTS: [Effect, string][] = [
  ['grain', 'Grano'],
  ['light', 'Luz'],
  ['crt', 'CRT'],
  ['snow', 'Nieve'],
  ['leaves', 'Otoño'],
  ['finish', 'Acabado'],
  ['outline', 'Contorno'],
];

// A new name, so that everyone starts again from the defaults below: they were all on before.
const KEY = 'argentina-1810-fx-2';

function load(): Record<Effect, boolean> {
  // Off until whoever plays turns them on in the pause menu; but the finish, tuned for the 3D
  // game and brought back to this one, is on.
  const defaults = { grain: false, light: false, crt: false, snow: false, leaves: false, finish: true, outline: false };
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
