import { ISO_Y } from './data';
import type { Vec } from './controller';

export const MANA = 100;
export const REGEN = 6;   // mana back per second

/** Lightning called down on a patch of ground, a moment after it is marked. */
export const STRIKE = {
  cost: 35,
  cooldown: 4,
  range: 160,   // how far from her the patch can be, along the ground
  radius: 45,   // of the patch
  delay: 0.8,   // seconds between marking it and the bolt
  damage: 2,
};

/** A ritual that gives her life back if she is left alone to finish it. */
export const HEAL = {
  cost: 45,
  cooldown: 8,
  time: 1,      // seconds she stands rooted
  amount: 2,
};

export type Ability = 'strike' | 'heal';
const SPEC = { strike: STRIKE, heal: HEAL };

export interface AbilityInput {
  /** The strike's key is down: she is choosing where it falls. */
  strike: boolean;
  /** The heal's key was pressed this step. */
  heal: boolean;
  /** Where the pointer is in the world. */
  pointer: Vec;
  /** Where she stands. */
  at: Vec;
  /** She is on her feet and not mid-dash. */
  free: boolean;
  /** She has life to win back. */
  hurt: boolean;
}

/** What happened during a step, for whoever draws it and applies it. */
export interface AbilityEvents {
  /** Patches of ground the lightning reached this step. */
  struck: Vec[];
  /** She began the healing ritual. */
  healing: boolean;
  /** She finished it. */
  healed: boolean;
}

/**
 * Her mana and the abilities that spend it, with nothing drawn. Positions are
 * spots on the ground in the same units as hers: vertical distances on
 * screen are half what they are on the ground.
 */
export class Abilities {
  mana = MANA;
  /** While she is choosing: where the strike would fall. */
  aim: Vec | null = null;
  /** Marked patches, and how long each has waited for its bolt. */
  pending: { x: number; y: number; t: number }[] = [];

  private waits: Record<Ability, number> = { strike: 0, heal: 0 };
  /** Seconds into the healing ritual, or null. */
  private ritual: number | null = null;

  get isHealing(): boolean {
    return this.ritual !== null;
  }

  /** It could be used right now: off cooldown and paid for. */
  ready(ability: Ability): boolean {
    return this.waits[ability] === 0 && this.mana >= SPEC[ability].cost && this.ritual === null;
  }

  /** How much of its cooldown is left, from 1 (just used) to 0. */
  cooldown(ability: Ability): number {
    return this.waits[ability] / SPEC[ability].cooldown;
  }

  update(dt: number, input: AbilityInput): AbilityEvents {
    const events: AbilityEvents = { struck: [], healing: false, healed: false };
    this.mana = Math.min(MANA, this.mana + REGEN * dt);
    this.waits.strike = Math.max(0, this.waits.strike - dt);
    this.waits.heal = Math.max(0, this.waits.heal - dt);

    for (const patch of this.pending) patch.t += dt;
    events.struck = this.pending.filter(p => p.t >= STRIKE.delay).map(({ x, y }) => ({ x, y }));
    this.pending = this.pending.filter(p => p.t < STRIKE.delay);

    if (this.ritual !== null) {
      this.ritual += dt;
      if (this.ritual >= HEAL.time) {
        this.ritual = null;
        events.healed = true;
      }
    }

    // Holding the key shows where it would fall; letting go casts it there.
    const was = this.aim;
    this.aim = input.strike && input.free ? reach(input.at, input.pointer) : null;
    if (was && !input.strike && input.free && this.ready('strike')) {
      this.spend('strike');
      this.pending.push({ ...was, t: 0 });
    }

    if (input.heal && input.free && input.hurt && this.ready('heal')) {
      this.spend('heal');
      this.ritual = 0;
      this.aim = null;
      events.healing = true;
    }
    return events;
  }

  /** She was hit: a ritual under way is broken, and what it cost is lost. */
  interrupt(): boolean {
    const broken = this.ritual !== null;
    this.ritual = null;
    return broken;
  }

  /** She fell: nothing she had under way survives it. */
  reset(): void {
    this.ritual = null;
    this.aim = null;
    this.pending = [];
  }

  private spend(ability: Ability): void {
    this.mana -= SPEC[ability].cost;
    this.waits[ability] = SPEC[ability].cooldown;
  }
}

/** Ground distance between two spots. */
export function ground(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, (b.y - a.y) / ISO_Y);
}

// The pointer's spot, pulled in to the strike's range if it is beyond it.
function reach(from: Vec, pointer: Vec): Vec {
  const far = ground(from, pointer);
  if (far <= STRIKE.range) return { x: pointer.x, y: pointer.y };
  const k = STRIKE.range / far;
  return { x: from.x + (pointer.x - from.x) * k, y: from.y + (pointer.y - from.y) * k };
}
