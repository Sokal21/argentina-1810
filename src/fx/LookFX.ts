import Phaser from 'phaser';

// One full-screen pass. First the weather, which belongs to the world and so
// sits under the looks:
//  - snow: three depths of flakes drifting down on the sprite pixel grid;
//  - leaves: maple leaves blown across, turning as they fall.
// Both are anchored to the ground, so they slide past as the camera moves.
// Then the three looks chosen in the canvas prototype:
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
uniform float uDark;      // how dark it gets away from her, 0 to 1
uniform float uReach;     // how far her light carries, in screen heights
uniform float uGlow;      // how strong the warm glow round her is
uniform float uCrt;
uniform float uSnow;
uniform float uLeaves;
uniform vec2 uScroll;     // the camera's place in the world, in sprite pixels

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

// Whether this sprite pixel is part of a flake in one depth of snow. The
// world is cut into cells, each holding at most one flake at a spot of its
// own, and the whole grid slides down and across in whole pixels.
float snow(vec2 sp, float cell, float fall, float wind, float size, float seed) {
  vec2 p = sp - floor(vec2(wind, fall) * uTime);
  vec2 id = floor(p / cell);
  float r = hash(id + seed);
  if (r > 0.8) return 0.0;
  vec2 at = vec2(hash(id + seed + 1.7), hash(id + seed + 4.1)) * (cell - size - 6.0) + 3.0;
  at.x += sin(uTime * 1.3 + r * 40.0) * 2.5;   // each flake sways on its own beat
  vec2 d = p - id * cell - floor(at);
  return step(0.0, d.x) * step(d.x, size - 0.5) * step(0.0, d.y) * step(d.y, size - 0.5);
}

// A maple leaf, eleven pixels a side and the same on both halves. Each row
// is a number whose bits say which pixels of one half are filled, from the
// edge (lowest bit) in to the middle column.
float maple(vec2 at) {
  if (at.x < 0.0 || at.x > 10.5 || at.y < 0.0 || at.y > 10.5) return 0.0;
  float y = floor(at.y);
  float row = y < 1.0 ? 32.0 : y < 2.0 ? 48.0 : y < 3.0 ? 50.0 : y < 4.0 ? 54.0
            : y < 5.0 ? 63.0 : y < 6.0 ? 62.0 : y < 7.0 ? 60.0 : y < 8.0 ? 62.0
            : y < 9.0 ? 56.0 : 32.0;
  float fromEdge = 5.0 - abs(floor(at.x) - 5.0);
  return mod(floor(row / pow(2.0, fromEdge)), 2.0);
}

// The same for autumn's leaves, which are fewer, larger and coloured. Each
// turns about its stem as it falls: face on, half turned, edge on, half turned.
// Returns the leaf's colour and whether there is one.
vec4 leaf(vec2 sp, float cell, float fall, float wind, float seed) {
  vec2 p = sp - floor(vec2(wind, fall) * uTime);
  vec2 id = floor(p / cell);
  float r = hash(id + seed);
  if (r > 0.55) return vec4(0.0);
  vec2 at = vec2(hash(id + seed + 2.3), hash(id + seed + 5.9)) * (cell - 30.0) + 9.0;
  at += vec2(sin(uTime * 1.6 + r * 30.0) * 5.0, cos(uTime * 2.1 + r * 17.0) * 2.0);
  vec2 d = p - id * cell - floor(at);
  // Face on for half of each turn, so its shape is there to be seen.
  float turn = mod(floor(uTime * 4.0 + r * 10.0), 6.0);
  float width = turn < 3.0 ? 1.0 : turn < 4.0 ? 0.7 : turn < 5.0 ? 0.25 : 0.7;
  // Squeezed toward its middle column, which is how a turning leaf looks.
  // Each lies at an angle of its own and drifts round slowly, one way or the other.
  float angle = hash(id + seed + 3.3) * 6.2832 + uTime * (hash(id + seed + 7.7) - 0.5) * 1.6;
  // And is a size of its own: this one at most, down to about two thirds of it.
  vec2 c = (d - 5.0) * (1.0 + hash(id + seed + 8.3) * 0.5);
  vec2 lying = vec2(c.x * cos(angle) + c.y * sin(angle), c.y * cos(angle) - c.x * sin(angle));
  vec2 bit = vec2(floor(lying.x / width + 5.5), floor(lying.y + 5.5));
  float inside = maple(bit);
  float pick = hash(id + seed + 9.1);
  vec3 colour = pick < 0.35 ? vec3(0.78, 0.20, 0.10) : pick < 0.65 ? vec3(0.86, 0.45, 0.12)
              : pick < 0.88 ? vec3(0.88, 0.68, 0.20) : vec3(0.50, 0.27, 0.12);
  // The stem and the vein running up from it are darker.
  if (bit.x > 4.5 && bit.x < 5.5 && bit.y > 4.5) colour *= 0.65;
  return vec4(colour, inside);
}

void main() {
  vec3 col = texture2D(uMainSampler, outTexCoord).rgb;
  // The frame is stored bottom-up; work in pixels measured from the top-left.
  vec2 px = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uResolution;
  float vmin = min(uResolution.x, uResolution.y);
  // The same spot counted in sprite pixels of the world.
  vec2 sp = floor(px / uPixel) + floor(uScroll);

  if (uLeaves > 0.0) {
    // A warmer, slightly faded day.
    col = mix(col, softLight(col, vec3(0.62, 0.5, 0.38)), 0.35 * uLeaves);
    vec4 far = leaf(sp, 64.0, 26.0, 30.0, 11.0);
    vec4 near = leaf(sp + floor(uScroll * 0.25), 96.0, 44.0, 52.0, 47.0);
    col = mix(col, far.rgb * 0.7, far.a * uLeaves);
    col = mix(col, near.rgb, near.a * uLeaves);
  }

  if (uSnow > 0.0) {
    // Colder and paler, as under an overcast sky.
    col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))) * vec3(0.92, 0.98, 1.1), 0.28 * uSnow);
    float flakes = 0.5 * snow(sp, 26.0, 20.0, 5.0, 1.0, 3.0)
                 + 0.75 * snow(sp, 38.0, 34.0, 9.0, 1.0, 19.0)
                 + snow(sp + floor(uScroll * 0.25), 58.0, 54.0, 15.0, 2.0, 31.0);
    col = mix(col, vec3(0.93, 0.96, 1.0), clamp(flakes, 0.0, 1.0) * uSnow);
  }

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
    float glow = ramp(d / 0.20, uGlow, uGlow * 0.37, 0.0);
    col = mix(col, softLight(col, vec3(1.0, 0.78, 0.5)), glow * uLight);
    float dark = ramp(d / uReach, 0.0, uDark * 0.32, uDark);
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
  snow = 0;
  leaves = 0;
  /** The camera's scroll, in sprite pixels. */
  scrollX = 0;
  scrollY = 0;
  /** Screen pixels per sprite pixel (the camera zoom). */
  pixel = 2;
  lightX = 0;
  lightY = 0;
  /** How dark it gets away from the light, how far the light carries and how warm it glows. */
  dark = 0.51;
  reach = 0.52;
  glow = 0.68;

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
    this.set1f('uDark', this.dark);
    this.set1f('uReach', this.reach);
    this.set1f('uGlow', this.glow);
    this.set1f('uCrt', this.crt);
    this.set1f('uSnow', this.snow);
    this.set1f('uLeaves', this.leaves);
    this.set2f('uScroll', this.scrollX, this.scrollY);
  }
}
