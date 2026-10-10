import Phaser from 'phaser';

// Life or mana coming back: for a moment a soft light stands round the
// hero and specks of it rise through them, in the colour of what was given
// back. Drawn in whole sprite pixels, over a patch no bigger than the hero,
// and gone when it is over: nothing of it is left running.
const FRAG = `
precision mediump float;

uniform vec2 resolution;
uniform vec3 colour;
uniform float age;      // 0 as it begins, 1 as it ends

varying vec2 fragCoord;

const float FEET = 22.0;   // how far above the bottom of the patch the feet are

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = floor(fragCoord);
  float across = abs(p.x / resolution.x - 0.5) * 2.0;        // 0 down the middle, 1 at the sides
  float up = (p.y - FEET) / (resolution.y - FEET);           // 0 at the feet, 1 at the top
  // The ground it stands on is a circle seen from above: what lies below the feet is kept
  // inside it, so the light ends in a curve there and not along a line.
  vec2 onGround = vec2((p.x - resolution.x * 0.5) / (resolution.x * 0.4), (p.y - FEET) / (resolution.x * 0.2));
  float round = length(onGround);
  float footing = up < 0.0 ? 1.0 - smoothstep(0.55, 1.0, round) : 1.0;
  // It comes up quickly and goes out slowly.
  float life = smoothstep(0.0, 0.15, age) * (1.0 - smoothstep(0.45, 1.0, age));
  // A glow about the feet and up the body, in flat bands.
  float glow = floor((1.0 - across) * (1.0 - max(up, 0.0) * 0.8) * 4.0) / 4.0;
  // Specks two pixels square, each column rising at a pace of its own.
  vec2 cell = floor(vec2(p.x, p.y - age * resolution.y * (0.9 + hash(vec2(floor(p.x / 2.0), 7.0)))) / 2.0);
  // Fewer of them the higher and the further out, so they thin away instead of ending at an edge:
  // each has a height and a width of its own beyond which it is not there.
  float reach = hash(cell + 31.0);
  float thins = (1.0 - smoothstep(0.55, 1.0, up + reach * 0.3)) * (1.0 - smoothstep(0.5, 1.0, across + reach * 0.3));
  float speck = step(0.87, hash(cell)) * thins * step(round + reach * 0.5, up < 0.0 ? 1.0 : 9.0);
  // A faint ring on the ground that widens from the feet as it begins, a pixel thick.
  float ring = (1.0 - smoothstep(0.0, 0.07, abs(round - age * 1.6))) * (1.0 - smoothstep(0.3, 0.9, age));
  // And nothing at all reaches the top or the sides of the patch.
  float within = (1.0 - smoothstep(0.6, 0.95, up)) * (1.0 - smoothstep(0.7, 1.0, across)) * footing;
  float a = clamp(glow * 0.3 * within + speck * 0.95 + ring * 0.22, 0.0, 1.0) * life;
  gl_FragColor = vec4(mix(colour, vec3(1.0), speck * 0.45) * a, a);
}
`;

// The patch it is drawn over, in sprite pixels, with room below the feet for the round of ground it stands on.
const SIZE = { w: 76, h: 142 };
const FEET = 22;                  // rows of it that lie below the feet
const LASTS = 1.1;                // seconds

/** The colours of what comes back. */
export const MEND = { life: 0xff4a3a, mana: 0x46e6fa };

/** Whatever of it is under way in a scene, kept about whoever it is for. */
export class Mending {
  private under: { quad: Phaser.GameObjects.Shader; t: number }[] = [];

  constructor(private scene: Phaser.Scene) {}

  /** Begins it, in a colour, about someone standing at a spot. */
  begin(colour: number, at: { x: number; y: number }): void {
    if (this.scene.renderer.type !== Phaser.WEBGL) return;
    const { r, g, b } = Phaser.Display.Color.IntegerToRGB(colour);
    const base = new Phaser.Display.BaseShader(`mend-${colour}`, FRAG, undefined, {
      colour: { type: '3f', value: { x: r / 255, y: g / 255, z: b / 255 } },
      age: { type: '1f', value: 0 },
    });
    const quad = this.scene.add.shader(base, at.x, at.y, SIZE.w, SIZE.h).setOrigin(0.5, 1);
    this.under.push({ quad, t: 0 });
  }

  /** Moves it along, keeping it about whoever it is for and in front of them. */
  update(dt: number, at: { x: number; y: number }): void {
    for (const one of this.under) {
      one.t += dt;
      one.quad.setPosition(Math.round(at.x), Math.round(at.y) + FEET).setDepth(at.y + 1);
      one.quad.setUniform('age.value', Math.min(1, one.t / LASTS));
      if (one.t >= LASTS) one.quad.destroy();
    }
    this.under = this.under.filter(one => one.t < LASTS);
  }
}
