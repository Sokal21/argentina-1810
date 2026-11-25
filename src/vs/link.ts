// The line between the two players of a versus: straight from one browser to the other (WebRTC),
// with no server of the game's own. To find each other they meet in a room named by a short code,
// through public Nostr relays (trystero); once met, everything goes between the two of them alone.
// Whoever makes the room chooses who they play; whoever comes in plays the other.
import { joinRoom, type Room } from 'trystero/nostr';
import type { Hero } from '../machi/data';

/** Unique to this game, so its rooms are never mixed with another app's on the same relays. */
const APP = 'turbiocity-argentina-1810-vs';
/** The letters a code is made of: none that can be taken for another (no 0/O, 1/I/L). */
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

/** What each sends the other, many times a second: how they stand (see puppet.ts). */
export type Pose = Record<string, number | boolean | string | null | number[]>;
/** A blow of one landing on the other: how much, and which way it was going. */
export interface Hit { amount: number; dx: number; dy: number; [key: string]: number }
/** Something seen once, as it happens: a shot, a throw, a bolt of lightning (see GameScene). */
export type Seen = { kind: string } & Record<string, number | string | boolean>;

export function newCode(): string {
  let code = '';
  const random = crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
  for (const n of random) code += LETTERS[n % LETTERS.length];
  return code;
}

/** A code as it may be typed: in any case, with spaces or dashes. */
export function cleanCode(typed: string): string {
  return typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export class Link {
  readonly code: string;
  /** Who this side plays, and who the other does: the host's choice, and what is left. */
  hero: Hero | null;
  rivalHero: Hero | null = null;
  readonly host: boolean;
  private readonly room: Room;
  private peer: string | null = null;
  private readonly sendHello: (data: { hero: Hero }, target: string) => void;
  private readonly sendPose: (pose: Pose) => void;
  private readonly sendHit: (hit: Hit) => void;
  private readonly sendSeen: (seen: Seen) => void;

  /** The other came in and both know who plays whom: the game can begin. */
  onReady: (() => void) | null = null;
  /** The other left, or the line dropped. */
  onGone: (() => void) | null = null;
  onPose: ((pose: Pose) => void) | null = null;
  onHit: ((hit: Hit) => void) | null = null;
  onSeen: ((seen: Seen) => void) | null = null;

  /** Makes a room (`hero` given: the host's choice) or comes into one (`hero` null). */
  constructor(code: string, hero: Hero | null) {
    this.code = code;
    this.hero = hero;
    this.host = hero !== null;
    this.room = joinRoom({ appId: APP }, code);
    const hello = this.room.makeAction<{ hero: Hero }>('hello');
    const pose = this.room.makeAction<Pose>('pose');
    const hit = this.room.makeAction<Hit>('hit');
    const seen = this.room.makeAction<Seen>('seen');
    this.sendHello = (data, target) => { void hello.send(data, { target }); };
    this.sendPose = data => { if (this.peer) void pose.send(data, { target: this.peer }); };
    this.sendHit = data => { if (this.peer) void hit.send(data, { target: this.peer }); };
    this.sendSeen = data => { if (this.peer) void seen.send(data, { target: this.peer }); };

    this.room.onPeerJoin = peerId => {
      // A room is for two: a third who comes in is not answered.
      if (this.peer) return;
      this.peer = peerId;
      // The host tells whoever came in who they play; they answer with the same, and both begin.
      if (this.host) this.sendHello({ hero: this.hero! }, peerId);
    };
    hello.onMessage = (data, { peerId }) => {
      if (peerId !== this.peer) return;
      if (this.host) {
        // The answer: they know.
        if (this.rivalHero) return;
        this.rivalHero = this.hero === 'inti' ? 'cabral' : 'inti';
        this.onReady?.();
        return;
      }
      if (this.hero) return;
      this.rivalHero = data.hero;
      this.hero = data.hero === 'inti' ? 'cabral' : 'inti';
      this.sendHello({ hero: this.hero }, peerId);
      this.onReady?.();
    };
    this.room.onPeerLeave = peerId => {
      if (peerId !== this.peer) return;
      this.peer = null;
      this.onGone?.();
    };
    pose.onMessage = (data, { peerId }) => { if (peerId === this.peer) this.onPose?.(data); };
    hit.onMessage = (data, { peerId }) => { if (peerId === this.peer) this.onHit?.(data); };
    seen.onMessage = (data, { peerId }) => { if (peerId === this.peer) this.onSeen?.(data); };
  }

  get connected(): boolean {
    return this.peer !== null;
  }

  pose(pose: Pose): void { this.sendPose(pose); }
  hit(hit: Hit): void { this.sendHit(hit); }
  seen(seen: Seen): void { this.sendSeen(seen); }

  leave(): void {
    this.onReady = this.onGone = this.onPose = this.onHit = this.onSeen = null;
    void this.room.leave();
  }
}

/** The versus under way, if one is: set by the lobby, read by the game. */
export const versus: { link: Link | null } = { link: null };
