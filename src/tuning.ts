// Numbers to try things out with while developing, changed from the panel
// behind the gear button and remembered between reloads. In the published
// game there is no panel, and they keep the values written here.

export interface Dial {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export const DIALS = {
  dark:  { label: 'Oscuridad lejos de la luz', min: 0, max: 1, step: 0.01, value: 0.51 },
  reach: { label: 'Alcance de la luz', min: 0.15, max: 1, step: 0.01, value: 0.52 },
  glow:  { label: 'Brillo cálido', min: 0, max: 1.5, step: 0.01, value: 0.68 },
  speed: { label: 'Velocidad del personaje', min: 0.5, max: 2.5, step: 0.05, value: 1 },
  foes:  { label: 'Ritmo de los enemigos', min: 0.25, max: 2.5, step: 0.05, value: 1 },
} satisfies Record<string, Dial>;

export type DialName = keyof typeof DIALS;

const KEY = 'argentina-1810-tuning';
const defaults = () => Object.fromEntries(
  Object.entries(DIALS).map(([name, dial]) => [name, dial.value]),
) as Record<DialName, number>;

function load(): Record<DialName, number> {
  if (!import.meta.env.DEV) return defaults();
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults();
  }
}

/** The values in force. */
export const tune: Record<DialName, number> = load();
/** Nothing can hurt the hero. */
export const cheats = { unhurt: false };

export function setDial(name: DialName, value: number): void {
  tune[name] = value;
  localStorage.setItem(KEY, JSON.stringify(tune));
}

export function resetDials(): void {
  Object.assign(tune, defaults());
  localStorage.removeItem(KEY);
}
