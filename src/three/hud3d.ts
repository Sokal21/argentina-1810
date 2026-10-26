import * as THREE from 'three';
import { model } from './figure';
import type { Look } from './look';
import { unlitShader } from './pixels';

// The heroes' HUDs as things in 3D (the user's, 26 October 2026): Tripo's model of each (assets/hud/3d,
// from an HD concept of their 2D HUD with the level and stamina bars below), at the bottom of the
// screen. Drawn in the world's own picture it came out in the world's big pixels and could
// not be read, so it is drawn apart, at the screen's own pixels, on a canvas of its own between the
// world and the 2D game's, under the world's light (its sky, its ground and its sun's colours, and
// its toon steps). What moves is laid over the model: a glass of liquid over each painted orb (the
// 2D orb's shader, fx/orb.ts, on a sphere: the surface rocking, light drifting through in bands, the
// odd pixel twinkling, and the glass's shine), the level and stamina bars filling their channels,
// and the skills' pictures in the four slots, shaded while they cool down.

/**
 * Where a model's parts are, in its own units (one tall, its front toward +Z), measured on its front
 * (a grid over it, and rays cast at it for how deep each lies): its glasses (their middles and radius),
 * its four slots, its level bar's channel and the hollow its level is written in, its stamina bar's
 * channel; and how wide it is.
 */
export interface HudShape {
  url: string;
  wide: number;
  glasses: { x: number; y: number; z: number }[];
  radius: number;
  slots: { xs: number[]; y: number; z: number; size: number };
  level: { from: number; to: number; y: number; h: number; z: number; number: { x: number; y: number; w: number; h: number } };
  stamina: { from: number; to: number; y: number; h: number; z: number };
  /**
   * For one that does not stand out from the map on its own: a dark edge and shadow round its
   * outline (a CSS filter on its canvas, which is clear round it), and so much more light on it.
   */
  contrast?: { edge: string; light: number };
}

export const HUD_SHAPES: Record<'inti' | 'cabral', HudShape> = {
  // Her orbs are painted domes: the glasses lie over them, a little wider, and hide them (vistas_hud.png).
  inti: {
    url: 'hud/3d/hud_inti.glb', wide: 2.15,
    glasses: [{ x: -0.729, y: 0.631, z: 0 }, { x: 0.742, y: 0.627, z: 0 }], radius: 0.152,
    slots: { xs: [-0.349, -0.116, 0.12, 0.36], y: 0.603, z: 0.03, size: 0.15 },
    level: { from: -0.485, to: 0.6, y: 0.307, h: 0.05, z: 0.004, number: { x: -0.56, y: 0.31, w: 0.1, h: 0.05 } },
    stamina: { from: -0.445, to: 0.535, y: 0.162, h: 0.07, z: 0.004 },
  },
  // His flasks stand in iron cages: their painted glass is taken out (tools/blender/hollow_glass.py)
  // and the glasses sit within the cages, a little smaller than the flasks, so the iron is before them
  // (vistas_hud_cabral.png). The box is deep and the bars lie well before it.
  cabral: {
    url: 'hud/3d/hud_cabral.glb', wide: 2.46,
    glasses: [{ x: -0.965, y: 0.54, z: -0.225 }, { x: 0.948, y: 0.545, z: -0.225 }], radius: 0.215,
    slots: { xs: [-0.447, -0.145, 0.153, 0.453], y: 0.552, z: -0.14, size: 0.19 },
    level: { from: -0.447, to: 0.628, y: 0.213, h: 0.07, z: 0.215, number: { x: -0.6, y: 0.21, w: 0.12, h: 0.06 } },
    stamina: { from: -0.43, to: 0.603, y: 0.097, h: 0.07, z: 0.565 },
    // Dark wood, iron and grey stone, lost against the pampa's browns where hers stood out (the user).
    contrast: { edge: 'drop-shadow(0 0 1px #0a0807) drop-shadow(0 0 3px rgba(10, 8, 7, 0.9)) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6))', light: 1.3 },
  },
};
/**
 * How wide every hero's HUD is: this share of the screen's width, but no wider than a HUD shaped as
 * Inti's (`shaped`, its width over its height) standing this share of the screen's height; and its gap
 * above the bottom, in screen pixels. The same width for both: held to the height instead, Cabral's,
 * the longer, stood a seventh wider than hers.
 */
