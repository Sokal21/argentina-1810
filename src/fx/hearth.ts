import Phaser from 'phaser';

// A fire in a hearth: tongues of flame rising and breaking up, on the pixel grid of the drawing
// it burns in, and the light it throws on the room, which breathes and stutters as flames do.

const FRAG = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float cell;     // screen pixels to each pixel of the drawing the fire is in

varying vec2 fragCoord;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 size = floor(resolution / cell);
  vec2 p = floor(fragCoord / cell);               // which pixel of the drawing, from the bottom left
  float up = p.y / size.y;                         // 0 at the logs, 1 at the top
  float across = abs(p.x + 0.5 - size.x * 0.5) / (size.x * 0.5);
  // Rising noise, quicker higher up, the flames narrowing as they climb.
  float n = 0.65 * noise(vec2(p.x * 0.45, p.y * 0.32 - time * 4.2)) + 0.35 * noise(vec2(p.x * 0.9 + 3.0, p.y * 0.6 - time * 6.5));
  float body = (1.0 - across * (0.6 + 0.9 * up)) * (1.05 - up) * 1.5;
  float heat = n * body;
  vec3 colour; float alpha = 1.0;
  if (heat > 0.78) colour = vec3(1.0, 0.95, 0.72);
  else if (heat > 0.58) colour = vec3(1.0, 0.78, 0.25);
  else if (heat > 0.40) colour = vec3(0.98, 0.48, 0.10);
  else if (heat > 0.28) colour = vec3(0.72, 0.20, 0.06);
  else { colour = vec3(0.0); alpha = 0.0; }
  gl_FragColor = vec4(colour * alpha, alpha);
}
`;

/** The shader for fires; made once. */
function hearthShader(scene: Phaser.Scene): Phaser.Display.BaseShader {
  const cached = scene.cache.shader.get('hogar') as Phaser.Display.BaseShader | undefined;
  if (cached) return cached;
  const shader = new Phaser.Display.BaseShader('hogar', FRAG, undefined, { cell: { type: '1f', value: 2 } });
  scene.cache.shader.add('hogar', shader);
  return shader;
}

/** A soft disc of warm light, white at the middle, for whatever is lit. */
function glowTexture(scene: Phaser.Scene): string {
  const key = 'hogar-luz';
  if (scene.textures.exists(key)) return key;
  const size = 256, tex = scene.textures.createCanvas(key, size, size)!, g = tex.getContext();
  const fade = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, 'rgba(255, 200, 120, 1)');
  fade.addColorStop(0.35, 'rgba(255, 140, 50, 0.45)');
  fade.addColorStop(1, 'rgba(255, 110, 30, 0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}

export class Hearth {
  readonly parts: Phaser.GameObjects.GameObject[] = [];
  private flames?: Phaser.GameObjects.Shader;
  private glow: Phaser.GameObjects.Image;
  private near: Phaser.GameObjects.Image;
  private seed = Math.random() * 100;

  /**
   * @param at    the flames' box in the world: left, top, width, height
   * @param cell  how many world pixels each pixel of the drawing it burns in is shown at
   * @param reach how far its light carries, in world pixels
   */
  constructor(scene: Phaser.Scene, at: { x: number; y: number; w: number; h: number }, cell: number, reach: number, depth: number) {
    if (scene.renderer.type === Phaser.WEBGL) {
      this.flames = scene.add.shader(hearthShader(scene), at.x, at.y, at.w, at.h).setOrigin(0, 0).setDepth(depth);
      this.flames.setUniform('cell.value', cell);
      this.parts.push(this.flames);
    }
    const key = glowTexture(scene), foot = { x: at.x + at.w / 2, y: at.y + at.h * 0.75 };
    // Its light over the room, and a brighter one close to the hearth.
    this.glow = scene.add.image(foot.x, foot.y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(1e5).setScale(reach * 2 / 256);
    this.near = scene.add.image(foot.x, foot.y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(1e5).setScale(reach * 0.7 / 256);
    this.parts.push(this.glow, this.near);
  }

  /** Flames do not burn evenly: two beats and a stutter. */
  update(time: number, shown = 1): void {
    const t = time / 1000 + this.seed;
    const flicker = 0.5 + 0.22 * Math.sin(t * 7.1) + 0.14 * Math.sin(t * 12.7 + 1.3) + 0.14 * Math.sin(t * 3.3) * Math.sin(t * 19.0);
    this.glow.setAlpha(shown * (0.12 + 0.1 * flicker));
    this.near.setAlpha(shown * (0.15 + 0.15 * flicker));
    this.flames?.setVisible(shown > 0.05);
  }
}
