import Phaser from 'phaser';
import { waterLevels } from '../world/water';
import { PLOT_H, PLOT_W, type WorldMap } from '../world/zones';

// The water of a map: its stream, its ford and the pools of its marsh. It is
// told how much water each plot holds by a small picture, one pixel a plot,
// read smoothly so the water does not end where a plot does, and its shore is
// pushed in and out by noise so it wanders. It is drawn in whole sprite
// pixels and a few flat colours: slow brown water, pale lines of ripple that
// slide along it, a rim of wet mud. Only what the camera sees is drawn.
const FRAG = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec2 origin;      // the ground under the quad's top-left corner, in sprite pixels
uniform vec2 plots;       // how many plots the map is across and down
uniform sampler2D levels; // the water in each plot

varying vec2 fragCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 at = floor(origin + vec2(fragCoord.x, resolution.y - fragCoord.y));
  vec2 plot = at / vec2(${PLOT_W.toFixed(1)}, ${PLOT_H.toFixed(1)});
  // Nothing beyond the map's own edges.
  if (plot.x < 0.0 || plot.y < 0.0 || plot.x > plots.x || plot.y > plots.y) discard;
  float held = texture2D(levels, plot / plots).r;
  // The shore wanders: broad bays and a finer ragged edge.
  float ragged = noise(at * vec2(0.022, 0.044)) * 0.65 + noise(at * vec2(0.09, 0.18) + 3.0) * 0.35;
  float level = held + (ragged - 0.5) * 0.34;

  vec3 deep = vec3(0.22, 0.27, 0.24);
  vec3 shallow = vec3(0.36, 0.38, 0.27);
  vec3 ripple = vec3(0.50, 0.56, 0.48);
  vec3 mud = vec3(0.31, 0.25, 0.14);

  // Lines of ripple, a pixel thick, drifting slowly downstream.
  float drift = noise(vec2(at.x * 0.045 - time * 0.22, at.y * 0.3)) * 2.4;
  float lines = step(0.9, fract(at.y * 0.2 + drift)) * step(0.45, noise(vec2(at.x * 0.07 - time * 0.3, at.y * 0.5 + 9.0)));

  vec3 colour;
  if (level > 0.78) colour = mix(deep, ripple, lines * 0.8);
  else if (level > 0.5) colour = mix(shallow, ripple, lines * 0.6);
  else if (level > 0.44) colour = mud;
  else {
    // Wet ground: here and there a standing pool, with its own rim of mud.
    float pool = noise(at * vec2(0.035, 0.07) + 17.0) + (held - 0.35) * 1.2;
    if (held < 0.2 || pool < 0.6) discard;
    colour = pool < 0.64 ? mud : mix(shallow, ripple, lines * 0.5);
  }
  gl_FragColor = vec4(colour, 1.0);
}
`;

/** A map's water, kept under whatever the camera is looking at. */
export class Water {
  private quad?: Phaser.GameObjects.Shader;

  constructor(private scene: Phaser.Scene, map: WorldMap) {
    const levels = waterLevels(map);
    if (scene.renderer.type !== Phaser.WEBGL || !levels.some(row => row.some(level => level > 0))) return;
    const rows = levels.length, cols = levels[0].length;
    const key = `water:${map.name}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, cols, rows)!;
    const picture = tex.getContext().createImageData(cols, rows);
    levels.forEach((row, r) => row.forEach((level, c) => {
      const i = (r * cols + c) * 4;
      picture.data[i] = picture.data[i + 1] = picture.data[i + 2] = Math.round(level * 255);
      picture.data[i + 3] = 255;
    }));
    tex.getContext().putImageData(picture, 0, 0);
    tex.refresh();
    // Read smoothly between plots, unlike everything else in the game.
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const base = new Phaser.Display.BaseShader('water', FRAG, undefined, {
      origin: { type: '2f', value: { x: 0, y: 0 } },
      plots: { type: '2f', value: { x: cols, y: rows } },
      levels: { type: 'sampler2D', value: null },
    });
    // Over the grass, under every shadow and everything that stands.
    this.quad = scene.add.shader(base, 0, 0, 16, 16).setOrigin(0, 0).setDepth(-1e6 + 1.5);
    this.quad.setSampler2D('levels', key);
    this.follow();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.follow, this));
  }

  /** Brings it under the camera; to be called every step. */
  follow(): void {
    if (!this.quad) return;
    const view = this.scene.cameras.main.worldView;
    const x = Math.floor(view.x) - 2, y = Math.floor(view.y) - 2;
    const w = Math.ceil(view.width) + 4, h = Math.ceil(view.height) + 4;
    if (this.quad.width !== w || this.quad.height !== h) this.quad.setSize(w, h);
    this.quad.setPosition(x, y);
    this.quad.setUniform('origin.value.x', x);
    this.quad.setUniform('origin.value.y', y);
  }
}
