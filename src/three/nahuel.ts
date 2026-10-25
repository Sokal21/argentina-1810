import * as THREE from 'three';
import { NAHUEL, type NahuelBrain } from '../nahuel/brain';
import { model } from './figure';
import { Motion } from './motion';
import { ground, heading } from './space';
import { Spirit } from './spirit';

// Inti's nahuel in 3D: Quaternius's wolf in her spirit's slate blue (the puma would not take any clip),
// shown doing what its brain (nahuel/brain.ts) has it do: galloping after its prey, tearing at it,
// standing at her heel; its halo and light fading in as it comes and out as it goes.

/** How tall it stands, in sprite pixels: as in the gallery. */
const DRAWN = 52;
/** How fast it turns to the way it runs, per second. */
const TURN = 12;
/** How fast it runs in its gallop as made, in world units a second: its clip is played to match the brain's speed. */
const GALLOP = 150;

export class NahuelFigure {
  readonly group = new THREE.Group();
  private body: THREE.Group | null = null;
  private motion: Motion | null = null;
  private spirit: Spirit | null = null;
  private facing = 0;
  private was = { x: 0, y: 0, mode: 'gone' as string };

  constructor() {
    this.group.visible = false;
    void model('nahuel/3d/nahuel_animado.glb', DRAWN).then(loaded => {
      this.body = loaded;
      this.motion = new Motion(loaded);
      this.spirit = new Spirit(loaded);
      this.group.add(loaded, this.spirit.group);
    });
  }

  update(dt: number, b: NahuelBrain): void {
    const there = b.present;
    this.group.visible = there && !!this.body;
    const moved = { x: b.x - this.was.x, y: b.y - this.was.y };
    if (!there || !this.body || !this.motion || !this.spirit) { this.was = { x: b.x, y: b.y, mode: b.mode }; return; }
    // Turned the way it goes; called up, it looks the way it faces.
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    if (this.was.mode === 'gone') this.facing = heading(b.faceX, b.back ? -1 : 0.3);
    else if (Math.hypot(moved.x, moved.y) > 0.05) this.facing += wrap(heading(moved.x, moved.y) - this.facing) * Math.min(1, dt * TURN);
    if (b.mode === 'strike') this.motion.play('Attack', { once: true, lasts: NAHUEL.strike, afresh: this.was.mode !== 'strike', blend: 0.05 });
    else if (b.mode === 'run') this.motion.play('Gallop', { pace: NAHUEL.run / GALLOP });
    else this.motion.play('Idle');
    this.motion.update(dt);
    this.body.position.copy(ground(b.x, b.y));
    this.body.rotation.y = this.facing;
    this.spirit.power = b.mode === 'appear' ? Math.min(1, b.t / NAHUEL.appear) : b.mode === 'fade' ? Math.max(0, 1 - b.t / NAHUEL.fade) : 1;
    // Coming and going it is only light: its body is shown once it is all there, and until it begins to go.
    this.body.visible = this.spirit.power > 0.5;
    this.spirit.update(dt);
    this.was = { x: b.x, y: b.y, mode: b.mode };
  }
}
