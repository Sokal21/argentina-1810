import Phaser from 'phaser';

// Flashes whatever it is attached to red. `amount` goes from 1 (solid red)
// to 0 (untouched); each object gets its own copy, so they flash on their own.
const fragShader = `
#define SHADER_NAME HIT_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uAmount;

varying vec2 outTexCoord;

void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  // Colours arrive multiplied by alpha; the red has to be as well, or it
  // would bleed into the transparent pixels around the shape.
  vec3 red = vec3(1.0, 0.16, 0.12) * c.a;
  gl_FragColor = vec4(mix(c.rgb, red, uAmount), c.a);
}
`;

export class HitFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  amount = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'HitFX', fragShader });
  }

  onPreRender(): void {
    this.set1f('uAmount', this.amount);
  }
}
