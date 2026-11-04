import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Vec } from '../machi/controller';
import { POSEIDO_DRAWN, type Mode, type TroopBrain } from '../tropa/brain';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { Bile, Possessed } from './poseido';
import { glow, star, WARN } from './realista';
import { along, ground, UPRIGHT } from './space';
import { seenThrough } from './xray';

// The possessed apestado in the game (docs/personajes/apestado_poseido.md): the apestado's model with
// all that the Wekufe makes of him (three/poseido.ts), showing what his brain (tropa/brain.ts, the
// `poseido` kind) is doing. Lying as a dead apestado until the Wekufe comes into him; dead, lying so
// again, the Wekufe gone out of him for the next.

const TALL = POSEIDO_DRAWN * UPRIGHT;
/** His clips kept apart from the apestado's model, as the gallery loads them (tools/mocap/README.md). */
const APART = ['agonia', 'salto'];
/** His swipe lands at frame 20 of 48 (the apestado's); his charge's swipe begun `swing` seconds before it lands. */
const SWIPE = { lands: 20 / 48, swing: 0.5 };
/** How fast he turns, per second. */
const TURN = 9;
/** His head held still at the start of his scream while he warns (a share of the clip); the glow at his mouth: how far before his head (a share of his height), and its sizes (the muzzle's were lost on his face). */
const WARNING = { held: 0.12, ahead: 0.08, glow: [6, 16], opacity: [0.35, 0.9], star: 42, halo: 56 };

/** The warning at his mouth before he retches, in the royalists' red (three/realista.ts): a glow and a glint, growing until the bile comes. */
class Warning {
  readonly group = new THREE.Group();
  private readonly glow = sprite(glow(), WARN.colour);
  private readonly halo = sprite(star(), '#c80e04');
  private readonly star = sprite(star(), '#ff4a30');

  constructor() {
    this.group.add(this.glow, this.halo, this.star);
    this.group.visible = false;
  }

  /** As it is `t` seconds into a warning of `lasts`; shown only while it lasts. Its glow and its glint grow together the whole while, brightest as the bile comes. */
  show(at: THREE.Vector3 | null, t: number, lasts: number): void {
    this.group.visible = !!at && t < lasts;
    if (!at || !this.group.visible) return;
    const k = Math.min(1, t / lasts), eased = k * k * (3 - 2 * k);
    this.glow.scale.setScalar(WARNING.glow[0] + (WARNING.glow[1] - WARNING.glow[0]) * eased);
    this.glow.material.opacity = WARNING.opacity[0] + (WARNING.opacity[1] - WARNING.opacity[0]) * eased;
    for (const [ray, size] of [[this.halo, WARNING.halo], [this.star, WARNING.star]] as const) {
      ray.scale.setScalar(size * (0.3 + 0.7 * eased));
      ray.material.opacity = 0.4 + 0.6 * eased;
      ray.material.rotation = k * WARN.turn * 2;
    }
    this.group.position.copy(at);
  }
}

function sprite(map: THREE.Texture, colour: string): THREE.Sprite {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, color: colour, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
}

let loading: Promise<THREE.Group> | null = null;
function shape(): Promise<THREE.Group> {
  loading ??= (async () => {
    const body = await model('apestado/3d/apestado_animado.glb', POSEIDO_DRAWN);
    for (const name of APART) body.animations.push(...(await new GLTFLoader().loadAsync(`apestado/3d/anims/${name}.glb`)).animations.filter(a => a.name === name));
    return body;
  })();
  return loading;
}

/** What his figure needs to know of him: his brain, and how red he flashes. */
export interface Possessed3D { readonly brain: TroopBrain; readonly hurt: number }

export class PoseidoFigure {
  readonly group = new THREE.Group();
  private parts: { body: THREE.Group; motion: Motion; effects: Possessed; biles: Bile[]; flash: (amount: number) => void; walk: number; run: number } | null = null;
  private was: Mode | null = null;
  private facing = 0;
  private retched = 0;
  private last = { x: 0, y: 0 };
  private going = 0;
  private wasAt = 0;
  private readonly warning = new Warning();

  constructor() {
    void shape().then(made => {
      const body = clone(made) as THREE.Group;
      body.animations = made.animations;
      // Materials of his own first: what the Wekufe makes of him is painted on them.
      const flash = flashes(body);
      seenThrough(body);
      const effects = new Possessed(body, TALL), biles = [new Bile(body, TALL), new Bile(body, TALL)];
      const motion = new Motion(body);
      this.group.add(body, effects.group, this.warning.group, ...biles.map(b => b.group));
      this.parts = { body, motion, effects, biles, flash, walk: motion.reach('caminata', 'L_Foot') * made.scale.x, run: motion.reach('carrera', 'L_Foot') * made.scale.x };
    });
  }

