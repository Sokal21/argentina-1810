import * as THREE from 'three';
import type { WorldMap } from '../world/zones';
import { middle } from '../world/zones';
import { MODELS } from './buildings';
import { figure, model, type Dress } from './figure';
import { Motion } from './motion';
import { ground, UPRIGHT } from './space';

// Those standing about a map: whoever has a model of their own, breathing where they stand; the
// rest, a figure of a few blocks in something of their colours, until they are modelled. Nobody
// talks to them in 3D: they are only there.

/**
 * How each looks: a figure of blocks, or the model at `url`, which breathes where it stands (or plays
 * its own `idle`) and,
 * if it has one, plays `now` once now and then (a glance, a sigh) and breathes again; `turned`, how
 * far round from the camera they look across the screen, as a share of a half turn.
 */
export const DRESSES: Record<string, Dress & { url?: string; idle?: string; now?: string; turned?: number }> = {
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
  malherido: { drawn: 80, coat: '#7a2a24', legs: '#d9d4c4', trim: '#e0d8c0' },
};

/** How far over someone's head the line they say stands. */
const OVER = 24;

/** Seconds between one's `now` and the next: the least, and how much more it may be, at random. */
const NOW = { least: 6, more: 8 };
/** How far round from the camera they look across the screen, unless they say: a share of a half turn. */
const TURNED = 0.35;
/** The breathing every model shares. */
const BREATHE = 'reposo_mixamo';

/** Everyone a map stands about on it, outdoors, where it says. */
export class People {
  readonly group = new THREE.Group();
  private readonly moving: { motion: Motion; at: { x: number; y: number }; idle: string; now?: string; next: number; back?: number }[] = [];
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
      this.heads.push({ at: { x, y }, over: dress.drawn * UPRIGHT + OVER });
      if (!dress.url) { stand(figure(dress)); continue; }
      void model(dress.url, dress.drawn).then(body => {
        const motion = new Motion(body);
        motion.play(dress.idle ?? BREATHE);
        this.moving.push({ motion, at: { x, y }, idle: dress.idle ?? BREATHE, now: dress.now, next: NOW.least + Math.random() * NOW.more });
        stand(body);
      });
    }
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

  update(dt: number): void {
    for (const one of this.moving) {
      // Breathing until it is time for what they do now and then; once it is done, breathing again.
      if (one.now && (one.next -= dt) <= 0) this.now(one);
      else if (one.back !== undefined && (one.back -= dt) <= 0) {
        one.motion.play(one.idle, { blend: 0.4 });
        one.back = undefined;
      }
      one.motion.update(dt);
    }
  }
}
