import * as THREE from 'three';

// A model's clips, played one at a time and blended from one to the next.

/** Seconds one clip takes to blend into the next. */
const BLEND = 0.15;

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

  constructor(body: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of body.animations) this.clips.set(clip.name, clip);
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
