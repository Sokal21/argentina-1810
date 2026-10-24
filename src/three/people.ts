import * as THREE from 'three';
import type { WorldMap } from '../world/zones';
import { middle } from '../world/zones';
import { asks } from './asks';
import { MODELS } from './buildings';
import { figure, model, type Dress } from './figure';
import { Motion } from './motion';
import { brokenWheel } from './wheel';
import { seenThrough } from './xray';
import { ground, UPRIGHT } from './space';

// Those standing about a map: whoever has a model of their own, breathing where they stand; the
// rest, a figure of a few blocks in something of their colours, until they are modelled. Nobody
// talks to them in 3D but whoever the game says may be (Mateo), each with a sign over them while they
// may be. One the hero leads somewhere (Mateo, to the well) walks along where the 2D game has them,
// turned the way they go.

/**
 * How each looks: a figure of blocks, or the model at `url`, which breathes where it stands (or plays
 * its own `idle`, or holds its first pose, if `still`) and,
 * if it has one, plays `now` once now and then (a glance, a sigh) and breathes again; `turned`, how
 * far round from the camera they look across the screen, as a share of a half turn.
 */
export const DRESSES: Record<string, Dress & { url?: string; idle?: string; still?: boolean; now?: string; turned?: number; against?: Against }> = {
  braulio: { drawn: 78, coat: '#7a5a3a', legs: '#4a3a2a', hat: { colour: '#3a2e24', tall: 0.08 } },
  anselmo: { drawn: 80, coat: '#5a4636', legs: '#5a4636' },
  tobias: { drawn: 58, coat: '#8a7a5a', legs: '#5a4a36' },
  // Tripo from turnaround A, 23 October 2026; its texture in 24 colours (in 16 the mud on his
  // knees went the red of his facings, and read as blood). Now and then he looks back over his
  // shoulder, as one hiding from those he ran from (Mixamo's "Look Over Shoulder").
  mateo: { drawn: 78, coat: '#a08a5a', legs: '#5a4a36', url: 'mateo/3d/mateo_animado.glb', now: 'mirada', turned: 0.2 },
  // Tripo from turnaround B, 23 October 2026. By what is left of her house she breaks down crying
  // now and then, her hands to her face (Mixamo's "Crying").
  remedios: { drawn: 74, coat: '#8a3a3a', legs: '#6a5a4a', url: 'gente/3d/remedios/remedios_animado.glb', now: 'llanto' },
  // Tripo from turnaround B (its profile mirrored: drawn facing right, it showed the knife at his
  // left hip on his right side), 23 October 2026. Now and then he shouts for the Spaniard to be
  // brought, arms flung wide (Mixamo's "Yelling").
  ciriaco: { drawn: 78, coat: '#6a6a4a', legs: '#4a4236', url: 'gente/3d/ciriaco/ciriaco_animado.glb', now: 'gritando' },
  // Tripo from turnaround B (his arms clear of the poncho), 23 October 2026. He stands heavier
  // than the rest, his weight shifting (Mixamo's "Orc Idle").
  paisano: { drawn: 78, coat: '#9a7a4a', legs: '#3a3a3a', hat: { colour: '#2a2420', tall: 0.07 }, url: 'gente/3d/paisano/paisano_animado.glb', idle: 'reposo_orco', turned: 0.08 },
  // Tripo from turnaround B, 23 October 2026; his pitchfork left out of it, to be held as a thing of its own.
  chacarero: { drawn: 78, coat: '#7a7a5a', legs: '#4a4236', hat: { colour: '#c8b078', tall: 0.06 }, url: 'gente/3d/chacarero/chacarero_animado.glb' },
  // Tripo from turnaround A (B had a blot on its profile's shoulder), 23 October 2026; his basin left
  // out, to be held as a thing of its own. He stands praying, his hands joined (Mixamo's "Praying").
  benito: { drawn: 78, coat: '#4a3e34', legs: '#4a3e34', url: 'gente/3d/benito/benito_animado.glb', idle: 'rezando' },
  // He lies abed in the chapel instead (`abed` in buildings.ts): his model is there.
  alferez: { drawn: 80, coat: '#2c3a6e', legs: '#d9d4c4', trim: '#a3322a', hat: { colour: '#1c1a1e', tall: 0.12 } },
  // Tripo from turnaround A, 23 October 2026: lying where he fell, gasping (Mixamo's "Laying
  // Moaning", lying still in its first pose and only now and then gasping through it), his upper body raised from the waist (tools/blender/lean_up.py, 60°) so he lies back
  // against a cart's wheel come off (src/three/wheel.ts), as the 2D game draws him. Raised so, his
  // back reaches 27 behind him at 80 drawn, at its height: the wheel, leant back, stood 12 behind
  // him, meets it there (measured in Blender; at 30 it stood a hand's breadth off).
  malherido: {
    drawn: 80, coat: '#7a2a24', legs: '#d9d4c4', trim: '#e0d8c0',
    url: 'gente/3d/malherido/malherido_animado.glb', idle: 'jadeo', still: true, now: 'jadeo', turned: 0.12, against: { wheel: 27, behind: 12, down: 3 },
  },
};

