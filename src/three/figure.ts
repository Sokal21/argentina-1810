import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { flat, joined, part, placed } from './paint';
import { UPRIGHT } from './space';

// Someone standing, until their model is made: a figure of a few shapes in their colours, as tall
// as their drawing. Its front is +Z.

export interface Dress {
  /** How tall they are drawn, in sprite pixels. */
  drawn: number;
  coat: THREE.ColorRepresentation;
  legs: THREE.ColorRepresentation;
  skin?: THREE.ColorRepresentation;
  /** What is on their head, if anything: its colour and how tall it is, as a share of them. */
  hat?: { colour: THREE.ColorRepresentation; tall: number };
  /** The facings of a coat, its collar and cuffs. */
  trim?: THREE.ColorRepresentation;
  /** Whether they carry a sabre at the hip. */
  sabre?: boolean;
}

/** Cabral, the granadero: blue coat with red facings, white breeches, the tall black shako. */
export const CABRAL_DRESS: Dress = { drawn: 82, coat: '#2c3a6e', legs: '#d9d4c4', skin: '#d29a74', hat: { colour: '#1c1a1e', tall: 0.17 }, trim: '#a3322a', sabre: true };

export function figure(dress: Dress): THREE.Mesh {
  // The figure is built a unit tall and grown to their height.
  const hat = dress.hat?.tall ?? 0, h = 1 - hat;
  const skin = dress.skin ?? '#c99572';
  const pieces = [
    // Legs and boots.
    part(placed(new THREE.BoxGeometry(0.07, h * 0.44, 0.08), [-0.05, h * 0.22, 0]), dress.legs),
    part(placed(new THREE.BoxGeometry(0.07, h * 0.44, 0.08), [0.05, h * 0.22, 0]), dress.legs),
    part(placed(new THREE.BoxGeometry(0.08, h * 0.12, 0.1), [-0.05, h * 0.06, 0.01]), '#1d1814'),
    part(placed(new THREE.BoxGeometry(0.08, h * 0.12, 0.1), [0.05, h * 0.06, 0.01]), '#1d1814'),
    // The body and the arms.
    part(placed(new THREE.BoxGeometry(0.2, h * 0.36, 0.12), [0, h * 0.62, 0]), dress.coat),
    part(placed(new THREE.BoxGeometry(0.06, h * 0.34, 0.07), [-0.13, h * 0.61, 0]), dress.coat),
    part(placed(new THREE.BoxGeometry(0.06, h * 0.34, 0.07), [0.13, h * 0.61, 0]), dress.coat),
    part(placed(new THREE.BoxGeometry(0.06, 0.05, 0.06), [-0.13, h * 0.43, 0]), skin),
    part(placed(new THREE.BoxGeometry(0.06, 0.05, 0.06), [0.13, h * 0.43, 0]), skin),
    // The head, with a nose to show which way they look.
    part(placed(new THREE.BoxGeometry(0.11, h * 0.14, 0.11), [0, h * 0.87, 0]), skin),
    part(placed(new THREE.BoxGeometry(0.03, 0.03, 0.03), [0, h * 0.86, 0.065]), skin),
  ];
  if (dress.trim) {
    pieces.push(
      part(placed(new THREE.BoxGeometry(0.21, h * 0.05, 0.13), [0, h * 0.78, 0]), dress.trim),
      part(placed(new THREE.BoxGeometry(0.08, h * 0.24, 0.01), [0, h * 0.64, 0.062]), dress.trim),
      // The white crossbelts.
      part(placed(new THREE.BoxGeometry(0.03, h * 0.42, 0.01), [0, h * 0.62, 0.064], [0, 0, 0.55]), '#e8e2d2'),
    );
  }
  if (dress.hat) pieces.push(part(placed(new THREE.CylinderGeometry(0.065, 0.06, hat, 6), [0, h * 0.94 + hat / 2, 0]), dress.hat.colour));
  if (dress.hat && dress.trim) pieces.push(part(placed(new THREE.BoxGeometry(0.03, 0.06, 0.03), [0, h * 0.94 + hat + 0.02, 0.03]), dress.trim));
  if (dress.sabre) pieces.push(part(placed(new THREE.BoxGeometry(0.015, 0.36, 0.03), [-0.14, h * 0.32, -0.04], [0.5, 0, 0.12]), '#b8b4aa'));
  const body = new THREE.Mesh(joined(pieces), flat());
  body.scale.setScalar(dress.drawn * UPRIGHT);
  body.castShadow = body.receiveShadow = true;
  return body;
}

