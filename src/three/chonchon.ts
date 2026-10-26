import * as THREE from 'three';
import { DIVE_LOW, DIVE_PAST, WINDUP, type ChonchonBrain, type Mode } from '../chonchon/brain';
import { ISO_Y } from '../machi/data';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { ground, UPRIGHT } from './space';

// The chonchón in 3D: its model (tools/blender/rig_wings.py) put where its brain says and moved by
// nothing else. The brain is the 2D game's own: where it is, how high, which way, what it is doing.
// Its dive, as the user asked for it: in the warning it rises over where it flies, beats hard once
// and reddens; it falls from there straight at her, red through, its wings folded back, nose along
// the way it falls; and the red goes as it pulls out. Its fall is drawn only: the brain drops at
// once and skims along low (the 2D game's), but its hits are reckoned on the ground, not by height.

const URL = 'chonchon/3d/chonchon_animado.glb';
/** Its drawn height, wingtips to the ends of its hair, as its 2D drawing. */
export const DRAWN = 60;
/** Where its face is, of its height: what the brain's height is the height of, as in the 2D drawing. */
const FACE = 0.68;
/** How much higher it rises in the warning, in the 2D game's pixels: drawn only, the brain's height is its own. */
const RISE = 20;
/** Seconds the red takes to go (as the 2D's). */
const FADE = 0.22;
/** How far it noses down toward her as it warns; and the seconds it takes to level out after its fall. */
const AIM = THREE.MathUtils.degToRad(15), LEVEL = 0.2;

const eased = (u: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;

export class ChonchonFigure {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  /** Turned about its face, to nose down. */
  private readonly pitch = new THREE.Group();
  private motion: Motion | null = null;
  private flash: (amount: number) => void = () => {};
  private was: Mode | null = null;
  private red = 0;
  private nose = 0;
  private lift = 0;
  /** Where it let go, how high, and how far off she was then: it falls in a line from there to there. */
  private from = { x: 0, y: 0, z: 0, far: 1 };
  private fall = 0;

  constructor() {
    this.group.add(this.pitch);
    this.loaded = model(URL, DRAWN).then(body => {
      body.position.y = -FACE * DRAWN * UPRIGHT;
      this.pitch.add(body);
      this.motion = new Motion(body);
      this.flash = flashes(body);
    });
  }

  update(dt: number, b: ChonchonBrain): void {
    if (!this.motion) return;
    if (b.mode !== this.was && b.mode === 'dive') {
      const far = Math.max(1, (b as unknown as { left: number }).left - DIVE_PAST);
      this.from = { x: b.x, y: b.y, z: b.z + this.lift, far };
      this.fall = Math.atan2((this.from.z - DIVE_LOW) * UPRIGHT, far);
    }
    this.was = b.mode;
    let height = b.z;
    switch (b.mode) {
      case 'windup': {
        const p = Math.min(1, b.t / WINDUP);
        this.motion.play('picada_aviso', { once: true, lasts: WINDUP, blend: 0.12 });
        this.lift = RISE * eased(p);
        this.red = p;
        this.nose = AIM * eased(p);
        break;
      }
      case 'dive': {
        this.motion.play('picada', { blend: 0.06 });
        // As high as the line from where it let go to where she was, by how far along it has come; then
        // low, levelling out.
        const gone = Math.hypot(b.x - this.from.x, (b.y - this.from.y) / ISO_Y), u = Math.min(1, gone / this.from.far);
        height = this.from.z + (DIVE_LOW - this.from.z) * u;
        this.lift = 0;
        this.red = 1;
        this.nose = u < 1 ? this.fall : Math.max(0, this.nose - dt * this.fall / LEVEL);
        break;
      }
      default:
        this.motion.play('vuelo', { blend: 0.15 });
        this.lift = 0;
        this.red = Math.max(0, this.red - dt / FADE);
        this.nose = Math.max(0, this.nose - dt * Math.max(this.fall, AIM) / LEVEL);
    }
    this.group.visible = b.mode !== 'gone';
    this.group.position.copy(ground(b.x, b.y, (height + this.lift) * UPRIGHT));
    this.group.rotation.y = Math.atan2(b.dir.x, b.dir.y);
    this.pitch.rotation.x = this.nose;
    this.flash(this.red);
    this.motion.update(dt);
  }
}