const FIT = { wide: 0.42, tall: 0.3, shaped: 2.15 / 1.06, margin: 8 };
/** What the camera takes in round it, in its own units: a little past its sides, and from just under its foot to just over its top. */
const FRAME = { past: 0.025, low: -0.03, high: 1.03 };
/** Where its sun shines from, in its own axes: high, from the upper left and before it. */
const SUN = new THREE.Vector3(-1, 1.3, 1.4);
/**
 * The light each glass gives off onto what holds it, in its liquid's lit colour: as strong as it is
 * full, breathing slowly between `low` and all of it (as the 2D orbs' halo); from four fifths of the
 * way to the front of the glass, reaching so far round it, in the model's units. It fades as the distance (decay 1),
 * not its square: in units this small, the square burnt the roots white beside the glass and left
 * those a little further dark.
 */
const GLOW = { strength: 0.8, low: 0.7, reach: 0.9 };
/** Seconds without being shown after which its canvas is hidden (the game asks for it every frame it is). */
const STALE = 0.25;

/** How each part is coloured: from the 2D HUD (HudScene's LAYOUTS), so both are alike; and the model it is. */
export interface HudLook {
  shape: HudShape;
  /** Each glass's deep, body, lit and surface colours: life, then mana. */
  vessels: [string, string, string, string][];
  /** The level bar's body and top line; the stamina bar's, and its own when spent. */
  level: [number, number];
  breath: { fill: [number, number]; spent: [number, number] };
  /** The four slots' pictures: the two skills, the greatest power, the flask. */
  icons: string[];
  /** How fast a glass's level slides to its new value, per second. */
  settle: number;
}

/** What it shows, read off the game each frame. */
export interface HudReading {
  life: number;
  /** What the other glass holds: her mana, his fury. */
  mana: number;
  level: number;
  /** How far toward the next level, 0 to 1. */
  growth: number;
  breath: number;
  winded: boolean;
  skills: { ready: boolean; cooldown: number }[];
  /** How charged the greatest power is, 0 to 1. */
  ultimate: number;
  draughts: number;
}

const ORB_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const ORB_FRAGMENT = unlitShader(/* glsl */ `
  uniform float time;
  uniform float level;
  uniform float radius;
  uniform vec3 deep;
  uniform vec3 body;
  uniform vec3 lit;
  uniform vec3 surface;
  varying vec3 vPos;
  varying vec3 vNormal;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec2 q = vPos.xy / radius;
    // How square on it faces the camera: 1 in the middle, 0 at its rim.
    float facing = max(n.z, 0.0);
    // The surface: two waves crossing, flattening as the glass empties or fills.
    float calm = smoothstep(0.0, 0.08, level) * smoothstep(1.0, 0.92, level);
    float wave = (sin(q.x * 7.0 + time * 2.1) + 0.6 * sin(q.x * 12.0 - time * 1.4)) * 0.035 * calm;
    float top = -1.0 + 2.0 * level + wave;
    // The empty glass, dark.
    vec3 colour = vec3(0.09, 0.08, 0.07) + 0.05 * facing;
    if (q.y < top && level > 0.0) {
      // Two layers of slow cloud moving against each other, cut into bands.
      float light = 0.6 * noise(q * 2.6 + vec2(time * 0.22, -time * 0.16)) + 0.4 * noise(q * 5.2 - vec2(time * 0.19, time * 0.27));
      float pulse = 0.5 + 0.5 * sin(time * 1.7);
      colour = body;
      if (light > 0.56 - 0.05 * pulse) colour = lit;
      if (light < 0.34) colour = mix(body, deep, 0.55);
      if (facing < 0.45) colour = deep;
      if (top - q.y < 0.07) colour = surface;
      // A few pixels catch the light for an instant.
      float spark = hash(floor(q * 30.0) + floor(time * 7.0) * 17.0);
      if (spark > 0.994 && facing > 0.5) colour = mix(colour, vec3(1.0), 0.75);
    }
    // The glass's shine, over liquid and empty alike: a broad one from the upper left, and a glint.
    vec3 sun = normalize(vec3(-0.45, 0.6, 0.66)), glint = normalize(vec3(0.55, 0.25, 0.8));
    float shine = 0.0;
    if (dot(reflect(-sun, n), vec3(0.0, 0.0, 1.0)) > 0.93) shine = 0.5;
    if (dot(reflect(-glint, n), vec3(0.0, 0.0, 1.0)) > 0.985) shine = 0.42;
    gl_FragColor = vec4(mix(colour, vec3(1.0), shine), 1.0);
  }`);