  /** Shows him as he is this step; `next`, where the Wekufe goes as he dies (the next body, or where the Wekufe will stand). */
  update(dt: number, who: Possessed3D, next: Vec | null): void {
    const parts = this.parts;
    if (!parts) return;
    const { body, motion, effects } = parts, b = who.brain, { mode, t } = b, afresh = mode !== this.was;
    const moved = along(b.x - this.last.x, b.y - this.last.y).length() / Math.max(dt, 1e-3);
    this.last = { x: b.x, y: b.y };
    this.going += (Math.min(moved, 300) - this.going) * Math.min(1, dt * 10);
    if (mode !== 'dying' && mode !== 'gone') {
      const want = Math.atan2(b.dir.x, b.dir.y), turn = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += turn * Math.min(1, dt * TURN);
      if (afresh && (mode === 'retch' || mode === 'leap' || mode === 'possess')) this.facing = want;
    }
    body.position.copy(ground(b.x, b.y));
    body.rotation.y = this.facing;
    const k = b.kind;
    switch (mode) {
      case 'gone':
        // Lying where he fell; or, the Wekufe not yet come into him, lying as a dead apestado.
        if (afresh && this.was !== 'dying') { effects.lies(); motion.hold('muerte', 1, { afresh: true }); }
        break;
      case 'possess':
        if (afresh) effects.possess(k.possession!.time);
        motion.play('agonia', { once: true, lasts: k.possession!.time, afresh, blend: 0.4 });
        break;
      case 'dying':
        if (afresh) effects.dies(next ? ground(next.x, next.y) : undefined);
        motion.play('muerte', { once: true, afresh, blend: 0.08 });
        break;
      case 'leap': {
        if (afresh) effects.landed();
        effects.leap(t, dt, motion, { to: ground(b.landing.x, b.landing.y), wide: k.leap!.reach });
        break;
      }
      case 'blow':
        motion.play('golpe', { once: true, pace: (SWIPE.lands * motion.seconds('golpe')) / k.blow!.hit, afresh, blend: 0.2 });
        break;
      case 'lunge': {
        // Roaring, then running at her, then his swipe landing as he reaches her (the apestado's charge).
        const { charge, hit } = k.lunge!;
        if (t < charge) motion.play('grito', { once: true, afresh, blend: 0.15 });
        else if (t < hit - SWIPE.swing) motion.play('carrera', { pace: parts.run ? Math.max(0.6, this.going / parts.run) : 1, blend: 0.12 });
        else {
          motion.play('golpe', { once: true, pace: (SWIPE.lands * motion.seconds('golpe')) / SWIPE.swing, blend: 0.1 });
          // Still running in as he swings: his feet run under it rather than slide.
          if (this.going > 20) motion.legs('carrera', parts.run ? Math.max(0.35, this.going / parts.run) : 1);
        }
        break;
      }
      case 'retch': {
        // Warning her first, his head held back, the glow at his mouth; then retching the way he faces at its end, as his brain does.
        const warn = k.retch!.warn ?? 0;
        if (t < warn) motion.hold('grito', WARNING.held, { afresh, blend: 0.2 });
        else {
          const begun = this.wasAt < warn || (afresh && !warn);
          if (begun) {
            this.facing = Math.atan2(b.dir.x, b.dir.y);
            body.rotation.y = this.facing;
            parts.biles[this.retched++ % parts.biles.length].start(this.facing);
          }
          motion.play('grito', { once: true, lasts: k.retch!.time, afresh: begun, blend: 0.2 });
        }
        break;
      }
      case 'walk':
        motion.play('caminata', { pace: parts.walk ? Math.max(0.35, this.going / parts.walk) : 1 });
        break;
      default:
        motion.play('reposo');
    }
    this.was = mode;
    this.wasAt = t;
    motion.update(dt);
    const warn = mode === 'retch' ? k.retch!.warn ?? 0 : 0;
    this.warning.show(t < warn ? this.mouth(body) : null, t, warn);
    parts.flash(who.hurt);
    effects.update(dt);
    for (const bile of parts.biles) bile.update(dt);
  }

  /** Where his mouth is: a little before his head, the way he faces. */
  private mouth(body: THREE.Group): THREE.Vector3 | null {
    const head = body.getObjectByName('Head');
    if (!head) return null;
    return head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(TALL * WARNING.ahead));
  }

  /** Taken off the field. */
  remove(): void {
    this.group.removeFromParent();
  }
}
