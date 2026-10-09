import Phaser from 'phaser';

// Wind in the trees. A drawing given this is not moved: its rows are slid
// sideways, each a little further than the one below, so the whole tree leans
// from its foot, trunk and all, and comes back. Three things are laid over
// one another:
//  - the gusts: the wind comes and goes unevenly, in swells that travel
//    across the ground, so trees along their way lean one after another;
//  - the sway: each tree rocks about where the wind holds it, in its own time;
//  - the rustle: in a gust, bits of its crown shiver a pixel either way.
// A tree moves as one: where it stands and what sets it apart from the next
// are told to the shader through its tint, which is not used as a colour.
// That number of its own also makes each a little lighter or darker, warmer
// or colder than its neighbours.
// Every drawing given it must be the same size.
const STRENGTH = 4;     // how far a steady wind carries the very top, in pixels of the drawing
const TONES = 0.5;      // how far apart the lightest tree and the darkest are
const WARMTH = 0.32;    // and the warmest and the coldest
const RUSTLE = 1.6;     // how readily the crown shivers, from 0 (never)
const fragShader = `
#define SHADER_NAME WIND_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform float uTime;     // seconds
uniform float uSpan;     // how wide the ground is, in sprite pixels
uniform vec2 uSize;      // the drawing, in its own pixels
uniform float uStrength;
uniform float uRustle;
uniform float uTones;
uniform float uWarmth;

varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// A value that drifts smoothly from 0 to 1 and back, without ever repeating.
float drift(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  // What the tint tells: how far across the ground the tree stands, a number
  // of its own, and how many times its drawn size it is shown.
  float across = outTint.b * uSpan;
  float own = outTint.g;
  float shown = max(1.0, floor(outTint.r * 255.0 + 0.5));

  vec2 pixel = floor(outTexCoord * uSize);  // which pixel of the drawing this is
  float up = 1.0 - (pixel.y + 0.5) / uSize.y; // 0 at the foot, 1 at the top

  // Swells some nine hundred pixels long, passing from left to right.
  float gust = smoothstep(0.3, 0.8, drift(vec2(across / 900.0 - uTime * 0.35, 0.5)));
  float lean = uStrength * (0.15 + gust);
  lean += uStrength * 0.45 * (0.4 + gust) * sin(uTime * (1.8 + own) + own * 6.2832);
  // The whole tree bends from its foot, a little more steeply toward the top.
  // It is slid by whole pixels of the screen, so it moves smoothly at any size.
  float slid = floor(lean * pow(up, 1.3) * shown + 0.5) / shown;

  // The shiver, only up in the crown and only when it blows.
  float crown = step(0.45, up);
  float shiver = drift(pixel * 0.22 + vec2(uTime * 2.6, uTime * 0.6) + own * 31.0) * 2.0 - 1.0;
  slid += crown * floor(shiver * uRustle * (0.3 + gust) + 0.5);

  vec2 uv = vec2(outTexCoord.x - slid / uSize.x, outTexCoord.y);
  vec4 texture = texture2D(uMainSampler, uv);
  // Nothing is carried in from beyond the drawing's edge.
  if (uv.x < 0.0 || uv.x > 1.0) texture = vec4(0.0);
  // Each tree in a shade and a warmth of its own.
  float shade = 1.0 + (fract(own * 7.31) - 0.6) * uTones;
  float warmth = (fract(own * 13.7) - 0.5) * uWarmth;
  texture.rgb *= shade * vec3(1.0 + warmth, 1.0, 1.0 - warmth);
  gl_FragColor = texture * outTint.a;
}
`;

export class Wind extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  /** How wide the ground is, in sprite pixels. */
  span = 1;
  /** The size every drawing given the wind has, in its own pixels. */
  drawn = { width: 1, height: 1 };

  constructor(game: Phaser.Game) {
    super({ game, name: 'Wind', fragShader });
  }

  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uSpan', this.span);
    this.set2f('uSize', this.drawn.width, this.drawn.height);
    this.set1f('uStrength', STRENGTH);
    this.set1f('uRustle', RUSTLE);
    this.set1f('uTones', TONES);
    this.set1f('uWarmth', WARMTH);
  }
}

/**
 * Sets the wind on some drawings, all of one size, standing on ground `span`
 * pixels wide. Without WebGL they simply stand still.
 */
export function blow(scene: Phaser.Scene, things: Phaser.GameObjects.Image[], span: number): void {
  if (scene.renderer.type !== Phaser.WEBGL || !things.length) return;
  const pipelines = (scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.has('Wind')) pipelines.add('Wind', new Wind(scene.game));
  const wind = pipelines.get('Wind') as unknown as Wind;
  wind.span = span;
  wind.drawn = { width: things[0].width, height: things[0].height };
  things.forEach((thing, i) => {
    // Red: how far across it stands. Green: a number of its own. Blue: its size.
    const across = Math.round(Phaser.Math.Clamp(thing.x / span, 0, 1) * 255);
    const own = (Math.imul(i + 1, 2654435761) >>> 24) & 255;
    thing.setPipeline('Wind').setTint((across << 16) | (own << 8) | Math.round(thing.scaleX));
  });
}
