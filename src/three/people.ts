import * as THREE from 'three';
import type { WorldMap } from '../world/zones';
import { middle } from '../world/zones';
import { figure, type Dress } from './figure';
import { ground } from './space';

// Those standing about a map, each a figure of a few blocks in something of their colours, until
// they are modelled. Nobody talks to them in 3D: they are only there.

const DRESSES: Record<string, Dress> = {
  braulio: { drawn: 78, coat: '#7a5a3a', legs: '#4a3a2a', hat: { colour: '#3a2e24', tall: 0.08 } },
  anselmo: { drawn: 80, coat: '#5a4636', legs: '#5a4636' },
  tobias: { drawn: 58, coat: '#8a7a5a', legs: '#5a4a36' },
  mateo: { drawn: 62, coat: '#a08a5a', legs: '#5a4a36' },
  remedios: { drawn: 74, coat: '#8a3a3a', legs: '#6a5a4a' },
  ciriaco: { drawn: 78, coat: '#6a6a4a', legs: '#4a4236' },
  paisano: { drawn: 78, coat: '#9a7a4a', legs: '#3a3a3a', hat: { colour: '#2a2420', tall: 0.07 } },
  chacarero: { drawn: 78, coat: '#7a7a5a', legs: '#4a4236', hat: { colour: '#c8b078', tall: 0.06 } },
  benito: { drawn: 78, coat: '#4a3e34', legs: '#4a3e34' },
  alferez: { drawn: 80, coat: '#2c3a6e', legs: '#d9d4c4', trim: '#a3322a', hat: { colour: '#1c1a1e', tall: 0.12 } },
  malherido: { drawn: 80, coat: '#7a2a24', legs: '#d9d4c4', trim: '#e0d8c0' },
};

/** Everyone a map stands about on it, outdoors, where it says. */
export function raisePeople(map: WorldMap): THREE.Group {
  const group = new THREE.Group();
  for (const { who, plot, faces, inside } of map.people ?? []) {
    const dress = DRESSES[who];
    if (!dress || inside) continue;
    const { x, y } = middle(plot);
    const body = figure(dress);
    body.position.copy(ground(x, y));
    // They look across the screen the way they are said to, a little toward whoever comes.
    body.rotation.y = (faces === 'left' ? -1 : 1) * Math.PI * 0.35;
    group.add(body);
  }
  return group;
}
