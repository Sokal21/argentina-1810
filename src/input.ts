// Keyboard state for moving and attacking. Held directions are kept oldest
// first: when two opposite keys are down the most recently pressed one wins,
// so rolling from W to S never reads as "stopped".
import type { MachiInput } from './machi/controller';

type Dir = 'up' | 'down' | 'left' | 'right';

const KEYMAP: Record<string, Dir> = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

export class Keys {
  private held = new Set<Dir>();
  private attack = false;
  /** Shift was pressed since the last read. */
  private dash = false;
  /** Q is down, and E was pressed since the last read. */
  private strike = false;
  private heal = false;

  constructor(target: Window = window) {
    target.addEventListener('keydown', e => {
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
      if (e.code === 'KeyE') { if (!e.repeat) this.heal = true; return; }
      const dir = KEYMAP[e.code];
      if (!dir) return;
      e.preventDefault();
      if (!e.repeat) { this.held.delete(dir); this.held.add(dir); }
    });
    target.addEventListener('keyup', e => {
      if (e.code === 'Space') this.attack = false;
      else if (e.code === 'KeyQ') this.strike = false;
      else if (KEYMAP[e.code]) this.held.delete(KEYMAP[e.code]);
    });
    target.addEventListener('blur', () => { this.held.clear(); this.attack = false; this.strike = false; });
  }

  private axis(neg: Dir, pos: Dir): number {
    let v = 0;
    for (const dir of this.held) if (dir === neg) v = -1; else if (dir === pos) v = 1;
    return v;
  }

  /** Her abilities' keys: the strike is held to aim, the heal is one press. */
  abilities(): { strike: boolean; heal: boolean } {
    const heal = this.heal;
    this.heal = false;
    return { strike: this.strike, heal };
  }

  read(): MachiInput {
    // A dash is one press, not a held key: it is reported once and forgotten.
    const dash = this.dash;
    this.dash = false;
    return { dx: this.axis('left', 'right'), dy: this.axis('up', 'down'), attack: this.attack, dash };
  }
}
