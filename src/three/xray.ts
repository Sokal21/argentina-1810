import * as THREE from 'three';

// Whoever matters seen through what hides them: behind a tree, a house, a rise, a flat red shape of
// them shows where they are. Each of their meshes gets a twin of the same shape (skinned to the same
// bones, so it moves as they do) drawn only where something already drawn stands in front of it.
// The twins are drawn after the scenery and before whoever they belong to (`renderOrder`): drawn
// after, the twin found the figure's own front in its way and showed red patches on the figure itself.
// They are opaque for that order to hold (what is see-through is drawn after everything opaque).

/** The red of a figure seen through what hides it. */
const SEEN = new THREE.MeshBasicMaterial({ color: '#c8281e', depthFunc: THREE.GreaterDepth, depthWrite: false });
/** The order things are drawn in: scenery (0), the twins, then whoever they belong to. */
const TWIN = 1, FIGURE = 2;
/**
 * What hides nobody: grass, low plants, fences. Drawn after the twins, so they are not yet there to be
 * seen through (in front of anyone's feet, the grass lit them red all the while).
 */
export const UNHIDING = 3;

/** Gives every mesh within `body` a red twin seen through whatever hides it. Once a body: twins are marked. */
export function seenThrough(body: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  body.traverse(node => { if (node instanceof THREE.Mesh && !node.userData.twin && !node.userData.twinned) meshes.push(node); });
  for (const mesh of meshes) {
    const twin = mesh instanceof THREE.SkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, SEEN) : new THREE.Mesh(mesh.geometry, SEEN);
    if (mesh instanceof THREE.SkinnedMesh && twin instanceof THREE.SkinnedMesh) {
      twin.bindMode = mesh.bindMode;
      twin.bind(mesh.skeleton, mesh.bindMatrix);
    }
    twin.userData.twin = true;
    mesh.userData.twinned = true;
    twin.renderOrder = TWIN;
    mesh.renderOrder = FIGURE;
    twin.frustumCulled = false;
    twin.castShadow = twin.receiveShadow = false;
    // Its child, standing where it stands: shown and hidden with it.
    mesh.add(twin);
  }
}
