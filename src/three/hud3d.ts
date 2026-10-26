import * as THREE from 'three';
import { model } from './figure';
import { unlitShader } from './pixels';

// Inti's HUD as a thing in the world, on trial (the user's, 26 October 2026): Tripo's model of it
// (assets/hud/3d, from an HD concept of hud_a with the level and stamina bars below), stood before
// the camera at the bottom of the screen, so the world's light, pixels and finish fall on it as on
// everything else. What moves is laid over the model: a glass of liquid over each painted orb (the
// 2D orb's shader, fx/orb.ts, on a sphere: the surface rocking, light drifting through in bands, the
// odd pixel twinkling, and the glass's shine), the level and stamina bars filling their channels,
// and the skills' pictures in the four slots, shaded while they cool down.

const URL = 'hud/3d/hud_inti.glb';
/** Where its parts are, in the model's own units (one tall, its front toward +Z), measured on its front (assets/hud/3d/vistas_hud.png). */
const ORBS = [{ x: -0.729, y: 0.631 }, { x: 0.742, y: 0.627 }];
/** The glasses' radius: a little over the painted orbs', which they hide. */
const ORB_R = 0.152;
const SLOTS = { xs: [-0.349, -0.116, 0.12, 0.36], y: 0.603, z: 0.03, size: 0.15 };
const LEVEL = { from: -0.485, to: 0.6, y: 0.307, h: 0.05, z: 0.004, number: { x: -0.56, y: 0.31, w: 0.1, h: 0.05 } };
const STAMINA = { from: -0.445, to: 0.535, y: 0.162, h: 0.07, z: 0.004 };
/** Its width (its own is 2.15) as a share of the screen's width, at most this share of its height, and its gap above the bottom. */
const FIT = { wide: 0.42, tall: 0.3, margin: 0.03, own: 2.15 };
/** How far before the camera it stands, in the world's units: before anything of the world, behind its near plane. */
const AWAY = 60;

