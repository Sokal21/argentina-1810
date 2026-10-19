import * as THREE from 'three';
import { ISO_Y } from '../machi/data';

// The game still thinks in the 2D game's terms: x across, y down the foreshortened ground, in
// sprite pixels. Here that ground is laid flat and seen from 30° up, which foreshortens it by
// exactly ISO_Y again: a spot y pixels down the screen is y / ISO_Y deep, and something drawn h
// pixels tall stands h / cos 30° tall. One unit is one pixel of the drawing.

/** How far up the camera looks down from: the angle whose sine is the ground's foreshortening. */
export const PITCH = Math.asin(ISO_Y);
/** What an upright drawn height comes to, standing. */
export const UPRIGHT = 1 / Math.cos(PITCH);

/** How high the ground stands under a spot of the 2D ground: the map's relief, once it is raised (terrain.ts). */
let lie: (x: number, y: number) => number = () => 0;

/** Sets how high the ground stands everywhere, for whatever is put on it from now on. */
export function standOn(heights: (x: number, y: number) => number): void {
  lie = heights;
}

/** How high the ground stands under a spot of the 2D ground. */
export function heightAt(x: number, y: number): number {
  return lie(x, y);
}

/** A spot on the 2D game's ground, on the 3D ground, and `height` above it wherever the ground lies. */
export function ground(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(x, lie(x, y) + height, y / ISO_Y);
}

/** A way, or a distance, along the 2D game's ground, along the 3D ground: level, whatever the ground does. */
export function along(dx: number, dy: number): THREE.Vector3 {
  return new THREE.Vector3(dx, 0, dy / ISO_Y);
}

/** The way something walking along (dx, dy) of the 2D ground faces, as a turn about the upright. */
export function heading(dx: number, dy: number): number {
  return Math.atan2(dx, dy / ISO_Y);
}

/**
 * The spot of the 2D ground a ray (from the camera, through the pointer) meets: on the plane at
 * the height the ground stands where it last met, a few times over, which settles at once on
 * ground that rises and falls as gently as this does.
 */
export function onTheGround(ray: THREE.Ray): { x: number; y: number } | null {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  for (let pass = 0; pass < 4; pass++) {
    if (!ray.intersectPlane(plane, hit)) return null;
    plane.constant = -lie(hit.x, hit.z * ISO_Y);
  }
  return { x: hit.x, y: hit.z * ISO_Y };
}
