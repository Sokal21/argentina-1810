import Phaser from 'phaser';

// A patch of burning ground: tongues of flame rising from an ellipse of
// embers. Drawn on its own coarse pixel grid, in a few flat colours, so it
// sits with the sprites instead of looking like a filter. `life` runs from
// 1 down to 0 as it burns out, and the flames sink with it.
const FRAG = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float life;
uniform float seed;

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

void main() {
  vec2 p = floor(fragCoord) + 0.5;
  // The bottom half of the quad is the ground it burns on; the flames stand
  // in the rest. x runs -1..1 across the patch, y is height above its middle.
  float half_w = resolution.x * 0.5;
  float ground = resolution.x * 0.25;        // the ellipse is half as tall as wide
  vec2 q = vec2((p.x - half_w) / half_w, (p.y - ground) / ground);

  // Embers: the ellipse itself, glowing and flickering.
  float inside = 1.0 - smoothstep(0.75, 1.0, length(q));
  float ember = inside * (0.55 + 0.45 * noise(p * 0.35 + seed + vec2(0.0, time * 1.5)));

  // Flames: noise scrolling upward, strongest over the middle and near the
  // ground, tapering to points as it climbs.
  float up = max(0.0, q.y + 0.3) / (2.6 * (0.35 + 0.65 * life));
  float reach = (1.0 - q.x * q.x) * (1.0 - up);
  float lick = noise(vec2(p.x * 0.22 + seed, p.y * 0.16 - time * 3.2))
             * 0.65 + noise(vec2(p.x * 0.5 - seed, p.y * 0.33 - time * 5.0)) * 0.35;
  float flame = reach > 0.0 && q.y > -0.6 ? lick * reach * 1.7 * (0.5 + 0.5 * life) : 0.0;

  float heat = max(flame, ember * 0.62) * smoothstep(0.0, 0.12, life);
  vec3 colour;
  float alpha;
  if (heat > 0.80) { colour = vec3(1.0, 0.97, 0.78); alpha = 1.0; }
  else if (heat > 0.62) { colour = vec3(1.0, 0.80, 0.22); alpha = 1.0; }
  else if (heat > 0.46) { colour = vec3(1.0, 0.48, 0.06); alpha = 0.95; }
  else if (heat > 0.33) { colour = vec3(0.78, 0.16, 0.04); alpha = 0.85; }
  else if (ember > 0.2) { colour = vec3(0.16, 0.07, 0.04); alpha = 0.45 * inside; }
  else { colour = vec3(0.0); alpha = 0.0; }

  gl_FragColor = vec4(colour * alpha, alpha);
}
`;

/** How much taller than wide the quad a fire is drawn in has to be, to fit its flames. */
export const FIRE_TALL = 1.1;

/** The shader for one patch of fire; `seed` keeps two patches from burning in step. */
export function fireShader(key: string, seed: number): Phaser.Display.BaseShader {
  return new Phaser.Display.BaseShader(key, FRAG, undefined, {
    life: { type: '1f', value: 1 },
    seed: { type: '1f', value: seed },
  });
}
