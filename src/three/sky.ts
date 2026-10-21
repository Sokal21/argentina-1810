import * as THREE from 'three';

// The title's night sky, in 3D: a dome darkening from the horizon up, its stars twinkling, and
// clouds with body to them, in a layer high over the plaza. Each pixel looks out through that layer
// and gathers what it meets (a cloud's thickness, and how much of the moon reaches each part of it
// through the rest), so the clouds are lit on top and toward the moon and dark underneath, big
// overhead and small toward the horizon, drifting very slowly as the wind takes them. And now and
// then a star falls.
// Colours are written as they are to be shown (the shader is not converted).

/** The cloud layer: its floor and ceiling, how big a cloud is, the wind (units a second), how far off they fade. */
const CLOUDS = { floor: 1500, ceiling: 2700, size: 1500, wind: new THREE.Vector3(26, 0, 8), fade: [7000, 22000] };
/** The falling stars: one may fall each so many seconds (most often one does), taking so long, so long a streak (a share of the width). */
const FALLING = { every: 7, takes: 0.8, chance: 0.75, streak: 0.16 };
/** Where the moon is, as the Cabildo is lit from. */
const MOON = new THREE.Vector3(-400, 700, 600).normalize();

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uLayer;
  uniform float uSize;
  uniform vec3 uWind;
  uniform vec2 uFade;
  uniform vec3 uMoon;
  uniform vec2 uRes;
  uniform vec4 uFalling;
  varying vec3 vWorld;

  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), u.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), u.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }
  // How thick the cloud is at a point: billows of noise, strung out along the wind, flat beneath and
  // rounded above as clouds are; \`detail\` octaves of it (fewer for the light's rays).
  float density(vec3 p, int detail) {
    float h = (p.y - uLayer.x) / (uLayer.y - uLayer.x);
    if (h < 0.0 || h > 1.0) return 0.0;
    vec3 q = (p - uWind * uTime) / uSize * vec3(0.7, 1.6, 1.3);
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++) {
      if (i >= detail) break;
      v += a * noise(q);
      q = q * 2.1 + vec3(13.0, 7.0, 3.0);
      a *= 0.48;
    }
    float shape = smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.35, h);
    return clamp((v - 0.62 + 0.3 * (1.0 - shape)) * 10.0, 0.0, 1.0) * shape;
  }

  void main() {
    vec3 dir = normalize(vWorld - cameraPosition);
    float up = clamp(dir.y, 0.0, 1.0);
    // The sky, darkening from the horizon up.
    vec3 horizon = vec3(0.075, 0.17, 0.27), high = vec3(0.015, 0.04, 0.11);
    vec3 colour = mix(horizon, high, pow(up, 0.55));
    // Its stars, a pixel each, each twinkling at its own pace; fewer low down.
    vec2 cell = floor(gl_FragCoord.xy);
    if (hash2(cell) > 0.9975 - 0.0015 * up) {
      float beat = hash2(cell + 7.3);
      float shine = 0.55 + 0.45 * sin(uTime * (1.0 + 2.5 * beat) + beat * 40.0);
      colour = mix(colour, vec3(0.85, 0.9, 1.0), shine * (0.5 + 0.5 * hash2(cell + 3.1)) * smoothstep(0.02, 0.15, up));
    }

    // A falling star, now and then: which one is falling this while, whether one does, how far it has gone.
    float n = floor(uTime / uFalling.x), gone = (uTime - n * uFalling.x) / uFalling.y;
    if (gone < 1.0 && hash2(vec2(n, 1.7)) < uFalling.z) {
      vec2 from = vec2(0.15 + 0.7 * hash2(vec2(n, 2.3)), 0.6 + 0.35 * hash2(vec2(n, 3.1))) * uRes;
      float side = hash2(vec2(n, 4.9)) < 0.5 ? -1.0 : 1.0, fall = 0.35 + 0.35 * hash2(vec2(n, 5.3));
      vec2 way = normalize(vec2(side, -fall));
      float streak = uFalling.w * uRes.x;
      vec2 head = from + way * streak * 1.6 * gone;
      // Along the streak behind its head, and how far across from it.
      vec2 rel = gl_FragCoord.xy - head;
      float back = -dot(rel, way), across = abs(dot(rel, vec2(-way.y, way.x)));
      float tail = streak * min(1.0, gone * 2.5);
      if (back > -1.0 && back < tail && across < 1.5) {
        float glow = (1.0 - back / tail) * (1.0 - across / 1.5) * (1.0 - gone * gone);
        colour = mix(colour, vec3(0.92, 0.95, 1.0), clamp(glow * 1.4, 0.0, 1.0));
      }
    }

    // Through the cloud layer: from where the ray enters it to where it leaves, or fades from sight.
    if (dir.y > 0.01) {
      float t0 = (uLayer.x - cameraPosition.y) / dir.y, t1 = (uLayer.y - cameraPosition.y) / dir.y;
      t1 = min(t1, uFade.y);
      if (t0 < t1) {
        const int STEPS = 22;
        float stride = (t1 - t0) / float(STEPS);
        float t = t0 + stride * hash2(cell);
        float seen = 1.0;
        vec3 light = vec3(0.0);
        vec3 lit = vec3(0.33, 0.4, 0.54), dark = vec3(0.04, 0.065, 0.12);
        for (int i = 0; i < STEPS; i++) {
          vec3 p = cameraPosition + dir * t;
          float d = density(p, 4);
          if (d > 0.01) {
            // How much of the moon gets here through the cloud between.
            float shade = 0.0;
            for (int j = 1; j <= 3; j++) shade += density(p + uMoon * float(j) * 140.0, 2);
            float moon = exp(-shade * 2.2);
            float near = 1.0 - smoothstep(uFade.x, uFade.y, t);
            float a = min(1.0, d * stride * 0.004) * near;
            light += seen * a * mix(dark, lit, moon);
            seen *= 1.0 - a;
            if (seen < 0.03) break;
          }
          t += stride;
        }
        colour = colour * seen + light;
      }
    }
    gl_FragColor = vec4(colour, 1.0);
  }
`;

export class TitleSky {
  readonly scene = new THREE.Scene();
  private readonly time = { value: 0 };
  /** The size it is drawn at, in pixels. */
  private readonly res = { value: new THREE.Vector2(1, 1) };

  constructor() {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(100000, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false,
        uniforms: {
          uTime: this.time, uLayer: { value: new THREE.Vector2(CLOUDS.floor, CLOUDS.ceiling) }, uSize: { value: CLOUDS.size },
          uWind: { value: CLOUDS.wind }, uFade: { value: new THREE.Vector2(...CLOUDS.fade) }, uMoon: { value: MOON },
          uRes: this.res, uFalling: { value: new THREE.Vector4(FALLING.every, FALLING.takes, FALLING.chance, FALLING.streak) },
        },
      }),
    );
    this.scene.add(dome);
  }

  /** Sets the moment (seconds) it is drawn at, and its size in pixels. */
  at(t: number, wide: number, high: number): void {
    this.time.value = t;
    this.res.value.set(wide, high);
  }
}
