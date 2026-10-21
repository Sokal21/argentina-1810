import * as THREE from 'three';
import { model } from './figure';
import { TitleSky } from './sky';
import { UPRIGHT } from './space';

// The title's Cabildo in 3D, over the painted one: the model, by night, the size and place of the
// painting's Cabildo, rendered at the painting's own size (each of its pixels one of the
// painting's) on a clear ground, for the title to draw as a picture between the painted sky and
// the people crossing the plaza. Seen from in front, from down in the plaza looking up, still.
// Moonlight, and the galleries lit from within, their light flickering. And the night sky behind,
// seen from the same spot, drawn into a picture of its own: the painted houses stand between.

/** Where the painted Cabildo stands in the painting: its front's left and right, and its foot. */
const PAINTED = { left: 294, right: 665, foot: 346 };
/**
 * Seen from the plaza, looking up at it: the eye a little over the ground (a share of its height),
 * looking at a point up its front (another share), through a lens this wide (degrees). Its walls
 * draw in as they rise, as a building's do seen from its foot.
 */
const EYE = 0.08, AIM = 0.75, FOV = 38;
/** The lights: the moon, the night sky, and the warm light in each gallery. */
const MOON = { colour: '#9db2ff', strength: 1.1 }, SKY = { top: '#24365e', bottom: '#0b0c12', strength: 0.9 };
const GALLERY = { colour: '#ffa040', strength: 420, reach: 90, arches: 5 };

export class TitleCabildo {
  /** Its picture, copied out of the renderer's own canvas (one Phaser can read, which a WebGL one is not). */
  readonly canvas = document.createElement('canvas');
  private readonly picture: CanvasRenderingContext2D;
  /** And the sky's, seen from where it is seen, by a camera that sees as far as the sky. */
  readonly skyCanvas = document.createElement('canvas');
  private readonly skyPicture: CanvasRenderingContext2D;
  private readonly sky = new TitleSky();
  private readonly skyCamera = new THREE.PerspectiveCamera();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly building = new THREE.Group();
  private readonly lights: { light: THREE.PointLight; strength: number; beat: number }[] = [];
  private loaded = false;

  constructor(private readonly width: number, private readonly height: number) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.canvas.width = width;
    this.canvas.height = height;
    this.picture = this.canvas.getContext('2d')!;
    this.skyCanvas.width = width;
    this.skyCanvas.height = height;
    this.skyPicture = this.skyCanvas.getContext('2d')!;
    this.camera = new THREE.PerspectiveCamera(FOV, width / height, 1, 20000);
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
      this.frame(long, deep / 2, tall);
      this.loaded = true;
    });
  }

  /**
   * Stands the camera in the plaza looking up at the building, as far off as puts its front's foot
   * as wide as the painted one's, and shifts the picture so that foot falls where the painted one's did.
   */
  private frame(long: number, front: number, tall: number): void {
    const w = this.width, h = this.height;
    const foot = (x: number) => new THREE.Vector3(x, 0, front).project(this.camera);
    let away = long * 2;
    for (let i = 0; i < 12; i++) {
      this.camera.position.set(0, tall * EYE, front + away);
      this.camera.lookAt(0, tall * AIM, front);
      this.camera.updateMatrixWorld();
      this.camera.updateProjectionMatrix();
      const wide = ((foot(long / 2).x - foot(-long / 2).x) * w) / 2;
      away *= wide / (PAINTED.right - PAINTED.left);
    }
    // Its foot's middle, in the picture's pixels, against where the painted one's was.
    const at = foot(0), x = ((at.x + 1) * w) / 2, y = ((1 - at.y) * h) / 2;
    this.camera.setViewOffset(w, h, x - (PAINTED.left + PAINTED.right) / 2, y - PAINTED.foot, w, h);
    this.skyCamera.copy(this.camera);
    this.skyCamera.far = 200000;
    this.skyCamera.updateProjectionMatrix();
  }

  /** Draws it at a moment (seconds); nothing until the model has loaded, so the painted one shows. */
  render(t: number): void {
    if (!this.loaded) return;
    // Lamps and torches never burn evenly.
    for (const { light, strength, beat } of this.lights) light.intensity = strength * (0.82 + 0.12 * Math.sin(t * 7.3 + beat) + 0.06 * Math.sin(t * 13.1 + beat * 2));
    this.sky.at(t);
    this.renderer.render(this.sky.scene, this.skyCamera);
    this.skyPicture.drawImage(this.renderer.domElement, 0, 0);
    this.renderer.render(this.scene, this.camera);
    this.picture.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.picture.drawImage(this.renderer.domElement, 0, 0);
  }
}
