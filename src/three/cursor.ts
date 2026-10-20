// The pointer, in the 3D game: a Sol de Mayo, drawn here pixel by pixel (32 by 32): a golden face
// with its eyes, nose and mouth, and sixteen rays, straight and flaming by turns, all ringed in a
// dark pixel so it reads over light grass and over shadow. What is aimed at is the middle of its face.

const SIZE = 32, MIDDLE = 15.5;
/** The face's radius and its rim's; how far the straight rays reach, and the flaming ones. */
const FACE = 5.2, RIM = 6.4, STRAIGHT = 14.6, FLAMING = 12.6;
const GOLD = [246, 196, 69], RIM_GOLD = [181, 128, 26], RAY = [242, 182, 49], FEATURES = [138, 90, 18], EDGE = [70, 42, 10];

let drawn: string | null = null;

/** The Sol de Mayo as a picture for CSS's `cursor`, with the point aimed at in its middle. */
export function solDeMayo(): string {
  if (drawn) return drawn;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d')!, picture = g.createImageData(SIZE, SIZE);
  const colours: (number[] | null)[] = new Array(SIZE * SIZE).fill(null);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - MIDDLE, dy = y - MIDDLE, r = Math.hypot(dx, dy);
      let colour: number[] | null = null;
      if (r <= FACE) colour = GOLD;
      else if (r <= RIM) colour = RIM_GOLD;
      else {
        // The nearest of the sixteen rays, one of them straight up.
        const a = Math.atan2(dx, -dy), step = (Math.PI * 2) / 16, k = Math.round(a / step), off = a - k * step;
        const straight = ((k % 2) + 2) % 2 === 0, reach = straight ? STRAIGHT : FLAMING;
        if (r <= reach) {
          const t = (r - RIM) / (reach - RIM), across = r * Math.sin(off);
          // The straight ones taper; the flaming ones wave from side to side as they taper.
          const wave = straight ? 0 : 1.2 * Math.sin((r - RIM) * 1.5);
          const half = (straight ? 1.7 : 1.1) * (1 - t) + 0.45;
          if (Math.abs(across - wave) <= half) colour = RAY;
        }
      }
      colours[y * SIZE + x] = colour;
    }
  }
  // Its face: two eyes, a nose and a mouth.
  for (const [x, y] of [[13, 14], [18, 14], [15, 16], [16, 16], [14, 18], [15, 18], [16, 18], [17, 18]]) colours[y * SIZE + x] = FEATURES;
  // A dark pixel round everything, so it reads over anything.
  const ringed = colours.slice();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (colours[y * SIZE + x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => colours[(y + oy) * SIZE + (x + ox)] && x + ox >= 0 && x + ox < SIZE);
      if (near) ringed[y * SIZE + x] = EDGE;
    }
  }
  ringed.forEach((colour, i) => {
    if (!colour) return;
    picture.data.set([colour[0], colour[1], colour[2], 255], i * 4);
  });
  g.putImageData(picture, 0, 0);
  return drawn = canvas.toDataURL('image/png');
}

/** The CSS `cursor` for it: aimed at its middle, a crosshair where pictures are not allowed. */
export function sunCursor(): string {
  return `url(${solDeMayo()}) 16 16, crosshair`;
}
