import * as THREE from 'three';

// A model's clips, played one at a time and blended from one to the next.

/** Seconds one clip takes to blend into the next. */
const BLEND = 0.15;
/** Points a clip is looked at in, to measure its stride. */
const SAMPLES = 48;

export interface Play {
  /** Played once and held on its last frame, rather than looped. */
  once?: boolean;
  /** Played through in this many seconds, whatever its own length: to last as long as what it shows. */
  lasts?: number;
  /** Played this many times its own speed. */
  pace?: number;
  /** Started again from the beginning even if it is the one playing: a new blow, a new dive. */
  afresh?: boolean;
}

export class Motion {
  private readonly mixer: THREE.AnimationMixer;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private playing: THREE.AnimationAction | null = null;
  private name = '';

  constructor(private readonly body: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of body.animations) this.clips.set(clip.name, clip);
  }

  /**
   * How far a clip of walking or running carries its body in a second played at its own speed,
   * in the body's own units, though it is played in place: twice how far one foot goes from its
   * furthest forward to its furthest back along the way the body faces (+Z), for each step of a
   * stride. Its pace can then be set to match how fast the body really goes.
   */
  reach(name: string, foot: string): number {
    const clip = this.clips.get(name), bone = this.body.getObjectByName(foot);
    if (!clip || !bone) return 0;
    const sampler = new THREE.AnimationMixer(this.body), action = sampler.clipAction(clip).play();
    const at = new THREE.Vector3();
    let near = Infinity, far = -Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      sampler.setTime((clip.duration * i) / SAMPLES);
      this.body.updateMatrixWorld(true);
      this.body.worldToLocal(bone.getWorldPosition(at));
      near = Math.min(near, at.z);
      far = Math.max(far, at.z);
    }
    action.stop();
    sampler.uncacheRoot(this.body);
    return (2 * (far - near)) / clip.duration;
  }

  has(name: string): boolean {
    return this.clips.has(name);
  }

  play(name: string, how: Play = {}): void {
    const clip = this.clips.get(name);
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    action.timeScale = how.lasts ? clip.duration / how.lasts : how.pace ?? 1;
    if (name === this.name && !how.afresh) return;
    action.reset();
    action.setLoop(how.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = !!how.once;
    action.play();
    if (this.playing && this.playing !== action) action.crossFadeFrom(this.playing, BLEND, false);
    this.playing = action;
    this.name = name;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
