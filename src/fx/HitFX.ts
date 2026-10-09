import Phaser from 'phaser';

// What happens to a sprite that is hurt. `amount` flashes it red, from 1
// (solid red) to 0 (untouched). `burn` sets it smouldering: patches of orange
// creep up over its own colours, in flat blocks on the sprite pixel grid,
// brighter here and there. Each object gets its own copy, so they flash and
// burn on their own.
const fragShader = `
#define SHADER_NAME HIT_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uAmount;
uniform float uBurn;
uniform float uTime;
uniform float uPixel;   // screen pixels per sprite pixel

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
  if (uBurn > 0.0) {
    // Heat rising across the sprite, cut into three flat levels.
    vec2 cell = floor(gl_FragCoord.xy / uPixel);
    float heat = noise(cell * vec2(0.42, 0.3) - vec2(0.0, uTime * 2.6))
               * 0.7 + noise(cell * 0.9 + vec2(uTime * 1.3, -uTime * 4.0)) * 0.3;
    vec3 glow = heat > 0.66 ? vec3(1.0, 0.82, 0.30) : vec3(1.0, 0.46, 0.06);
    float much = heat > 0.66 ? 0.9 : heat > 0.44 ? 0.62 : 0.3;
    c.rgb = mix(c.rgb, glow * c.a, much * uBurn);
  }
  // Colours arrive multiplied by alpha; the red has to be as well, or it
  // would bleed into the transparent pixels around the shape.
  vec3 red = vec3(1.0, 0.16, 0.12) * c.a;
  gl_FragColor = vec4(mix(c.rgb, red, uAmount), c.a);
}
`;

export class HitFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  amount = 0;
  burn = 0;
  /** Screen pixels per sprite pixel (the camera zoom). */
  pixel = 2;

  constructor(game: Phaser.Game) {
    super({ game, name: 'HitFX', fragShader });
  }

  onPreRender(): void {
    this.set1f('uAmount', this.amount);
    this.set1f('uBurn', this.burn);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uPixel', this.pixel);
  }
}
