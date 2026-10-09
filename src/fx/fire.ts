import Phaser from 'phaser';

// A patch of burning ground: a ragged stain of embers, hottest in the middle
// and fading out through orange to scorched earth, with a few low flames. Drawn on its own coarse pixel grid, in a few flat colours, so it
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
  // The bottom half of the quad is the ground it burns on; what little
  // flame there is stands in the rest. x runs -1..1 across the patch, y is
  // height above its middle.
  float half_w = resolution.x * 0.5;
  float ground = resolution.x * 0.25;        // flattened: half as tall as wide
  vec2 q = vec2((p.x - half_w) / half_w, (p.y - ground) / ground);

  // How far out from the middle, with the edge pushed in and out by slow
  // noise so the patch is a ragged stain and not a disc.
  float ragged = noise(p * 0.13 + seed) * 0.55 + noise(p * 0.31 - seed) * 0.25;
  float out_ = length(q) + (ragged - 0.4) * 0.9;

  // Heat falls away from the middle to nothing, in a long slope, and
  // shifts about as the embers breathe.
  float breathe = noise(p * 0.3 + seed + vec2(time * 0.6, time * 1.1)) * 0.6
                + noise(p * 0.7 - vec2(time * 1.7, 0.0)) * 0.4;
  float ember = (1.0 - smoothstep(0.0, 1.0, out_)) * (0.45 + 0.85 * breathe);

  // A few low flames over the hottest part.
  float up = max(0.0, q.y + 0.2) / (0.9 * (0.35 + 0.65 * life));
  float reach = (1.0 - q.x * q.x) * (1.0 - up) * (1.0 - smoothstep(0.2, 0.8, out_));
  float lick = noise(vec2(p.x * 0.24 + seed, p.y * 0.2 - time * 3.0));
  float flame = reach > 0.0 && q.y > -0.2 ? lick * reach * 0.95 : 0.0;

  float heat = max(flame, ember) * smoothstep(0.0, 0.25, life) * (0.55 + 0.45 * life);
  vec3 colour;
  float alpha;
  if (heat > 0.80) { colour = vec3(1.0, 0.84, 0.36); alpha = 1.0; }
  else if (heat > 0.60) { colour = vec3(1.0, 0.58, 0.08); alpha = 0.95; }
  else if (heat > 0.42) { colour = vec3(0.96, 0.38, 0.03); alpha = 0.8; }
  else if (heat > 0.27) { colour = vec3(0.70, 0.20, 0.03); alpha = 0.55; }
  else if (heat > 0.14) { colour = vec3(0.20, 0.08, 0.04); alpha = 0.4; }
  else { colour = vec3(0.0); alpha = 0.0; }

  gl_FragColor = vec4(colour * alpha, alpha);
}
`;

/** How much taller than wide the quad a fire is drawn in has to be, to fit its flames. */
export const FIRE_TALL = 0.7;

/** The shader for one patch of fire; `seed` keeps two patches from burning in step. */
export function fireShader(key: string, seed: number): Phaser.Display.BaseShader {
  return new Phaser.Display.BaseShader(key, FRAG, undefined, {
    life: { type: '1f', value: 1 },
    seed: { type: '1f', value: seed },
  });
}
