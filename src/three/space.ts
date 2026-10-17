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

/** A spot on the 2D game's ground, on the 3D ground. */
export function ground(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(x, height, y / ISO_Y);
}

/** The way something walking along (dx, dy) of the 2D ground faces, as a turn about the upright. */
export function heading(dx: number, dy: number): number {
  return Math.atan2(dx, dy / ISO_Y);
}
