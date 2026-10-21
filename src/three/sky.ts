import * as THREE from 'three';

// The title's night sky, in 3D: a dome darkening from the horizon up, its stars twinkling, and a
// layer of clouds high over the plaza, seen in perspective from down in it (big and quick
// overhead, small and slow toward the horizon) as the wind takes them, very slowly. Drawn in the
// flat tones the painting's sky was drawn in, its gradient in steps: a picture made of pixels.
// Colours are written as they are to be shown (the shaders here are not converted).

/** How high the clouds are, how big, how fast the wind takes them (units a second), and how far off they fade. */
const CLOUDS = { high: 1800, size: 2600, wind: new THREE.Vector2(22, 6), fade: [18000, 60000] };

const DOME_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // Four by four ordered dither, for the gradient's steps to meet as pixel art does.
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    int i = int(q.x + q.y * 4.0);
    float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    return m[i] / 16.0 - 0.5;
  }
  void main() {
    float up = clamp(vDir.y, 0.0, 1.0);
    vec3 horizon = vec3(0.075, 0.17, 0.27), high = vec3(0.015, 0.04, 0.11);
    // In six steps from the horizon up, dithered where they meet.
    float k = pow(up, 0.55) * 6.0 + bayer(gl_FragCoord.xy);
    vec3 colour = mix(horizon, high, clamp(floor(k) / 6.0, 0.0, 1.0));
    // Stars, one pixel each, a few in a thousand, each twinkling at its own pace; fewer low down.
    vec2 cell = floor(gl_FragCoord.xy);
    float h = hash(cell);
    if (h > 0.9965 - 0.002 * up) {
      float beat = hash(cell + 7.3);
      float shine = 0.55 + 0.45 * sin(uTime * (1.0 + 2.5 * beat) + beat * 40.0);
      colour = mix(colour, vec3(0.85, 0.9, 1.0), shine * (0.5 + 0.5 * hash(cell + 3.1)) * smoothstep(0.02, 0.15, up));
    }
    gl_FragColor = vec4(colour, 1.0);
  }
`;

const CLOUD_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const CLOUD_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uWind;
  uniform vec2 uFade;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 p = (vWorld.xz - uWind * uTime) / uSize;
    // Long in the wind's way, as clouds strung out by it are.
    float d = fbm(vec2(p.x * 0.6, p.y * 1.4));
    // Lit from above by the moon: where it thins, the top of a cloud, lighter.
    float lit = fbm(vec2(p.x * 0.6, p.y * 1.4) + vec2(0.04, 0.08));
    float far = length(vWorld.xz - cameraPosition.xz);
    float fade = 1.0 - smoothstep(uFade.x, uFade.y, far);
    if (d < 0.58 || fade < 0.02) discard;
    // Three flat tones, as painted: the body, its lit side, its brightest edge.
    vec3 body = vec3(0.10, 0.17, 0.27), side = vec3(0.16, 0.25, 0.37), edge = vec3(0.27, 0.37, 0.5);
    vec3 colour = d > 0.64 ? (lit < d - 0.012 ? edge : side) : body;
    // Far off they melt into the sky by the horizon, in steps (dithered by pixels).
    float keep = step(fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453), fade);
    if (keep < 0.5) discard;
    gl_FragColor = vec4(colour, 1.0);
  }
`;

export class TitleSky {
  readonly scene = new THREE.Scene();
  private readonly time = { value: 0 };

  constructor() {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(100000, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms: { uTime: this.time }, side: THREE.BackSide, depthWrite: false }),
    );
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * CLOUDS.fade[1], 2 * CLOUDS.fade[1]),
      new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERTEX, fragmentShader: CLOUD_FRAGMENT, side: THREE.DoubleSide,
        uniforms: { uTime: this.time, uSize: { value: CLOUDS.size }, uWind: { value: CLOUDS.wind }, uFade: { value: new THREE.Vector2(...CLOUDS.fade) } },
      }),
    );
    clouds.rotation.x = -Math.PI / 2;
    clouds.position.y = CLOUDS.high;
    this.scene.add(dome, clouds);
  }

  /** Sets the moment (seconds) it is drawn at. */
  at(t: number): void {
    this.time.value = t;
  }
}
