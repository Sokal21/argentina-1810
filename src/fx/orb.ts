import Phaser from 'phaser';

// A glass orb and the liquid in it. Drawn on the orb's own pixel grid, so it
// stays as blocky as the frame around it however far the HUD is scaled up.
// The liquid's surface rocks, light drifts through it in flat bands, and the
// odd pixel twinkles.
const FRAG = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float level;   // 0 empty, 1 full
uniform vec3 deep;     // the liquid at the rim and in its shadows
uniform vec3 body;
uniform vec3 lit;      // where the light drifting through it falls
uniform vec3 surface;  // the line along its top

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
  vec2 q = p - resolution * 0.5;          // from the centre, y up
  float radius = resolution.x * 0.5 - 0.5;
  float d = length(q);
  if (d > radius + 0.3) { gl_FragColor = vec4(0.0); return; }

  // The surface: two waves crossing, flattening as the orb empties or fills.
  float calm = smoothstep(0.0, 0.08, level) * smoothstep(1.0, 0.92, level);
  float wave = (sin(q.x * 0.24 + time * 2.1) + 0.6 * sin(q.x * 0.43 - time * 1.4)) * 1.1 * calm;
  float top = floor(-radius + level * 2.0 * radius + wave + 0.5);

  vec3 colour = vec3(0.07, 0.06, 0.05);
  float alpha = d > radius - 2.0 ? 0.92 : 0.82;

  if (q.y < top && level > 0.0) {
    alpha = 1.0;
    // Two layers of slow cloud moving against each other, cut into bands.
    float light = 0.6 * noise(q * 0.085 + vec2(time * 0.22, -time * 0.16))
                + 0.4 * noise(q * 0.17 - vec2(time * 0.19, time * 0.27));
    float pulse = 0.5 + 0.5 * sin(time * 1.7);
    colour = body;
    if (light > 0.56 - 0.05 * pulse) colour = lit;
    if (light < 0.34) colour = mix(body, deep, 0.55);
    if (d > radius - 3.0 || length(q + vec2(0.0, 6.0)) > radius - 5.0) colour = deep;
    if (top - q.y < 1.5) colour = surface;
    // A few pixels catch the light for an instant.
    float spark = hash(p + floor(time * 7.0) * 17.0);
    if (spark > 0.994 && d < radius - 4.0) colour = mix(colour, vec3(1.0), 0.75);
  }

  // The glass's shine, over liquid and empty space alike.
  float shine = 0.0;
  if (length(vec2((q.x - 11.0) / 1.7, q.y - 15.0)) < 3.6) shine = 0.45;
  if (length(q - vec2(17.0, 7.0)) < 1.6) shine = 0.4;
  colour = mix(colour, vec3(1.0), shine);
  alpha = max(alpha, shine);

  gl_FragColor = vec4(colour * alpha, alpha);
}
`;

const rgb = (hex: string) => {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  return { x: c.redGL, y: c.greenGL, z: c.blueGL };
};

/** The shader for an orb of liquid in these colours: deep, body, lit and surface. */
export function orbShader(key: string, colours: [string, string, string, string]): Phaser.Display.BaseShader {
  const [deep, body, lit, surface] = colours.map(rgb);
  return new Phaser.Display.BaseShader(key, FRAG, undefined, {
    level: { type: '1f', value: 1 },
    deep: { type: '3f', value: deep },
    body: { type: '3f', value: body },
    lit: { type: '3f', value: lit },
    surface: { type: '3f', value: surface },
  });
}
