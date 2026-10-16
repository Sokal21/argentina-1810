// Keyboard state for moving and attacking. Held directions are kept oldest
// first: when two opposite keys are down the most recently pressed one wins,
// so rolling from W to S never reads as "stopped".
import type { MachiInput } from './machi/controller';

type Dir = 'up' | 'down' | 'left' | 'right';

const KEYMAP: Record<string, Dir> = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
// The arrows attack, the way they point: two together, along the diagonal between them.
const ARROWS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

/** Milliseconds within which a second press of the same direction is a double press: run. */
const DOUBLE = 280;

export class Keys {
  private held = new Set<Dir>();
  private attack = false;
  /** Shift was pressed since the last read. */
  private dash = false;
  private ultimate = false;
  /** Q is down, and E was pressed since the last read. */
  private strike = false;
  private heal = false;
  private healHeld = false;
  /** Arrows held, oldest first: the way they attack. */
  private arrows = new Set<Dir>();
  /** X is held: they run. */
  private run = false;
  /** A direction pressed twice quickly: they run until any direction is let go. */
  private sprint = false;
  private lastPress: { dir: Dir | null; at: number } = { dir: null, at: -Infinity };

  constructor(target: Window = window) {
    target.addEventListener('keydown', e => {
      // Typing in a box is not playing.
      if ((e.target as { tagName?: string } | null)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this.attack = true;
        return;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!e.repeat) this.dash = true;
        return;
      }
      if (e.code === 'KeyQ') { this.strike = true; return; }
      if (e.code === 'KeyX') { this.run = true; return; }
      const arrow = ARROWS[e.code];
      if (arrow) {
        e.preventDefault();
        if (!e.repeat) { this.arrows.delete(arrow); this.arrows.add(arrow); }
        return;
      }
      if (e.code === 'KeyR') { if (!e.repeat) this.ultimate = true; return; }
      if (e.code === 'KeyE') { if (!e.repeat) this.heal = true; this.healHeld = true; return; }
      const dir = KEYMAP[e.code];
      if (!dir) return;
      e.preventDefault();
      if (!e.repeat) {
        // The same way twice in quick succession: they mean to run.
        const now = performance.now();
        if (this.lastPress.dir === dir && now - this.lastPress.at < DOUBLE) this.sprint = true;
        this.lastPress = { dir, at: now };
        this.held.delete(dir);
        this.held.add(dir);
      }
    });
    target.addEventListener('keyup', e => {
      if (e.code === 'Space') this.attack = false;
      else if (e.code === 'KeyQ') this.strike = false;
      else if (e.code === 'KeyE') this.healHeld = false;
      else if (e.code === 'KeyX') this.run = false;
      else if (ARROWS[e.code]) this.arrows.delete(ARROWS[e.code]);
      else if (KEYMAP[e.code]) {
        this.held.delete(KEYMAP[e.code]);
        // Run by a double press lasts until any way they are walking is let go.
        this.sprint = false;
      }
    });
    target.addEventListener('blur', () => { this.held.clear(); this.attack = false; this.strike = false; this.healHeld = false; this.run = false; this.sprint = false; this.arrows.clear(); });
  }

  private axis(neg: Dir, pos: Dir, of: Set<Dir> = this.held): number {
    let v = 0;
    for (const dir of of) if (dir === neg) v = -1; else if (dir === pos) v = 1;
    return v;
  }

  /** The way the arrows held point, if any are: across and down, each -1, 0 or 1. */
  get attacking(): { dx: number; dy: number } | null {
    const dx = this.axis('left', 'right', this.arrows), dy = this.axis('up', 'down', this.arrows);
    return dx || dy ? { dx, dy } : null;
  }

  /** Whether the run key is held. */
  get running(): boolean {
    return this.run || this.sprint;
  }

  /** Whether a key that aims while it is held is down. */
  get aiming(): boolean {
    return this.strike || this.healHeld;
  }

  /**
   * The ability keys. Each character reads them their own way: `strike` is
   * Q held down, `heal` is one press of E, and `second` is E held down.
   */
  /** Whether their greatest power was called for since last asked: one press, then forgotten. */
  unleash(): boolean {
    const pressed = this.ultimate;
    this.ultimate = false;
    return pressed;
  }

  abilities(): { strike: boolean; heal: boolean; second: boolean } {
    const heal = this.heal;
    this.heal = false;
    return { strike: this.strike, heal, second: this.healHeld };
  }

  read(): MachiInput {
    // A dash is one press, not a held key: it is reported once and forgotten.
    const dash = this.dash;
    this.dash = false;
    return { dx: this.axis('left', 'right'), dy: this.axis('up', 'down'), attack: this.attack, dash };
  }
}
