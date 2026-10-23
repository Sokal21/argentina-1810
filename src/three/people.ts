import * as THREE from 'three';
import type { WorldMap } from '../world/zones';
import { middle } from '../world/zones';
import { figure, model, type Dress } from './figure';
import { Motion } from './motion';
import { ground } from './space';

// Those standing about a map: whoever has a model of their own, breathing where they stand; the
// rest, a figure of a few blocks in something of their colours, until they are modelled. Nobody
// talks to them in 3D: they are only there.

export const DRESSES: Record<string, Dress & { url?: string }> = {
  braulio: { drawn: 78, coat: '#7a5a3a', legs: '#4a3a2a', hat: { colour: '#3a2e24', tall: 0.08 } },
  anselmo: { drawn: 80, coat: '#5a4636', legs: '#5a4636' },
  tobias: { drawn: 58, coat: '#8a7a5a', legs: '#5a4a36' },
  // Tripo from turnaround A, 23 October 2026; its texture in 24 colours (in 16 the mud on his
  // knees went the red of his facings, and read as blood).
  mateo: { drawn: 78, coat: '#a08a5a', legs: '#5a4a36', url: 'mateo/3d/mateo_animado.glb' },
  remedios: { drawn: 74, coat: '#8a3a3a', legs: '#6a5a4a' },
  ciriaco: { drawn: 78, coat: '#6a6a4a', legs: '#4a4236' },
  paisano: { drawn: 78, coat: '#9a7a4a', legs: '#3a3a3a', hat: { colour: '#2a2420', tall: 0.07 } },
  chacarero: { drawn: 78, coat: '#7a7a5a', legs: '#4a4236', hat: { colour: '#c8b078', tall: 0.06 } },
  benito: { drawn: 78, coat: '#4a3e34', legs: '#4a3e34' },
  alferez: { drawn: 80, coat: '#2c3a6e', legs: '#d9d4c4', trim: '#a3322a', hat: { colour: '#1c1a1e', tall: 0.12 } },
  malherido: { drawn: 80, coat: '#7a2a24', legs: '#d9d4c4', trim: '#e0d8c0' },
};

/** Everyone a map stands about on it, outdoors, where it says. */
export class People {
  readonly group = new THREE.Group();
  private readonly moving: Motion[] = [];

  constructor(map: WorldMap) {
    for (const { who, plot, faces, inside } of map.people ?? []) {
      const dress = DRESSES[who];
      if (!dress || inside) continue;
      const { x, y } = middle(plot);
      // They look across the screen the way they are said to, a little toward whoever comes.
      const stand = (body: THREE.Object3D) => {
        body.position.copy(ground(x, y));
        body.rotation.y = (faces === 'left' ? -1 : 1) * Math.PI * 0.35;
        this.group.add(body);
      };
      if (!dress.url) { stand(figure(dress)); continue; }
      void model(dress.url, dress.drawn).then(body => {
        const motion = new Motion(body);
        motion.play('reposo_mixamo');
        this.moving.push(motion);
        stand(body);
      });
    }
  }

  update(dt: number): void {
    for (const motion of this.moving) motion.update(dt);
  }
}