/**
 * A broken cart wheel one lies back against: how big round, how far behind them it stands, and how
 * far they are let down (raised from the waist, they no longer touch the ground at its lowest).
 */
interface Against { wheel: number; behind: number; down: number }

/** How far over someone's head the line they say stands. */
const OVER = 24;
/** The sign over one who can be talked to: how far over their head, how near whoever comes is when it goes, how long it fades. */
const ASK = { over: 16, near: 110, fade: 0.25 };

/** Seconds between one's `now` and the next: the least, and how much more it may be, at random. */
const NOW = { least: 6, more: 8 };
/** How far round from the camera they look across the screen, unless they say: a share of a half turn. */
const TURNED = 0.35;
/** The breathing every model shares; and the walk, for one who is led along. */
const BREATHE = 'reposo_mixamo', WALK = 'caminata_mixamo';

/** Everyone a map stands about on it, outdoors, where it says. */
export class People {
  readonly group = new THREE.Group();
  private readonly moving: { who: string; body: THREE.Object3D; motion: Motion; reach: number; at: { x: number; y: number }; idle: string; still: boolean; now?: string; next: number; back?: number; led?: { to: THREE.Vector3; going: number }; walking?: boolean }[] = [];
  /** The sign over each who can be talked to, by who they are: shown while the game says they may be. */
  readonly signs = new Map<string, { sign: THREE.Sprite; asking: boolean; over: number }>();
  private time = 0;
  /** How high over the ground each stands' line is said, by where they stand on the 2D ground. */
  private readonly heads: { at: { x: number; y: number }; over: number }[] = [];

  constructor(map: WorldMap) {
    for (const { who, plot, faces, inside } of map.people ?? []) {
      const dress = DRESSES[who];
      if (!dress || inside) continue;
      const { x, y } = middle(plot);
      // They look across the screen the way they are said to, a little toward whoever comes.
      const stand = (body: THREE.Object3D) => {
        body.position.copy(ground(x, y));
        body.rotation.y = (faces === 'left' ? -1 : 1) * Math.PI * (dress.turned ?? TURNED);
        this.group.add(body);
      };
      // Whoever lies abed in a house is there, not here.
      if (Object.values(MODELS).some(b => b.inside?.abed?.some(one => one.who === who))) continue;
      this.heads.push({ at: { x, y }, over: (dress.against ? 0.55 : 1) * dress.drawn * UPRIGHT + OVER });
      const sign = asks();
      sign.visible = false;
      sign.material.opacity = 0;
      this.signs.set(who, { sign, asking: false, over: dress.drawn * UPRIGHT + ASK.over });
      if (!dress.url) { stand(figure(dress)); continue; }
      void model(dress.url, dress.drawn).then(loaded => {
        let body: THREE.Object3D = loaded;
        // One who lies back against a wheel does so with it behind him.
        if (dress.against) {
          const { wheel, behind, down } = dress.against, by = new THREE.Group(), round = brokenWheel(wheel);
          round.position.z = -behind;
          loaded.position.y = -down;
          by.add(round, loaded);
          body = by;
        }
        const motion = new Motion(loaded);
        const reach = motion.reach(WALK, 'L_Foot') * loaded.scale.x;
        const one = { who, body, motion, reach, at: { x, y }, idle: dress.idle ?? BREATHE, still: !!dress.still, now: dress.now, next: NOW.least + Math.random() * NOW.more };
        this.rest(one);
        this.moving.push(one);
        stand(body);
      });
    }
  }