export class Hud3D {
  readonly group = new THREE.Group();
  private readonly renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly shape: HudShape;
  private readonly sky = new THREE.HemisphereLight();
  private readonly sun = new THREE.DirectionalLight();
  private shownAt = 0;
  private size = '';
  private readonly orbs: { material: THREE.ShaderMaterial; light: THREE.PointLight; shown: number }[] = [];
  private readonly levelBar: THREE.Group;
  private readonly breathBar: THREE.Group;
  private readonly breathBody: THREE.MeshBasicMaterial;
  private readonly breathTop: THREE.MeshBasicMaterial;
  private readonly slots: { icon: THREE.MeshBasicMaterial; shade: THREE.Mesh }[] = [];
  private readonly number: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; shown: number };
  private breathShown = 1;
  private time = 0;

  constructor(private readonly look: HudLook, beside: HTMLElement) {
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);pointer-events:none;display:none';
    if (look.shape.contrast) canvas.style.filter = look.shape.contrast.edge;
    beside.after(canvas);
    this.renderer.setPixelRatio(devicePixelRatio);
    const shape = this.shape = look.shape, half = shape.wide / 2 + FRAME.past;
    this.camera = new THREE.OrthographicCamera(-half, half, FRAME.high, FRAME.low, 0.1, 10);
    this.camera.position.set(0, 0, 5);
    this.sun.position.copy(SUN);
    this.scene.add(this.group, this.sky, this.sun);
    // Hidden once the game stops asking for it (another hero, the title, a map without it).
    const watch = () => {
      if (performance.now() - this.shownAt > STALE * 1000) canvas.style.display = 'none';
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    void model(shape.url, 1).then(body => {
      // Drawn at its own size here: the whole is scaled to the screen.
      body.scale.setScalar(1);
      body.traverse(node => {
        node.castShadow = node.receiveShadow = false;
        node.frustumCulled = false;
        // Seen at the screen's own pixels and smaller than its texture, it is smoothed, not blocked as the world's are.
        const map = node instanceof THREE.Mesh ? (node.material as THREE.MeshToonMaterial).map : null;
        if (map) { map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.needsUpdate = true; }
      });
      this.group.add(body);
    });
    const sphere = new THREE.SphereGeometry(shape.radius, 32, 16);
    look.vessels.forEach((colours, i) => {
      const [deep, body, lit, surface] = colours.map(c => new THREE.Color(c));
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, level: { value: 1 }, radius: { value: shape.radius }, deep: { value: deep }, body: { value: body }, lit: { value: lit }, surface: { value: surface } },
        vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT,
      });
      const glass = new THREE.Mesh(sphere, material);
      const at = shape.glasses[i];
      glass.position.set(at.x, at.y, at.z);
      const light = new THREE.PointLight(lit, 0, GLOW.reach, 1);
      light.position.set(at.x, at.y, at.z + shape.radius * 0.8);
      this.add(glass, light);
      this.orbs.push({ material, light, shown: NaN });
    });
    // A bar fills from its left end: a body and a lighter line along its top.
    const bar = (spec: { from: number; y: number; h: number; z: number }, body: THREE.MeshBasicMaterial, line: THREE.MeshBasicMaterial) => {
      const filled = new THREE.Group();
      const block = new THREE.BoxGeometry(1, 1, 0.01).translate(0.5, 0, 0);
      const fill = new THREE.Mesh(block, body);
      fill.scale.y = spec.h;
      const top = new THREE.Mesh(block, line);
      top.scale.y = spec.h * 0.2;
      top.position.set(0, spec.h * 0.4, 0.001);
      filled.add(fill, top);
      filled.position.set(spec.from, spec.y, spec.z);
      this.add(filled);
      return filled;
    };
    this.levelBar = bar(shape.level, new THREE.MeshBasicMaterial({ color: look.level[0] }), new THREE.MeshBasicMaterial({ color: look.level[1] }));
    this.breathBody = new THREE.MeshBasicMaterial({ color: look.breath.fill[0] });
    this.breathTop = new THREE.MeshBasicMaterial({ color: look.breath.fill[1] });
    this.breathBar = bar(shape.stamina, this.breathBody, this.breathTop);
    // The slots: a picture in each, and a shade drawn down over it from its top while it cools down.
    const loader = new THREE.TextureLoader();
    const slots = shape.slots;
    const square = new THREE.PlaneGeometry(slots.size, slots.size);
    const hanging = new THREE.PlaneGeometry(slots.size, 1).translate(0, -0.5, 0);
    look.icons.forEach((src, i) => {
      const map = loader.load(src);
      map.minFilter = map.magFilter = THREE.NearestFilter;
      map.colorSpace = THREE.SRGBColorSpace;
      const icon = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5 });
      const picture = new THREE.Mesh(square, icon);
      picture.position.set(slots.xs[i], slots.y, slots.z);
      const shade = new THREE.Mesh(hanging, new THREE.MeshBasicMaterial({ color: 0x0c0a08, transparent: true, opacity: 0.75 }));
      shade.position.set(slots.xs[i], slots.y + slots.size / 2, slots.z + 0.003);
      shade.scale.y = 0;
      this.add(picture, shade);
      this.slots.push({ icon, shade });
    });
    // The level, written in the hollow at the level bar's left end.
    const board = Object.assign(document.createElement('canvas'), { width: 32, height: 16 });
    const texture = new THREE.CanvasTexture(board);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const { number } = shape.level;
    const written = new THREE.Mesh(new THREE.PlaneGeometry(number.w, number.h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.5 }));
    written.position.set(number.x, number.y, shape.level.z + 0.01);
    this.add(written);
    this.number = { canvas: board, texture, shown: NaN };
  }

  private add(...things: THREE.Object3D[]): void {
    for (const thing of things) { thing.frustumCulled = false; this.group.add(thing); }
  }

  /** Shows what the game reads now, under the world's light as its look has it, and draws it. */
  read(r: HudReading, dt: number, look: Look): void {
    this.shownAt = performance.now();
    this.time += dt;
    this.fit();
    this.sky.color.set(look.skyColour);
    this.sky.groundColor.set(look.groundColour);
    const lift = this.shape.contrast?.light ?? 1;
    this.sky.intensity = look.skyStrength * lift;
    this.sun.color.set(look.sunColour);
    this.sun.intensity = look.sunStrength * lift;
    [r.life, r.mana].forEach((level, i) => {
      const orb = this.orbs[i];
      if (!orb) return;
      const want = Math.max(0, Math.min(1, level));
      // The first time it is simply at its level; after that it slides.
      orb.shown = Number.isNaN(orb.shown) ? want : orb.shown + (want - orb.shown) * Math.min(1, dt * this.look.settle);
      orb.material.uniforms.level.value = orb.shown;
      orb.material.uniforms.time.value = this.time;
      // The fuller it is the more it lights what holds it, breathing slowly.
      const breath = 0.5 + 0.5 * Math.sin(this.time * 1.7);
      orb.light.intensity = GLOW.strength * orb.shown * (GLOW.low + (1 - GLOW.low) * breath);
    });
    const { level, stamina, slots } = this.shape;
    this.levelBar.scale.x = Math.max(1e-4, (level.to - level.from) * Math.min(1, r.growth));
    // The breath slides to where it is, quickly, and turns red when it is spent.
    this.breathShown += (r.breath - this.breathShown) * Math.min(1, dt * 14);
    this.breathBar.scale.x = Math.max(1e-4, (stamina.to - stamina.from) * Math.max(0, Math.min(1, this.breathShown)));
    const [body, line] = r.winded ? this.look.breath.spent : this.look.breath.fill;
    this.breathBody.color.setHex(body);
    this.breathTop.color.setHex(line);
    // The two skills: shaded while they cool down; there but dull when unpaid for or busy.
    r.skills.forEach((skill, i) => {
      const slot = this.slots[i];
      if (!slot) return;
      slot.shade.scale.y = slots.size * skill.cooldown;
      slot.icon.color.setScalar(skill.ready || skill.cooldown > 0 ? 1 : 0.35);
    });
    // The greatest power: shaded over what is not yet charged, and pulsing once it is.
    const power = this.slots[2], charged = Math.max(0, Math.min(1, r.ultimate)), pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    if (power) {
      power.shade.scale.y = slots.size * (1 - charged);
      if (charged >= 1) power.icon.color.setRGB(1, 0.84 + 0.16 * pulse, 0.67 + 0.33 * pulse);
      else power.icon.color.setScalar(0.7);
    }
    // The flask, dull when nothing is left in it.
    this.slots[3]?.icon.color.setScalar(r.draughts > 0 ? 1 : 0.3);
    if (r.level !== this.number.shown) {
      this.number.shown = r.level;
      const c = this.number.canvas.getContext('2d')!;
      c.clearRect(0, 0, 32, 16);
      c.font = "8px 'Silkscreen', monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 3;
      c.strokeStyle = '#14110f';
      c.strokeText(String(r.level), 16, 8);
      c.fillStyle = '#f0e3c4';
      c.fillText(String(r.level), 16, 8);
      this.number.texture.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** Its canvas as wide as the screen allows, at the bottom of it; shown. */
  private fit(): void {
    const own = this.shape.wide, across = own + 2 * FRAME.past, tall = FRAME.high - FRAME.low;
    const wide = Math.min(innerWidth * FIT.wide, innerHeight * FIT.tall * FIT.shaped);
    const w = Math.round(wide * across / own), h = Math.round(w * tall / across);
    const canvas = this.renderer.domElement;
    canvas.style.display = '';
    if (`${w}x${h}` === this.size) return;
    this.size = `${w}x${h}`;
    this.renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.bottom = `${FIT.margin}px`;
  }
}