/** How strongly what a model says shines is lit by its own light. */
const SHINE = 4;

/**
 * Someone's model, made ready by tools/blender/prepare_model.py: one unit tall, feet at the
 * origin, front along +Z, its texture in a few flat colours. It is given the game's flat,
 * stepped light and grown to their drawn height.
 */
export async function model(url: string, drawn: number): Promise<THREE.Group> {
  const { scene, animations } = await new GLTFLoader().loadAsync(url);
  // Its clips go with it, for whoever animates it.
  scene.animations = animations;
  scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const was = node.material as THREE.MeshStandardMaterial;
    const material = flat('#ffffff');
    if (was.map) {
      was.map.minFilter = was.map.magFilter = THREE.NearestFilter;
      material.map = was.map;
    } else material.color.copy(was.color);
    // What the model says shines (tools/blender/glow.py: the plague-dead soldier's sores) is lit by a
    // light of its own, whatever the sun does. Laid as a light map rather than as its glow, which
    // is the whole body's own: its red when struck, its fire in a rage.
    if (was.emissiveMap) {
      was.emissiveMap.minFilter = was.emissiveMap.magFilter = THREE.NearestFilter;
      was.emissiveMap.channel = was.map?.channel ?? 0;
      material.lightMap = was.emissiveMap;
      material.lightMapIntensity = SHINE;
    }
    // Thin things (a blade) are drawn from both sides, as the model asks.
    material.side = was.side;
    node.material = material;
    node.castShadow = node.receiveShadow = true;
    // A body that moves can leave the box it was measured in at rest: it is drawn whether or not
    // that box is in view. Anything else (a building, its furniture, a thing held in a hand, which
    // goes with its bone) is drawn only while its box is: every model drawn always, the buildings
    // out of sight cost a fifth of the vado's picture, three times over.
    node.frustumCulled = !(node instanceof THREE.SkinnedMesh);
  });
  scene.scale.setScalar(drawn * UPRIGHT);
  return scene;
}

/** The red a body flashes when struck, as the 2D game's HitFX; the fire it burns with in a rage; the green of the plague on it. */
const HURT = new THREE.Color('#ff2a1f'), BURN = new THREE.Color('#ff6a18'), SICK = new THREE.Color('#7fd02a');

/**
 * Gives a body materials of its own (a copy of a model shares them with every other copy) and
 * returns how to flash it red when struck (0 none, 1 full), how strongly it burns, in a rage, and how
 * green the plague turns it.
 */
export function flashes(body: THREE.Object3D): (amount: number, burn?: number, sick?: number) => void {
  const own: THREE.MeshToonMaterial[] = [];
  body.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const was = node.material as THREE.MeshToonMaterial;
    const material = was.vertexColors ? flat() : flat(was.color);
    material.map = was.map;
    material.lightMap = was.lightMap;
    material.lightMapIntensity = was.lightMapIntensity;
    material.side = was.side;
    node.material = material;
    own.push(material);
  });
  let shown = -1, burnt = -1, sickened = -1;
  const glow = new THREE.Color(), part = new THREE.Color();
  return (amount, burn = 0, sick = 0) => {
    if (amount === shown && burn === burnt && sick === sickened) return;
    shown = amount;
    burnt = burn;
    sickened = sick;
    glow.copy(HURT).multiplyScalar(amount).add(part.copy(BURN).multiplyScalar(burn)).add(part.copy(SICK).multiplyScalar(sick));
    for (const material of own) material.emissive.copy(glow);
  };
}
