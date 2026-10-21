import { ISO_Y } from '../machi/data';
import { middle, type WorldMap } from '../world/zones';

// The buildings that have a model of their own (made by the pipeline in .claude/skills/3d), and
// where each stands: on the ground the 2D game gives it (its drawing's `base`, a four-sided patch
// in the drawing's pixels, the drawing standing on its plot's middle by the middle of its foot),
// turned so that the wall nearest its door faces out that way. They are drawn at their true size,
// a house nearly three men tall, larger than that patch: its door must let Cabral through.

type Building = NonNullable<WorldMap['buildings']>[number];

export interface BuildingModel {
  url: string;
  /** How tall it stands, ground to ridge, in world units (Cabral is 82). */
  tall: number;
  /** Its 2D drawing's size in pixels, which its base and door are given in. */
  drawing: [number, number];
  /** Its length and depth, as shares of its height (the model's own proportions). */
  long: number;
  deep: number;
}

export const MODELS: Record<string, BuildingModel> = {
  // Tripo from turnaround B (assets/edificios/3d), 20 October 2026.
  'La posada': { url: 'edificios/3d/posada.glb', tall: 230, drawing: [358, 250], long: 1.906, deep: 1.458 },
};

/** Where a modelled building stands: its middle on the 2D ground, its turn about the upright, its length and depth. */
export function placed(b: Building): { x: number; y: number; turn: number; long: number; deep: number } | null {
  const model = MODELS[b.name];
  if (!model || !b.base) return null;
  const { x, y } = middle(b.plot), [w, h] = model.drawing;
  const at = (p: [number, number]) => ({ x: x - w / 2 + p[0], y: y - h + p[1] });
  const base = b.base.map(at), door = at(b.door ?? [w / 2, h]);
  const mid = { x: base.reduce((s, p) => s + p.x, 0) / base.length, y: base.reduce((s, p) => s + p.y, 0) / base.length };
  // The wall with the door: of the base's four edges, the one whose middle is nearest it.
  let front = 0, least = Infinity;
  base.forEach((p, i) => {
    const q = base[(i + 1) % base.length], far = Math.hypot((p.x + q.x) / 2 - door.x, ((p.y + q.y) / 2 - door.y) / ISO_Y);
    if (far < least) { least = far; front = i; }
  });
  const p = base[front], q = base[(front + 1) % base.length];
  const dx = q.x - p.x, dz = (q.y - p.y) / ISO_Y;
  // Turned so its length lies along that wall, and its front (its +Z) toward the door.
  let turn = Math.atan2(-dz, dx);
  const out = { x: door.x - mid.x, z: (door.y - mid.y) / ISO_Y };
  if (Math.sin(turn) * out.x + Math.cos(turn) * out.z < 0) turn += Math.PI;
  return { ...mid, turn, long: model.long * model.tall, deep: model.deep * model.tall };
}
