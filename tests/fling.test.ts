import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Fling } from '../src/three/fling';

describe('a musket let fall', () => {
  it('drops from his hands, bounces and comes to lie flat on the ground, both ends down', () => {
    const field = new THREE.Group(), body = new THREE.Group(), hand = new THREE.Group(), gun = new THREE.Object3D();
    gun.name = 'mosquete_mano';
    field.add(body); body.add(hand); hand.add(gun);
    // Held 40 over the ground, tipped a little up, at the gallery's size.
    hand.position.set(0, 40, 0);
    gun.scale.setScalar(90);
    gun.rotation.z = 0.5;
    const fling = new Fling(() => 0);
    fling.throw(body);
    const heights: number[] = [];
    for (let t = 0; t < 4; t += 1 / 60) {
      fling.update(1 / 60);
      const [out] = fling.guns;
      if (out) heights.push(out.position.y);
    }
    expect(fling.guns[0]?.parent).toBe(field);
    gun.updateMatrix();
    const tip = new THREE.Vector3(0.62, 0, 0).applyMatrix4(gun.matrix);
    expect(gun.position.y).toBeLessThan(3);
    expect(tip.y).toBeLessThan(3);
    // It came up again off the ground at least once: it bounced.
    const lowest = heights.findIndex(h => h < 3);
    expect(Math.max(...heights.slice(lowest))).toBeGreaterThan(heights[lowest] + 1);
    fling.back();
    expect(gun.parent).toBe(hand);
  });
});

describe("a spotter's two flags let fall", () => {
  it('each falls from its own hand and lies on the ground; both go back to his hands', () => {
    const field = new THREE.Group(), body = new THREE.Group();
    field.add(body);
    const flags = ['bandera_roja', 'bandera_blanca'].map((name, i) => {
      const hand = new THREE.Group(), flag = new THREE.Object3D();
      flag.name = name;
      hand.position.set(i ? 20 : -20, 50, 0);
      flag.scale.setScalar(90);
      body.add(hand); hand.add(flag);
      return { hand, flag };
    });
    const fling = new Fling(() => 0);
    for (const { flag } of flags) fling.throw(body, flag.name, 0.28);
    for (let t = 0; t < 4; t += 1 / 60) fling.update(1 / 60);
    expect(fling.guns).toHaveLength(2);
    for (const { flag } of flags) {
      expect(flag.parent).toBe(field);
      expect(flag.position.y).toBeLessThan(3);
    }
    fling.back();
    for (const { hand, flag } of flags) expect(flag.parent).toBe(hand);
  });
});
