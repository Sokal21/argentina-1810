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
  /** Seconds to blend into it from what was playing: short for a blow, whose start is its point. */
  blend?: number;
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

  /**
   * Which way a clip made in place really goes, as a turn about the upright from the body's front (+Z),
   * and how far it goes a second: from a foot while it bears, which slides back the way the body goes.
   * (Some clips walk at a slant: Inti's walk forward goes 27° to her left.)
   */
  stride(name: string, foot: string): { way: number; reach: number } {
    const clip = this.clips.get(name), bone = this.body.getObjectByName(foot);
    if (!clip || !bone) return { way: 0, reach: 0 };
    const sampler = new THREE.AnimationMixer(this.body), action = sampler.clipAction(clip).play();
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      sampler.setTime((clip.duration * i) / SAMPLES);
      this.body.updateMatrixWorld(true);
      points.push(this.body.worldToLocal(bone.getWorldPosition(new THREE.Vector3())));
    }
    action.stop();
    sampler.uncacheRoot(this.body);
    // While it bears: the lower half of where it goes.
    const low = [...points].map(p => p.y).sort((a, b) => a - b)[Math.floor(points.length / 2)];
    const slid = new THREE.Vector3();
    let along = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y > low || points[i - 1].y > low) continue;
      const d = points[i].clone().sub(points[i - 1]).setY(0);
      slid.add(d);
      along += d.length();
    }
    return { way: Math.atan2(-slid.x, -slid.z), reach: (2 * along) / clip.duration };
  }

  /** How long a clip lasts at its own pace, in seconds. */
  seconds(name: string): number {
    return this.clips.get(name)?.duration ?? 0;
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
    if (this.playing && this.playing !== action) action.crossFadeFrom(this.playing, how.blend ?? BLEND, false);
    this.playing = action;
    this.name = name;
  }

  /**
   * Shows a clip at a share of the way through it (0 to 1), held there rather than played on:
   * for a clip whose moment follows something else than time, as a roll follows how far he has
   * come.
   */
  hold(name: string, share: number, how: Play = {}): void {
    this.play(name, { ...how, once: true, pace: 0 });
    const clip = this.clips.get(name);
    if (this.name === name && this.playing && clip) this.playing.time = Math.max(0, Math.min(1, share)) * clip.duration;
  }

  /** Moves the clip playing on by so many seconds: two of one kind side by side, not in step. */
  shift(seconds: number): void {
    if (this.playing) this.playing.time = (this.playing.time + seconds) % this.playing.getClip().duration;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