/** How each part is coloured: from the 2D HUD (HudScene's LAYOUTS), so both are alike. */
export interface HudLook {
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
  private readonly orbs: { material: THREE.ShaderMaterial; shown: number }[] = [];
  private readonly levelBar: THREE.Group;
  private readonly breathBar: THREE.Group;
  private readonly breathBody: THREE.MeshBasicMaterial;
  private readonly breathTop: THREE.MeshBasicMaterial;
  private readonly slots: { icon: THREE.MeshBasicMaterial; shade: THREE.Mesh }[] = [];
  private readonly number: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; shown: number };
  private breathShown = 1;
  private time = 0;

  constructor(private readonly look: HudLook) {
    this.group.visible = false;
    void model(URL, 1).then(body => {
      // Drawn at its own size here: the whole is scaled to the screen.
      body.scale.setScalar(1);
      body.traverse(node => { node.castShadow = node.receiveShadow = false; node.frustumCulled = false; });
      this.group.add(body);
    });
    const sphere = new THREE.SphereGeometry(ORB_R, 32, 16);
    look.vessels.forEach((colours, i) => {
      const [deep, body, lit, surface] = colours.map(c => new THREE.Color(c));
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, level: { value: 1 }, radius: { value: ORB_R }, deep: { value: deep }, body: { value: body }, lit: { value: lit }, surface: { value: surface } },
        vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT,
      });
      const glass = new THREE.Mesh(sphere, material);
      glass.position.set(ORBS[i].x, ORBS[i].y, 0);
      this.add(glass);
      this.orbs.push({ material, shown: NaN });
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
    this.levelBar = bar(LEVEL, new THREE.MeshBasicMaterial({ color: look.level[0] }), new THREE.MeshBasicMaterial({ color: look.level[1] }));
    this.breathBody = new THREE.MeshBasicMaterial({ color: look.breath.fill[0] });
    this.breathTop = new THREE.MeshBasicMaterial({ color: look.breath.fill[1] });
    this.breathBar = bar(STAMINA, this.breathBody, this.breathTop);
    // The slots: a picture in each, and a shade drawn down over it from its top while it cools down.
    const loader = new THREE.TextureLoader();
    const square = new THREE.PlaneGeometry(SLOTS.size, SLOTS.size);
    const hanging = new THREE.PlaneGeometry(SLOTS.size, 1).translate(0, -0.5, 0);
    look.icons.forEach((src, i) => {
      const map = loader.load(src);
      map.minFilter = map.magFilter = THREE.NearestFilter;
      map.colorSpace = THREE.SRGBColorSpace;
      const icon = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5 });
      const picture = new THREE.Mesh(square, icon);
      picture.position.set(SLOTS.xs[i], SLOTS.y, SLOTS.z);
      const shade = new THREE.Mesh(hanging, new THREE.MeshBasicMaterial({ color: 0x0c0a08, transparent: true, opacity: 0.75 }));
      shade.position.set(SLOTS.xs[i], SLOTS.y + SLOTS.size / 2, SLOTS.z + 0.003);
      shade.scale.y = 0;
      this.add(picture, shade);
      this.slots.push({ icon, shade });
    });
    // The level, written in the hollow at the level bar's left end.
    const canvas = Object.assign(document.createElement('canvas'), { width: 32, height: 16 });
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const written = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL.number.w, LEVEL.number.h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.5 }));
    written.position.set(LEVEL.number.x, LEVEL.number.y, LEVEL.z + 0.01);
    this.add(written);
    this.number = { canvas, texture, shown: NaN };
  }

  private add(...things: THREE.Object3D[]): void {
    for (const thing of things) { thing.frustumCulled = false; this.group.add(thing); }
  }

  /** Shows what the game reads now. */
  read(r: HudReading, dt: number): void {
    this.group.visible = true;
    this.time += dt;
    [r.life, r.mana].forEach((level, i) => {
      const orb = this.orbs[i];
      if (!orb) return;
      const want = Math.max(0, Math.min(1, level));
      // The first time it is simply at its level; after that it slides.
      orb.shown = Number.isNaN(orb.shown) ? want : orb.shown + (want - orb.shown) * Math.min(1, dt * this.look.settle);
      orb.material.uniforms.level.value = orb.shown;
      orb.material.uniforms.time.value = this.time;
    });
    this.levelBar.scale.x = Math.max(1e-4, (LEVEL.to - LEVEL.from) * Math.min(1, r.growth));
    // The breath slides to where it is, quickly, and turns red when it is spent.
    this.breathShown += (r.breath - this.breathShown) * Math.min(1, dt * 14);
    this.breathBar.scale.x = Math.max(1e-4, (STAMINA.to - STAMINA.from) * Math.max(0, Math.min(1, this.breathShown)));
    const [body, line] = r.winded ? this.look.breath.spent : this.look.breath.fill;
    this.breathBody.color.setHex(body);
    this.breathTop.color.setHex(line);
    // The two skills: shaded while they cool down; there but dull when unpaid for or busy.
    r.skills.forEach((skill, i) => {
      const slot = this.slots[i];
      if (!slot) return;
      slot.shade.scale.y = SLOTS.size * skill.cooldown;
      slot.icon.color.setScalar(skill.ready || skill.cooldown > 0 ? 1 : 0.35);
    });
    // The greatest power: shaded over what is not yet charged, and pulsing once it is.
    const power = this.slots[2], charged = Math.max(0, Math.min(1, r.ultimate)), pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    if (power) {
      power.shade.scale.y = SLOTS.size * (1 - charged);
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
  }

  /** Stands it before the camera, at the bottom of what it sees, as wide as the screen allows. */
  place(camera: THREE.OrthographicCamera): void {
    const wide = camera.right - camera.left, tall = camera.top - camera.bottom;
    const scale = Math.min(wide * FIT.wide / FIT.own, tall * FIT.tall);
    this.group.scale.setScalar(scale);
    camera.updateMatrixWorld();
    this.group.position.copy(camera.localToWorld(new THREE.Vector3(0, camera.bottom + tall * FIT.margin, -AWAY)));
    this.group.quaternion.copy(camera.quaternion);
  }
}
