// The other player of a versus, as something this side's blows can land on: it stands where their
// puppet is, with a body as the hero's own is, so every spell, ball, blast, cut and bite that finds
// an enemy finds them too. Whatever lands is not taken off here: it is sent to them, and their own
// game decides whether it counts (a dodge, a moment's grace after a blow).
import Phaser from 'phaser';
import type { Vec } from '../machi/controller';
import type { Footprint } from '../world/footprint';
import type { Puppet } from './puppet';

/**
 * Their body, as a 3D soldier's is measured (tropa/Trooper.ts) for a man drawn about as tall as the
 * heroes are in 3D: how high its middle is over the feet, how wide and tall. The hero's own 2D torso
 * was too short: her orbs, which leave her branch high up, flew over it.
 */
const TALL = 90;
const TORSO = { up: TALL * 0.45, w: 18, h: TALL * 0.7 };

export class Rival {
  readonly zone: Phaser.GameObjects.Zone;
  readonly girth = 10;
  /** How strongly it smoulders, set by the burning: only so that it can be set; the other side shows its own. */
  burning = 0;
  private readonly spot: Vec = { x: 0, y: 0 };
  private readonly torso: Footprint = { x: 0, y: 0, hw: TORSO.w / 2, hh: TORSO.h / 2 };

  /** @param landed what a blow that lands does: sent to the other side */
  constructor(scene: Phaser.Scene, private readonly puppet: Puppet, private readonly landed: (amount: number, dx: number, dy: number) => void) {
    this.zone = scene.add.zone(0, 0, TORSO.w, TORSO.h);
    scene.physics.add.existing(this.zone, true);
    this.zone.setData('enemy', this);
    this.follow();
  }

  /** Where they stand. */
  get ground(): Vec {
    return this.spot;
  }

  /** Their body as it is seen, for what has to be seen to touch it. */
  get body(): Footprint {
    return this.torso;
  }

  /** Whether there is anyone there to strike: come, on their feet, and not rolling out of the way. */
  get alive(): boolean {
    return this.puppet.there && !this.puppet.besides.fallen && !this.puppet.isDashing;
  }

  hit(dx: number, dy: number, amount = 1): void {
    if (this.alive) this.landed(amount, dx, dy);
  }

  /** Kept on the puppet each step. */
  follow(): void {
    this.spot.x = this.puppet.x;
    this.spot.y = this.puppet.y;
    this.torso.x = this.puppet.x;
    this.torso.y = this.puppet.y - TORSO.up;
    this.zone.setPosition(this.torso.x, this.torso.y);
    const body = this.zone.body as Phaser.Physics.Arcade.StaticBody | null;
    body?.updateFromGameObject();
    if (body) body.enable = this.alive;
  }
}
