import Phaser from 'phaser';

// Grass grown to the ankle, all over the ground, with the wind in it. The
// ground is ruled into small cells and most of them hold a tuft: three
// blades a pixel wide, the middle one tallest, each a column of pixels that
// leans further the higher up it is. The wind comes in swells that cross the
// country, so tufts along their way lie over one after another and their
// tips pale as they do. Only what the camera sees is drawn: one quad that
// keeps up with it and is told where on the ground it is.
const CELL_W = 7, CELL_H = 5;  // a cell of ground, in sprite pixels
const TUFTS = 0.7;             // share of the cells that hold a tuft
const TALL = 8;                // the tallest a blade grows, in pixels: about to the ankle
const LEAN = 4;                // how far a gust carries the tip of the tallest blade
const GUSTS = 0.32;            // how fast the swells cross the ground
const FRAG = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec2 origin;     // the ground under the quad's top-left corner, in sprite pixels
uniform vec3 dark;
uniform vec3 mid;
uniform vec3 light;

varying vec2 fragCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// How hard the wind blows over a spot, from 0 to 1: broad swells with
// smaller ones riding on them, all travelling the same way.
float wind(vec2 at) {
  float broad = noise(vec2(at.x * 0.005 - time * ${GUSTS.toFixed(2)}, at.y * 0.011));
  float fine = noise(vec2(at.x * 0.018 - time * ${(GUSTS * 2.2).toFixed(2)}, at.y * 0.035 + 7.0));
  return clamp(broad * 0.8 + fine * 0.3 - 0.08, 0.0, 1.0);
}

void main() {
  // The sprite pixel of ground this fragment falls in. The quad's y runs up; the ground's, down.
  vec2 at = floor(origin + vec2(fragCoord.x, resolution.y - fragCoord.y));
  vec2 cell = floor(at / vec2(${CELL_W.toFixed(1)}, ${CELL_H.toFixed(1)}));
  vec3 colour = vec3(0.0);
  float found = 0.0;
  // A blade reaches up out of its cell and leans across it, so the tufts
  // rooted beside and below this pixel are looked at too.
  for (int j = 0; j <= 2; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(float(i), float(j));
      if (hash(c + 0.5) > ${TUFTS.toFixed(2)}) continue;
      vec2 root = c * vec2(${CELL_W.toFixed(1)}, ${CELL_H.toFixed(1)})
        + floor(vec2(hash(c + 1.3) * ${(CELL_W - 2).toFixed(1)} + 1.0, hash(c + 2.7) * ${CELL_H.toFixed(1)}));
      float up = root.y - at.y;           // pixels above the root
      if (up < 0.0 || up >= ${TALL.toFixed(1)}) continue;
      float blow = wind(root);
      // Each tuft rocks a little in its own time, and lies over when a swell reaches it.
      float push = blow * ${LEAN.toFixed(1)} + sin(time * 2.3 + hash(c + 4.1) * 6.283) * 0.6;
      for (int k = -1; k <= 1; k++) {
        float tall = floor(${(TALL * 0.5).toFixed(1)} + hash(c + float(k) * 3.7 + 9.0) * ${(TALL * 0.3).toFixed(1)}
          + (k == 0 ? ${(TALL * 0.2).toFixed(1)} : 0.0));
        if (up >= tall) continue;
        float share = up / ${TALL.toFixed(1)};
        float x = root.x + float(k) * 2.0 + floor(push * share * share * ${TALL.toFixed(1)} / tall + 0.5);
        if (x != at.x) continue;
        // Dark where it comes out of the ground, and a tip that pales as the wind lays it over.
        colour = up < 1.0 ? dark : (up >= tall - 2.0 ? mix(mid, light, 0.25 + 0.75 * blow) : mid);
        found = 1.0;
      }
    }
  }
  if (found == 0.0) discard;
  gl_FragColor = vec4(colour, 1.0);
}
`;

const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const weight = ([r, g, b]: number[]) => r * 0.3 + g * 0.59 + b * 0.11;

/** The long grass of a map, kept under whatever the camera is looking at. */
export class Meadow {
  private quad?: Phaser.GameObjects.Shader;

  /** @param ground the colours of the ground it grows on; its own are taken from them */
  constructor(private scene: Phaser.Scene, ground: string[]) {
    if (scene.renderer.type !== Phaser.WEBGL) return;
    const shades = ground.map(rgb).sort((a, b) => weight(a) - weight(b));
    const scaled = (c: number[], by: number) => c.map(v => Math.min(1, v * by));
    const colour = (c: number[]) => ({ type: '3f', value: { x: c[0], y: c[1], z: c[2] } });
    const base = new Phaser.Display.BaseShader('meadow', FRAG, undefined, {
      origin: { type: '2f', value: { x: 0, y: 0 } },
      dark: colour(scaled(shades[0], 0.8)),
      mid: colour(scaled(shades[shades.length - 1], 1.16)),
      light: colour(scaled(shades[shades.length - 1], 1.5)),
    });
    // Just over the ground, under every shadow and everything that stands.
    this.quad = scene.add.shader(base, 0, 0, 16, 16).setOrigin(0, 0).setDepth(-1e6 + 1);
    this.follow();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.follow, this));
  }

  /** Brings it under the camera; to be called every step. */
  follow(): void {
    if (!this.quad) return;
    const view = this.scene.cameras.main.worldView;
    // On whole pixels of ground, and a little larger than what is seen.
    const x = Math.floor(view.x) - 2, y = Math.floor(view.y) - 2;
    const w = Math.ceil(view.width) + 4, h = Math.ceil(view.height) + 4;
    if (this.quad.width !== w || this.quad.height !== h) this.quad.setSize(w, h);
    this.quad.setPosition(x, y);
    this.quad.setUniform('origin.value.x', x);
    this.quad.setUniform('origin.value.y', y);
  }
}
