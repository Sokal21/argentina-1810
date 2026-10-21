import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// The title's name and its Sol de Mayo in 3D: each the pixel art it was drawn as, raised into a
// solid in Blender (tools/blender/extrude_pixels.py, the lighter the higher), turning a little one
// way and the other while a warm light passes over its gold. Rendered into a picture of its own,
// a few of its pixels to each of the drawing's, for the title to show where the drawing was.

/** One renderer for all of them: each picture is drawn in turn and copied out. */
let shared: THREE.WebGLRenderer | null = null;

function renderer(): THREE.WebGLRenderer {
  if (shared) return shared;
  shared = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  shared.setPixelRatio(1);
  shared.setClearColor(0x000000, 0);
  return shared;
}

/** How wide the camera sees, up and down (degrees). */
const FOV = 24;

/** How it moves: how far and how slowly it turns either way (radians), about the upright and across. */
export interface Sway { turn: number; pace: number; nod: number; nodPace: number }

export class TitleEmblem {
  /** Its picture, which Phaser can read (a WebGL canvas it cannot). */
  readonly canvas = document.createElement('canvas');
  private readonly picture: CanvasRenderingContext2D;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly body = new THREE.Group();
  private readonly glint = new THREE.DirectionalLight('#fff0c8', 3.2);
  loaded = false;

  /**
   * `url` the solid, `wide` and `high` the drawing's size in its pixels, `res` how many of the
   * picture's pixels to each of the drawing's (enough that the sides of its pixels show as it turns).
   */
  constructor(url: string, wide: number, high: number, readonly res: number, private readonly sway: Sway) {
    // Room around it for its sides as it turns.
    const pad = Math.ceil(Math.max(wide, high) * 0.08) + 4, w = wide + 2 * pad, h = high + 2 * pad;
    this.canvas.width = w * res;
    this.canvas.height = h * res;
    this.picture = this.canvas.getContext('2d')!;
    // Seen a little in perspective, so that as it turns its near side grows and its far one shrinks.
    this.camera = new THREE.PerspectiveCamera(FOV, w / h, 1, 5000);
    this.camera.position.set(0, 0, h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.camera.lookAt(0, 0, 0);
    // Its own colours by night, never dark; the passing light brings out the gold and the relief.
    this.scene.add(new THREE.AmbientLight('#ffffff', 1.0), this.glint, this.glint.target, this.body);
    const key = new THREE.DirectionalLight('#ffd9a0', 0.9);
    key.position.set(-0.5, 0.8, 1);
    this.scene.add(key);
    void new GLTFLoader().loadAsync(url).then(({ scene }) => {
      scene.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const map = (node.material as THREE.MeshStandardMaterial).map;
        if (map) map.minFilter = map.magFilter = THREE.NearestFilter;
        node.material = new THREE.MeshStandardMaterial({ map, metalness: 0.3, roughness: 0.25 });
      });
      this.body.add(scene);
      this.loaded = true;
    });
  }

  /** Draws it at a moment (seconds); nothing until it has loaded. */
  render(t: number): void {
    if (!this.loaded) return;
    const { turn, pace, nod, nodPace } = this.sway;
    this.body.rotation.set(nod * Math.sin(t * nodPace), turn * Math.sin(t * pace), 0);
    // The light comes across it from one side to the other and back, low, as off a lamp.
    this.glint.position.set(Math.sin(t * 0.45) * 1.2, 0.35, 0.6);
    const gl = renderer();
    gl.setSize(this.canvas.width, this.canvas.height, false);
    gl.render(this.scene, this.camera);
    this.picture.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.picture.drawImage(gl.domElement, 0, 0);
  }
}
