import Phaser from 'phaser';

// Someone's shadow as their own shape laid on the ground, as the plants' are, instead of a dark
// oval: each frame they are drawn in is laid over on the ground once, the way the light falls,
// and whatever frame they are in, its shadow is shown under them. Being tried out.

const LIGHT = { across: 0.6, down: -0.12 };   // as on the plants of open country
const SHADE = '#06080a';
const ALPHA = 0.3;

interface Laid { key: string; footX: number; footY: number }
const laid = new Map<string, Laid>();

// One frame laid over on the ground, the way it faces; made once.
function lay(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Laid {
  const frame = sprite.frame, flip = sprite.flipX;
  const id = `sombra:${frame.texture.key}:${frame.name}:${flip ? 1 : 0}`;
  const had = laid.get(id);
  if (had) return had;
  const w = frame.cutWidth, h = frame.cutHeight;
  // Where the feet are in the frame, as the sprite is drawn (mirrored, if it is).
  const ox = flip ? w - sprite.displayOriginX : sprite.displayOriginX, oy = sprite.displayOriginY;
  // A pixel `up` above the feet and `out` from them lands at feet + out + up * light: its place,
  // with the feet at the origin, for each corner of the frame, gives the size of what is laid.
  const place = (x: number, y: number) => [x - ox + (oy - y) * LIGHT.across, (oy - y) * LIGHT.down] as const;
  const corners = [place(0, 0), place(w, 0), place(0, h), place(w, h)];
  const minX = Math.min(...corners.map(c => c[0])), maxX = Math.max(...corners.map(c => c[0]));
  const minY = Math.min(...corners.map(c => c[1])), maxY = Math.max(...corners.map(c => c[1]));
  const footX = 1 - minX, footY = 1 - minY;
  const width = Math.ceil(maxX - minX) + 2, height = Math.ceil(maxY - minY) + 2;
  const tex = scene.textures.createCanvas(id, width, height)!;
  const g = tex.getContext();
  g.imageSmoothingEnabled = false;
  // The source pixel (sx, sy), x mirrored if it is: x' = footX + x - ox + (oy - y)·across, y' = footY + (oy - y)·down.
  const e = footX - ox + oy * LIGHT.across, f = footY + oy * LIGHT.down;
  g.setTransform(flip ? -1 : 1, 0, -LIGHT.across, -LIGHT.down, flip ? e + w : e, f);
  g.drawImage(frame.source.image as HTMLImageElement, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = SHADE;
  g.fillRect(0, 0, width, height);
  tex.refresh();
  const made = { key: id, footX: footX / width, footY: footY / height };
  laid.set(id, made);
  return made;
}

export class Silhouettes {
  private shadows = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Image>();
  constructor(private scene: Phaser.Scene) {}

  /** Lays the shadow of someone drawn as `sprite`, standing at `feet`; or puts it away. */
  cast(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, feet: { x: number; y: number } | null): void {
    let shadow = this.shadows.get(sprite);
    if (!feet || !sprite.visible || sprite.alpha < 0.05) { shadow?.setVisible(false); return; }
    const l = lay(this.scene, sprite);
    if (!shadow) {
      shadow = this.scene.add.image(0, 0, l.key).setAlpha(ALPHA).setDepth(-1e6 + 2.5);
      this.shadows.set(sprite, shadow);
    }
    if (shadow.texture.key !== l.key) shadow.setTexture(l.key);
    shadow.setOrigin(l.footX, l.footY).setScale(sprite.scaleX, sprite.scaleY).setPosition(Math.round(feet.x), Math.round(feet.y)).setVisible(true);
  }
}
