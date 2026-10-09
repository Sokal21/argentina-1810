import Phaser from 'phaser';

// Wind in the trees. A drawing given this is not moved: each row of it is
// slid sideways by a whole number of its own pixels, the more the higher it
// is, so a trunk stays rooted while its crown leans and comes back. The gusts
// travel across the ground, so trees along their way lean one after another.
// Every drawing given it must be the same size.
const STRENGTH = 1.8;   // how far the very top is carried, in pixels of the drawing
const fragShader = `
#define SHADER_NAME WIND_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;     // seconds
uniform float uLeft;     // where the left edge of the screen is on the ground, in sprite pixels
uniform float uZoom;     // screen pixels per sprite pixel
uniform vec2 uSize;      // the drawing, in its own pixels
uniform float uStrength;

varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

void main() {
  float up = 1.0 - outTexCoord.y; // 0 at the foot, 1 at the top
  float across = uLeft + gl_FragCoord.x / uZoom;
  // A slow lean with a quicker shiver over it, both passing from left to right.
  float gust = sin(across * 0.012 - uTime * 1.3) + 0.5 * sin(across * 0.031 - uTime * 2.9);
  float slid = floor(gust * uStrength * up * up + 0.5);
  vec2 uv = vec2(outTexCoord.x - slid / uSize.x, outTexCoord.y);

  vec4 texture = texture2D(uMainSampler, uv);
  // Nothing is carried in from beyond the drawing's edge.
  if (uv.x < 0.0 || uv.x > 1.0) texture = vec4(0.0);
  gl_FragColor = texture * vec4(outTint.bgr * outTint.a, outTint.a);
}
`;

export class Wind extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  /** The camera the trees are seen through. */
  lens?: Phaser.Cameras.Scene2D.Camera;
  /** The size every drawing given the wind has, in its own pixels. */
  drawn = { width: 1, height: 1 };

  constructor(game: Phaser.Game) {
    super({ game, name: 'Wind', fragShader });
  }

  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uLeft', this.lens?.worldView.x ?? 0);
    this.set1f('uZoom', this.lens?.zoom ?? 1);
    this.set2f('uSize', this.drawn.width, this.drawn.height);
    this.set1f('uStrength', STRENGTH);
  }
}

/**
 * Sets the wind on some drawings, all of one size, seen through a scene's
 * camera. Without WebGL they simply stand still.
 */
export function blow(scene: Phaser.Scene, things: Phaser.GameObjects.Image[]): void {
  if (scene.renderer.type !== Phaser.WEBGL || !things.length) return;
  const pipelines = (scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.has('Wind')) pipelines.add('Wind', new Wind(scene.game));
  const wind = pipelines.get('Wind') as Wind;
  wind.lens = scene.cameras.main;
  wind.drawn = { width: things[0].width, height: things[0].height };
  for (const thing of things) thing.setPipeline('Wind');
}