  /** Back to how they stand when doing nothing: their idle, or its first pose held. */
  private rest(one: People['moving'][number], blend = 0.4): void {
    if (one.still) one.motion.hold(one.idle, 0);
    else one.motion.play(one.idle, { blend });
  }

  /** How high over the ground the line of whoever stands at this spot of the 2D ground is said, if anyone does. */
  over(at: { x: number; y: number }): number | undefined {
    return this.heads.find(h => Math.hypot(h.at.x - at.x, h.at.y - at.y) < 1)?.over;
  }

  /** Whoever stands at this spot of the 2D ground has just been come near, and says their one thing: they do what they do now and then, then and there (unless they are doing it already). */
  heard(at: { x: number; y: number }): void {
    const one = this.moving.find(m => Math.hypot(m.at.x - at.x, m.at.y - at.y) < 1);
    if (one?.now && one.back === undefined) this.now(one);
  }

  private now(one: People['moving'][number]): void {
    one.motion.play(one.now!, { once: true, afresh: true, blend: 0.4 });
    one.next = one.motion.seconds(one.now!) + NOW.least + Math.random() * NOW.more;
    one.back = one.motion.seconds(one.now!);
  }

  /**
   * One led along by the hero: where they are now on the 2D ground. They walk there at the pace that
   * keeps their feet from sliding, turned the way they go, and breathe again where they stop; what
   * they do now and then waits while they are led.
   */
  lead(who: string, at: { x: number; y: number }): void {
    const one = this.moving.find(m => m.who === who);
    if (!one) return;
    // Led along, seen through whatever hides them, in red.
    if (!one.led) seenThrough(one.body);
    one.led ??= { to: one.body.position.clone(), going: 0 };
    one.led.to.copy(ground(at.x, at.y));
    one.at = { x: at.x, y: at.y };
  }

  /** Whether this one may be talked to just now: a sign over them says so. */
  asking(who: string, on: boolean): void {
    const one = this.signs.get(who);
    if (one) one.asking = on;
  }

  /** Whether this one has a model of their own here, to be led along. */
  has(who: string): boolean {
    return !!DRESSES[who]?.url;
  }

  /** One led along, brought to where the hero has them: walking while they go, breathing where they stop. */
  private walk(one: People['moving'][number], dt: number): void {
    const led = one.led!, way = led.to.clone().sub(one.body.position).setY(0), far = way.length();
    if (far > 0.01) one.body.rotation.y = Math.atan2(way.x, way.z);
    one.body.position.copy(led.to);
    // How fast they go, eased so a halting step does not flicker between walking and standing.
    led.going += (far / Math.max(dt, 1e-3) - led.going) * Math.min(1, dt * 8);
    const walking = led.going > 8;
    if (walking) one.motion.play(WALK, { pace: one.reach ? Math.max(0.35, led.going / one.reach) : 1, blend: 0.2 });
    else if (one.walking) this.rest(one, 0.25);
    one.walking = walking;
    one.back = undefined;
    one.motion.update(dt);
  }

  update(dt: number, near?: { x: number; y: number }): void {
    this.time += dt;
    // The sign over each who may be talked to, faded in and out; gone once whoever comes is near
    // enough to talk (the sign of what F does says the rest).
    for (const [who, one] of this.signs) {
      const stands = this.moving.find(m => m.who === who);
      const at = stands?.at, far = at && near ? Math.hypot(at.x - near.x, (at.y - near.y) * 2) : Infinity;
      const want = one.asking && stands && far > ASK.near ? 1 : 0, now = one.sign.material.opacity;
      one.sign.material.opacity = want > now ? Math.min(1, now + dt / ASK.fade) : Math.max(0, now - dt / ASK.fade);
      one.sign.visible = one.sign.material.opacity > 0;
      if (one.sign.visible && stands) one.sign.position.copy(stands.body.position).setY(stands.body.position.y + one.over + Math.sin(this.time * 3) * 2);
    }
    for (const one of this.moving) {
      // Breathing until it is time for what they do now and then; once it is done, breathing again.
      if (one.led) { this.walk(one, dt); continue; }
      if (one.now && (one.next -= dt) <= 0) this.now(one);
      else if (one.back !== undefined && (one.back -= dt) <= 0) {
        this.rest(one);
        one.back = undefined;
      }
      one.motion.update(dt);
    }
  }
}
