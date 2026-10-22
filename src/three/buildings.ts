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
  /** The room within it, gone into without a cut (house.ts), in the building's own frame. */
  inside?: {
    /** Its walls, where the model's are (measured below its eaves): length, depth, height, thickness. */
    walls: { long: number; deep: number; tall: number; thick: number };
    /** The door in its front wall: how far along from the middle (to the left as you face it, less) and how wide. */
    door: { x: number; wide: number };
    /**
     * Whether a side wall that faces the camera as well (turned that way enough) is cut down with the
     * front, and whatever stands beyond it: where it hides the room, as the chapel's long side does.
     */
    side?: boolean;
    plaster: string;
    floor: string;
    /** What stands in it: its model, how tall that stands, its turn, and where its middle is. */
    furniture: string;
    scale: number;
    turn: number;
    at: [number, number];
    /**
     * The furniture came on a slab of earth of its own: how high its top stands (the furniture is let
     * down that far, so feet are not sunk in it), and a spot of its picture on that earth, which the
     * rest of the floor is painted with so the two are one floor.
     */
    slab: number;
    earth: [number, number];
    /**
     * The light within, from its fire or its candles, where it burns (x along, height, z out of the
     * front), its colour, strength and reach; and the flames that give it, each a small glow there.
     */
    light: { at: [number, number, number]; colour: string; strength: number; reach: number; flames?: [number, number, number][] };
    /** Who keeps it, standing within: their id (as the story knows them), model, drawn height, and where they stand. */
    keeper?: { who: string; url: string; drawn: number; at: [number, number] };
  };
}

export const MODELS: Record<string, BuildingModel> = {
  // Tripo from turnaround B (assets/edificios/3d), 20 October 2026.
  'La posada': {
    url: 'edificios/3d/posada.glb', tall: 230, drawing: [358, 250], long: 1.906, deep: 1.458,
    // Tripo from furniture set C (no walls, the table off the door), 20 October 2026.
    inside: {
      walls: { long: 402, deep: 263, tall: 103, thick: 10 }, door: { x: -53, wide: 83 },
      plaster: '#d6ccb4', floor: '#6e5638',
      furniture: 'edificios/3d/posada_muebles.glb', scale: 152, turn: Math.PI / 2, at: [-58, 0],
      // Measured in Blender: the slab's top at 0.0885 of its height; its commonest earth at that spot.
      slab: 13.5, earth: [0.7283, 0.1296],
      // Its fire, in the middle of the room.
      light: { at: [-58, 110, 0], colour: '#ffae6a', strength: 900, reach: 400 },
      // Don Braulio, by his counter (Tripo from turnaround B, 21 October 2026).
      keeper: { who: 'braulio', url: 'pulpero/3d/braulio_animado.glb', drawn: 80, at: [-25, -95] },
    },
  },
  // Tripo from the stone turnaround under clay tiles (the user's pick), 22 October 2026: its door in
  // the gable end, a lean-to along its right. Centred on its walls, the lean-to standing out to one side.
  'La capilla': {
    url: 'edificios/3d/capilla.glb', tall: 260, drawing: [360, 261], long: 1.222, deep: 1.662,
    // Tripo from furniture set B (no walls, the lantern's post out of the way), 22 October 2026.
    inside: {
      walls: { long: 231, deep: 398, tall: 135, thick: 12 }, door: { x: -4, wide: 65 }, side: true,
      plaster: '#b8b2a4', floor: '#6e5638',
      furniture: 'edificios/3d/capilla_muebles.glb', scale: 111, turn: 0, at: [0, -26],
      // Measured in Blender: the slab's top at 0.13 of its height; its commonest earth at that spot.
      slab: 14.5, earth: [0.3699, 0.4988],
      // The altar's candles, at the far end (measured in Blender: the cross's top at the middle,
      // 1.3 of the furniture's height back from its middle; the candles a little over half up it).
      light: {
        at: [0, 125, -95], colour: '#ffb866', strength: 1500, reach: 430,
        flames: [[-28, 50, -170], [-16, 53, -172], [14, 53, -172], [26, 50, -170]],
      },
    },
  },
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
