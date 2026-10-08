import Phaser from 'phaser';

// One full-screen pass with the three looks chosen in the canvas prototype:
//  - grain: film grain on the sprite pixel grid, changing ten times a second;
//  - light: darkness away from the machi and a warm glow around her, at
//    screen resolution over the upscaled pixels;
//  - crt: scanlines, a faint RGB mask, a vignette and a little extra punch.
// Each one is scaled by a 0..1 uniform so it can be switched off.
const fragShader = `
#define SHADER_NAME LOOK_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution; // screen size in pixels
uniform vec2 uLightPos;   // her chest, in screen pixels from the top-left
uniform float uTime;      // seconds
uniform float uPixel;     // screen pixels per sprite pixel
uniform float uGrain;
uniform float uLight;
uniform float uCrt;

varying vec2 outTexCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 overlay(vec3 base, float n) {
  return mix(2.0 * base * n, 1.0 - 2.0 * (1.0 - base) * (1.0 - n), step(0.5, base));
}

vec3 softLight(vec3 base, vec3 s) {
  vec3 dark = 2.0 * base * s + base * base * (1.0 - 2.0 * s);
  vec3 lit = sqrt(base) * (2.0 * s - 1.0) + 2.0 * base * (1.0 - s);
  return mix(dark, lit, step(0.5, s));
}

// Value that goes a -> b over the first 55% of t and b -> c over the rest.
float ramp(float t, float a, float b, float c) {
  return t < 0.55 ? mix(a, b, t / 0.55) : mix(b, c, clamp((t - 0.55) / 0.45, 0.0, 1.0));
}

void main() {
  vec3 col = texture2D(uMainSampler, outTexCoord).rgb;
  // The frame is stored bottom-up; work in pixels measured from the top-left.
  vec2 px = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uResolution;
  float vmin = min(uResolution.x, uResolution.y);

  if (uGrain > 0.0) {
    vec2 cell = floor(px / uPixel);
    float n = hash(cell + floor(uTime * 10.0) * vec2(37.0, 53.0));
    // Overlay grains the mid-tones; a fainter screen pass reaches the
    // near-black clothes, which overlay alone leaves untouched.
    col = mix(col, overlay(col, n), 0.16 * uGrain);
    col = mix(col, 1.0 - (1.0 - col) * (1.0 - n), 0.05 * uGrain);
  }

  if (uLight > 0.0) {
    float d = distance(px, uLightPos) / vmin;
    float glow = ramp(d / 0.20, 0.75, 0.28, 0.0);
    col = mix(col, softLight(col, vec3(1.0, 0.78, 0.5)), glow * uLight);
    float dark = ramp(d / 0.36, 0.0, 0.25, 0.78);
    col = mix(col, vec3(0.024, 0.031, 0.078), dark * uLight);
  }

  if (uCrt > 0.0) {
    vec3 c = (col - 0.5) * 1.12 + 0.5;
    c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.2);
    // Dark on the last pixel and a half of every four.
    c *= 1.0 - 0.32 * step(2.5, mod(px.y, 4.0));
    float column = mod(floor(px.x), 3.0);
    vec3 mask = column < 1.0 ? vec3(1.0, 0.0, 0.0) : column < 2.0 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    c = mix(c, mask, 0.055);
    vec2 edge = min(px, uResolution - px) / (0.22 * vmin);
    float inset = 1.0 - clamp(min(edge.x, edge.y), 0.0, 1.0);
    c *= 1.0 - 0.7 * inset * inset;
    col = mix(col, c, uCrt);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export class LookFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  grain = 1;
  light = 1;
  crt = 1;
  /** Screen pixels per sprite pixel (the camera zoom). */
  pixel = 2;
  lightX = 0;
  lightY = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'LookFX', fragShader });
  }

  onPreRender(): void {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set2f('uLightPos', this.lightX, this.lightY);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uPixel', this.pixel);
    this.set1f('uGrain', this.grain);
    this.set1f('uLight', this.light);
    this.set1f('uCrt', this.crt);
  }
}
