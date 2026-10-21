import * as THREE from 'three';
import { model } from './figure';
import { UPRIGHT } from './space';

// The title's Cabildo in 3D, over the painted one: the model, by night, the size and place of the
// painting's Cabildo, rendered at the painting's own size (each of its pixels one of the
// painting's) on a clear ground, for the title to draw as a picture between the painted sky and
// the people crossing the plaza. Seen from in front and a little above, as painted; it turns a
// little one way and the other, slowly, so it is seen to be solid. Moonlight, and the galleries lit
// from within, their light flickering.

/** Where the painted Cabildo stands in the painting: its front's left and right, and its foot. */
const PAINTED = { left: 294, right: 665, foot: 346 };
/** How far it is seen from above (radians), and how far and how slowly it turns either way. */
const PITCH = THREE.MathUtils.degToRad(9), SWAY = { angle: 0.055, pace: 0.22 };
/** The lights: the moon, the night sky, and the warm light in each gallery. */
const MOON = { colour: '#9db2ff', strength: 1.1 }, SKY = { top: '#24365e', bottom: '#0b0c12', strength: 0.9 };
const GALLERY = { colour: '#ffa040', strength: 420, reach: 90, arches: 5 };

export class TitleCabildo {
  /** Its picture, copied out of the renderer's own canvas (one Phaser can read, which a WebGL one is not). */
  readonly canvas = document.createElement('canvas');
  private readonly picture: CanvasRenderingContext2D;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly building = new THREE.Group();
  private readonly lights: { light: THREE.PointLight; strength: number; beat: number }[] = [];
  private loaded = false;

  constructor(width: number, private readonly height: number) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.canvas.width = width;
    this.canvas.height = height;
    this.picture = this.canvas.getContext('2d')!;
    // One unit of the world to each pixel of the painting.
    this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 6000);
    this.scene.add(new THREE.HemisphereLight(SKY.top, SKY.bottom, SKY.strength));
    const moon = new THREE.DirectionalLight(MOON.colour, MOON.strength);
    moon.position.set(-400, 700, 600);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    Object.assign(moon.shadow.camera, { left: -600, right: 600, top: 600, bottom: -600, near: 1, far: 3000 });
    this.scene.add(moon, this.building);
    // The plaza is the painting's: here only the shadow the building casts on it.
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1400), new THREE.ShadowMaterial({ opacity: 0.35 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    void model('edificios/3d/cabildo.glb', 1 / UPRIGHT).then(shape => {
      // As wide as the painted one.
      const box = new THREE.Box3().setFromObject(shape), size = box.getSize(new THREE.Vector3());
      const k = (PAINTED.right - PAINTED.left) / size.x;
      shape.scale.multiplyScalar(k);
      const long = size.x * k, deep = size.z * k, tall = size.y * k;
      this.building.add(shape);
      // Its galleries' lights, on both floors, either side of the tower, just within the arches.
      for (const [floor, high] of [[0, 0.11], [1, 0.27]] as const) {
        for (let i = 0; i < GALLERY.arches * 2; i++) {
          const side = i < GALLERY.arches ? -1 : 1, n = i % GALLERY.arches;
          const x = side * (long * 0.12 + (n + 0.5) * (long * 0.36 / GALLERY.arches));
          const strength = GALLERY.strength * (floor ? 0.6 : 1), light = new THREE.PointLight(GALLERY.colour, strength, GALLERY.reach, 1.6);
          light.position.set(x, tall * high, deep / 2 - 24);
          this.building.add(light);
          this.lights.push({ light, strength, beat: Math.random() * 10 });
        }
      }
      this.frame(deep / 2);
      this.loaded = true;
    });
  }

  /** Stands the camera so that the front of the building's foot is where the painted one's is. */
  private frame(front: number): void {
    const back = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    this.camera.position.copy(back).multiplyScalar(3000);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    // Where its foot falls now, and where it should: the camera moved up or down its own up by the difference.
    const foot = new THREE.Vector3(0, 0, front).project(this.camera);
    const want = 1 - (2 * PAINTED.foot) / this.height;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(up, ((foot.y - want) * this.height) / 2);
    this.camera.updateMatrixWorld();
  }

  /** Draws it at a moment (seconds); nothing until the model has loaded, so the painted one shows. */
  render(t: number): void {
    if (!this.loaded) return;
    this.building.rotation.y = SWAY.angle * Math.sin(t * SWAY.pace);
    // Lamps and torches never burn evenly.
    for (const { light, strength, beat } of this.lights) light.intensity = strength * (0.82 + 0.12 * Math.sin(t * 7.3 + beat) + 0.06 * Math.sin(t * 13.1 + beat * 2));
    this.renderer.render(this.scene, this.camera);
    this.picture.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.picture.drawImage(this.renderer.domElement, 0, 0);
  }
}
