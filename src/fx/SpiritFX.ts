import Phaser from 'phaser';

// What marks the nahuel as a spirit. Round its body lies a halo of its own
// light, in blocks on the sprite pixel grid; above it the light licks upward
// and breaks off like marsh fire; and the cyan of its eyes and rings pulses
// toward white. `power` fades all of it in and out with the animal.
const fragShader = `
#define SHADER_NAME SPIRIT_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixel;   // screen pixels per sprite pixel
uniform float uPower;
uniform vec3 uColour;

varying vec2 outTexCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  // One sprite pixel, and the middle of the one this fragment falls in. The
  // top of the screen is at 1, so "below" is toward 0.
  vec2 one = uPixel / uResolution;
  vec2 cell = floor(outTexCoord / one);
  vec2 at = (cell + 0.5) * one;

  // How much of the animal lies close by, all round.
  float near = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 dir = vec2(cos(a), sin(a));
    near += texture2D(uMainSampler, at + dir * one * 2.0).a;
    near += texture2D(uMainSampler, at + dir * one * 4.0).a;
  }
  float halo = clamp(near / 16.0 * 1.5, 0.0, 1.0);

  // And how much lies below, swaying: that is what the fire rises from.
  float sway = (noise(vec2(cell.x * 0.3, cell.y * 0.22 + uTime * 2.4)) - 0.5) * 4.0;
  float below = 0.0;
  for (int i = 1; i <= 7; i++) {
    below += texture2D(uMainSampler, at + vec2(sway, -float(i) * 1.6) * one).a;
  }
  // Tongues of it, climbing: the pattern slides up the screen.
  float tongues = noise(vec2(cell.x * 0.42, cell.y * 0.26 - uTime * 3.2));
  float fire = clamp(below / 4.0, 0.0, 1.0) * smoothstep(0.42, 0.7, tongues);

  float breath = 0.82 + 0.18 * sin(uTime * 2.6);
  float glow = max(halo * 0.5, fire * 0.85) * breath * uPower;
  // In a few flat steps, like the rest of the art.
  glow = floor(glow * 4.0 + 0.5) / 4.0;

  // Its eyes and rings: whatever is cyan burns toward white, pulsing.
  vec3 rgb = c.rgb;
  if (c.a > 0.001) {
    vec3 own = c.rgb / c.a;
    float cyan = smoothstep(0.22, 0.45, (own.g + own.b) * 0.5 - own.r);
    float pulse = 0.5 + 0.5 * sin(uTime * 4.2);
    rgb = mix(rgb, vec3(0.86, 1.0, 1.0) * c.a, cyan * (0.3 + 0.45 * pulse) * uPower);
  }

  // The light shows only where the animal is not; a low alpha lets it add
  // to what is behind it rather than cover it.
  float out_ = glow * (1.0 - c.a);
  gl_FragColor = vec4(rgb + uColour * out_, max(c.a, out_ * 0.45));
}
`;

export class SpiritFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** How strongly it shows, from 0 to 1. */
  power = 1;
  /** Screen pixels per sprite pixel (the camera zoom). */
  pixel = 2;
  colour: [number, number, number] = [0.27, 0.9, 0.98];

  constructor(game: Phaser.Game) {
    super({ game, name: 'SpiritFX', fragShader });
  }

  onPreRender(): void {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uPixel', this.pixel);
    this.set1f('uPower', this.power);
    this.set3f('uColour', ...this.colour);
  }
}
