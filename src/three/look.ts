import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Everything the picture's look is made of, as numbers to tune: the pixels and their edges, the
// light, and a finishing pass over the whole picture (colour, palette and dithering, grain, and
// what a lens or an old screen does to it). The finishing pass works on the world's own pixels,
// not the screen's: dithering, grain and scanlines go a block at a time, so they read as pixel art.

export interface Look {
  /** Screen pixels to each pixel of the world. */
  pixel: number;
  /** World units each pixel of it shows: above 1 the camera stands further off and more of the map is seen, in fewer pixels. */
  far: number;
  /** Lines along creases (lighter) and along outlines (darker). */
  creases: number;
  outlines: number;

  sunStrength: number;
  sunColour: string;
  /** Where the sun is: round from straight ahead of the camera (degrees, to the right), and how high. */
  sunRound: number;
  sunHigh: number;
  skyStrength: number;
  skyColour: string;
  groundColour: string;
  shadows: boolean;
  /** Steps of light things are shaded in, and how much of their colour the darkest leaves. */
  steps: number;
  darkest: number;

  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  /** A colour laid into the dark parts, and how much. */
  shadeColour: string;
  shade: number;
  /** A colour laid over the light parts, and how much. */
  lightColour: string;
  light: number;

  /** Levels per colour channel the picture is brought down to (0: as it is), and how much it is dithered on the way. */
  levels: number;
  dither: number;

  /** Grain, a pixel at a time, and whether it moves. */
  grain: number;
  grainMoves: boolean;
  vignette: number;
  /** Red and blue pulled apart toward the edges, in the world's pixels. */
  aberration: number;
  /** How much the picture bulges, as an old screen's glass. */
  bulge: number;
  /** Every other row of the world's pixels darkened by this much. */
  scanlines: number;

  /** The pale arc a sabre leaves as it cuts. */
  trail: boolean;

  /** The ring where a blow lands: how wide it starts and ends (world units), its band, how long it lasts. */
  impactFrom: number;
  impactTo: number;
  impactBand: number;
  impactLife: number;
  impactColour: string;
  /** Its glow: colour, strength, and how much wider than the ring, and its band. */
  impactGlowColour: string;
  impactGlow: number;
  impactGlowWider: number;
  impactGlowBand: number;
  /** Turned to face whoever struck (seen in perspective), or to the camera. */
  impactFacesStriker: boolean;

  /** His roll (the dash), in the 3D game only: seconds it lasts and ground it covers (sprite pixels). */
  rollTime: number;
  rollDistance: number;
}

/** The look the user tuned in the panel and chose (17 October 2026). */
export const LOOK: Look = {
  pixel: 3, far: 1.8, creases: 0.3, outlines: 0.89,
  sunStrength: 2.4, sunColour: '#fff1d6', sunRound: -50, sunHigh: 55,
  skyStrength: 1.6, skyColour: '#cfd8dc', groundColour: '#8a7a50', shadows: true,
  steps: 3, darkest: 0.45,
  brightness: 0, contrast: 1, saturation: 1, gamma: 1,
  shadeColour: '#2a3a6a', shade: 0, lightColour: '#ffd9a0', light: 0,
  levels: 0, dither: 0,
  grain: 0, grainMoves: true, vignette: 0, aberration: 0.9, bulge: 0, scanlines: 0.05,
  trail: true,
  impactFrom: 2, impactTo: 14, impactBand: 0.14, impactLife: 0.24, impactColour: '#ff2a1a',
  impactGlowColour: '#ff5a30', impactGlow: 0.45, impactGlowWider: 1.15, impactGlowBand: 0.5,
  impactFacesStriker: true,
  // The 2D game's dash is 0.5 s and 96: under two metres, and a whole roll in it turned on the spot.
  rollTime: 0.8, rollDistance: 170,
};

const hex = (colour: string) => new THREE.Color(colour);

/** The finishing pass, to go last, after the picture is in display colours. */
export function finishing(): ShaderPass {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(1, 1) },
      pixel: { value: 3 },
      time: { value: 0 },
      brightness: { value: 0 }, contrast: { value: 1 }, saturation: { value: 1 }, gamma: { value: 1 },
      shadeColour: { value: new THREE.Color() }, shade: { value: 0 },
      lightColour: { value: new THREE.Color() }, light: { value: 0 },
      levels: { value: 0 }, dither: { value: 0 },
      grain: { value: 0 }, grainMoves: { value: 0 },
      vignette: { value: 0 }, aberration: { value: 0 }, bulge: { value: 0 }, scanlines: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float pixel, time;
      uniform float brightness, contrast, saturation, gamma;
      uniform vec3 shadeColour, lightColour;
      uniform float shade, light, levels, dither, grain, grainMoves, vignette, aberration, bulge, scanlines;
      varying vec2 vUv;

      float bayer(vec2 p) {
        // A 4x4 ordered dither, from 0 to 1.
        int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
        int i = x + y * 4;
        float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
        return (m[i] + 0.5) / 16.0;
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        // The glass's bulge, from the middle out.
        vec2 c = vUv * 2.0 - 1.0;
        c *= 1.0 + bulge * dot(c, c);
        vec2 uv = c * 0.5 + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        // Read at the middle of the world's pixel this falls in, so its blocks stay whole.
        vec2 block = floor(uv * resolution / pixel);
        vec2 at = (block + 0.5) * pixel / resolution;
        vec2 apart = c * aberration * pixel / resolution;
        vec3 col = vec3(texture2D(tDiffuse, at + apart).r, texture2D(tDiffuse, at).g, texture2D(tDiffuse, at - apart).b);

        col = (col - 0.5) * contrast + 0.5 + brightness;
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(luma), col, saturation);
        col = pow(max(col, 0.0), vec3(1.0 / gamma));
        luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, col * shadeColour * 2.0, shade * (1.0 - luma));
        col = mix(col, col * lightColour * 1.4, light * luma);

        col += (hash(block + floor(time * 12.0) * grainMoves) - 0.5) * grain;
        if (levels >= 2.0) {
          col += (bayer(block) - 0.5) * dither / (levels - 1.0);
          col = floor(clamp(col, 0.0, 1.0) * (levels - 1.0) + 0.5) / (levels - 1.0);
        }
        col *= 1.0 - vignette * dot(c, c) * 0.5;
        col *= 1.0 - scanlines * mod(block.y, 2.0);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `,
  });
}

/** Sets the finishing pass's numbers from a look. */
export function finish(pass: ShaderPass, look: Look, width: number, height: number, time: number): void {
  const u = pass.uniforms;
  u.resolution.value.set(width, height);
  u.pixel.value = look.pixel;
  u.time.value = time;
  for (const key of ['brightness', 'contrast', 'saturation', 'gamma', 'shade', 'light', 'levels', 'dither', 'grain', 'vignette', 'aberration', 'bulge', 'scanlines'] as const) {
    u[key].value = look[key];
  }
  u.grainMoves.value = look.grainMoves ? 1 : 0;
  u.shadeColour.value.copy(hex(look.shadeColour));
  u.lightColour.value.copy(hex(look.lightColour));
}

/** The way to the sun, from its place round the camera and its height. */
export function sunWay(look: Look): THREE.Vector3 {
  const round = THREE.MathUtils.degToRad(look.sunRound), high = THREE.MathUtils.degToRad(look.sunHigh);
  // Round from straight ahead of the camera (it looks north, -Z): 0 is behind the camera, south.
  return new THREE.Vector3(Math.sin(round) * Math.cos(high), Math.sin(high), Math.cos(round) * Math.cos(high));
}
