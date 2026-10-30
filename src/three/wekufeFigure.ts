import * as THREE from 'three';
import type { Vec } from '../machi/controller';
import type { WekufeMind, WekufeState } from '../tropa/wekufe';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { ground, UPRIGHT } from './space';
import { Wekufe } from './wekufe';

// The Wekufe in the game: his model and all that goes with it (three/wekufe.ts), showing what his mind
// (tropa/wekufe.ts) is doing. His red fire flies here, in 3D, after her; what it does to her is the game's.

const DRAWN = 150;
/** The clip of each thing he does. */
const CLIPS: Partial<Record<WekufeState, string>> = { float: 'reposo', dive: 'zambullida', claw: 'zarpazo', throw: 'lanzar', invoke: 'invocar', dying: 'muerte' };

export class WekufeFigure {
  readonly group = new THREE.Group();
  private parts: { body: THREE.Group; motion: Motion; effects: Wekufe; flash: (amount: number) => void } | null = null;
  private was: WekufeState | null = null;
  private facing = 0;
  private resets = 0;

  constructor() {
    void model('wekufe/3d/wekufe_animado.glb', DRAWN).then(shape => {
      const effects = new Wekufe(shape, DRAWN * UPRIGHT);
      this.group.add(shape, effects.group);
      this.parts = { body: shape, motion: new Motion(shape), effects, flash: flashes(shape) };
    });
  }

  /** Shows him as he is; whether his red fire has reached her this step. */
  update(dt: number, mind: WekufeMind, her: Vec, dodging: boolean, hurt: number): boolean {
    const parts = this.parts;
    if (!parts) return false;
    const { body, motion, effects } = parts;
    if (mind.resets !== this.resets) {
      this.resets = mind.resets;
      effects.uninvoke();
      effects.unthrowFire();
      effects.unclaw();
    }
    if (mind.state !== this.was) this.begin(mind, motion, effects);
    body.position.copy(ground(mind.x, mind.y));
    const dx = her.x - mind.x, dz = her.y - mind.y;
    // Turning to her, but not under the earth, nor once his claws fall, nor as he dies.
    if (mind.state === 'float' || mind.state === 'throw' || mind.state === 'invoke' || mind.lunging) {
      const want = Math.atan2(dx, dz);
      let turn = want - this.facing;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      this.facing += turn * Math.min(1, dt * (mind.lunging ? 14 : 5));
    }
    body.rotation.y = this.facing;
    parts.flash(hurt);
    motion.update(dt);
    effects.prey.copy(ground(her.x, her.y, 40));
    effects.dodging = dodging;
    effects.update(dt);
    return effects.fireHit();
  }

  private begin(mind: WekufeMind, motion: Motion, effects: Wekufe): void {
    const state = mind.state, was = this.was;
    this.was = state;
    if (state === 'under') {
      // The earth stirs where he will come up: to be got away from.
      if (mind.coming) effects.gather(ground(mind.coming.x, mind.coming.y));
      return;
    }
    const clip = CLIPS[state];
    if (!clip) return;
    motion.play(clip, { once: state !== 'float', lasts: mind.lasts, afresh: true, blend: was === 'under' ? 0 : 0.15 });
    const seconds = mind.lasts ?? motion.seconds(clip);
    if (state === 'dive') effects.dive(seconds);
    else if (state === 'dying') { effects.uninvoke(); effects.unthrowFire(); effects.dies(seconds); }
    else {
      if (was === 'under' || was === 'dive' || was === 'dying') effects.rises();
      if (was === 'dying') { effects.uninvoke(); effects.unthrowFire(); }
    }
    if (state === 'claw') effects.claw(seconds);
    if (state === 'throw') effects.throwFire(seconds);
    if (state === 'invoke') effects.invoke(seconds);
  }
}

