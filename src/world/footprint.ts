// What stands where on the ground. Things collide by the patch of ground they
// occupy, not by their pictures: a bolt is drawn high above its spot and a
// tall figure reaches well over what is behind it. The ground is drawn
// foreshortened, so a round patch is a box twice as wide as it is tall.

export interface Footprint {
  /** Centre, in world pixels. */
  x: number;
  y: number;
  /** Half the width and half the height of the box. */
  hw: number;
  hh: number;
}

export function overlaps(a: Footprint, b: Footprint): boolean {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}

/**
 * Where `mover` has to be so it no longer stands inside `solid`: pushed out
 * the short way, along one axis. Returns its position unchanged if clear.
 */
export function pushOut(mover: Footprint, solid: Footprint): { x: number; y: number } {
  const dx = mover.x - solid.x, dy = mover.y - solid.y;
  const px = mover.hw + solid.hw - Math.abs(dx), py = mover.hh + solid.hh - Math.abs(dy);
  if (px <= 0 || py <= 0) return { x: mover.x, y: mover.y };
  // The box is half as tall as wide, so compare the two depths on equal terms.
  return px * (solid.hh / solid.hw) < py
    ? { x: mover.x + (dx < 0 ? -px : px), y: mover.y }
    : { x: mover.x, y: mover.y + (dy < 0 ? -py : py) };
}
