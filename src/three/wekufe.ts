import * as THREE from 'three';
import { Stench } from './stench';

// What makes the Wekufe more than his model: he floats, rising and sinking a little; black smoke is
// let off his tail and his belly and hangs about him; and the red of his eyes and of what burns
// within his belly glows past his body, beating slowly, as halos drawn over everything (his model's
// own red is lit by glow.py's light map, which shines only on itself).

/** His smoke: puffs of black, thick, let off from the end of his tail to his chest, slow to leave him. */
const SMOKE = { kept: 44, life: [1.2, 2.2], drift: [2, 8], rise: [6, 16], size: [0.14, 0.26], swell: 2,
  colours: ['#0c0a0b', '#161214', '#1e1719'], thick: 0.85, from: [0.1, 0.62] };
/** How high he floats and how far he rises and sinks (shares of his height), and how fast. */
const FLOAT = { high: 0.12, bob: 0.03, beat: 1.4 };
/**
 * His halos: on which bone, how far before it and up it (shares of his height), how wide (a share of
 * his height), how bright at least and at most, and how fast they beat.
 */
const HALOS = [
  { bone: 'Head', ahead: 0.05, up: 0.01, wide: 0.16, bright: [0.75, 1] },
  { bone: 'Spine01', ahead: 0.07, up: 0, wide: 0.38, bright: [0.45, 0.8] },
];
const BEAT = 2.2;
const RED = new THREE.Color('#ff3018');

/** A halo's picture: bright at its middle, fading soft to its edge. */
let glowed: THREE.Texture | null = null;
function halo(): THREE.Texture {
  if (glowed) return glowed;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const soft = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  soft.addColorStop(0, 'rgba(255,255,255,1)');
  soft.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  soft.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = soft;
  g.fillRect(0, 0, size, size);
  return glowed = new THREE.CanvasTexture(canvas);
}

export class Wekufe {
  readonly group = new THREE.Group();
  private readonly smoke: Stench;
  private readonly halos: { sprite: THREE.Sprite; bone: THREE.Object3D | undefined; how: (typeof HALOS)[number] }[] = [];
  /** What of the model floats: everything under its root, so the root keeps the place the game gives it. */
  private readonly floats: THREE.Object3D[];
  private readonly at = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private time = Math.random() * 10;
  /** From 0 (gone) to 1. */
  power = 1;

  /** `body` is his model, already scaled, `tall` its height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    this.smoke = new Stench(body, tall, SMOKE);
    this.group.add(this.smoke.group);
    this.floats = [...body.children];
    for (const how of HALOS) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: halo(), color: RED, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      }));
      sprite.scale.setScalar(how.wide * tall);
      sprite.renderOrder = 10;
      this.group.add(sprite);
      this.halos.push({ sprite, bone: body.getObjectByName(how.bone), how });
    }
  }

  update(dt: number): void {
    this.time += dt;
    const shown = this.body.parent && this.body.visible ? this.power : 0;
    // Each child is moved in the root's units: the model is one unit tall.
    const high = FLOAT.high + FLOAT.bob * Math.sin(this.time * FLOAT.beat * Math.PI);
    for (const o of this.floats) o.position.y = high;
    this.smoke.power = shown;
    this.smoke.update(dt);
    this.body.updateWorldMatrix(true, true);
    this.body.getWorldQuaternion(this.turn);
    const ahead = this.ahead.set(0, 0, 1).applyQuaternion(this.turn).setY(0).normalize();
    const beat = 0.5 + 0.5 * Math.sin(this.time * BEAT * Math.PI);
    for (const { sprite, bone, how } of this.halos) {
      sprite.visible = !!bone && shown > 0.01;
      if (!bone) continue;
      bone.getWorldPosition(this.at);
      sprite.position.copy(this.at).addScaledVector(ahead, how.ahead * this.tall);
      sprite.position.y += how.up * this.tall;
      sprite.material.opacity = shown * (how.bright[0] + (how.bright[1] - how.bright[0]) * beat);
    }
  }
}
