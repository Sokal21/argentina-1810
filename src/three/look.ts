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
  /** How far the darks are pushed down into black, for a harder picture. */
  crush: number;
  /** A dull colour every colour is drawn toward, and how much: sadder colours. */
  murkColour: string;
  murk: number;
  /** Grime: dark blotches and specks over the ground, held to the world as it moves; their colour. */
  grime: number;
  grimeColour: string;
  /** How much the reds keep their colour (and are lifted) while everything else is made sadder. */
  reds: number;
  /** Shadows of clouds drifting over the country: how dark, how big (world pixels across), how fast. */
  clouds: number;
  cloudSize: number;
  cloudSpeed: number;
  /** A faint haze, thicker toward the top of the picture (further off), and its colour. */
  haze: number;
  hazeColour: string;
  /** A glow round only what is very bright (a flash, a glint, fire): how strong, and from how bright. */
  bloom: number;
  bloomFrom: number;

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

  /** How fast he goes, in the 3D game only: sprite pixels a second along the ground (the 2D game's is 84). */
  speed: number;

  /** His roll (the dash), in the 3D game only: seconds it lasts and ground it covers (sprite pixels). */
  rollTime: number;
  rollDistance: number;
}

/**
 * The look before it was made harder (the user's, 17 October 2026), and the harder one, darker,
 * dirtier and sadder, asked for on 19 October: either can be put back in the panel ("estética dura").
 */
export const CLEAN: Partial<Look> = {
  sunStrength: 2.4, sunColour: '#fff1d6', skyStrength: 1.6, skyColour: '#cfd8dc', groundColour: '#8a7a50',
  brightness: 0, contrast: 1, saturation: 1, gamma: 1,
  shadeColour: '#2a3a6a', shade: 0, lightColour: '#ffd9a0', light: 0,
  crush: 0, murkColour: '#6b6448', murk: 0, grime: 0, grimeColour: '#3a2c1e',
  reds: 0, clouds: 0, haze: 0, bloom: 0, sunHigh: 55,
  grain: 0, vignette: 0,
};
export const HARSH: Partial<Look> = {
  skyStrength: 1.45, skyColour: '#b4babb', groundColour: '#6e6142',
  // Less sepia and more contrast than first made (the user: "demasiado sepia").
  brightness: -0.01, contrast: 1.22, saturation: 0.82, gamma: 1,
  shadeColour: '#2e3a48', shade: 0.4, lightColour: '#d8b47a', light: 0.1,
  crush: 0.35, murkColour: '#6b6448', murk: 0.07, grime: 0.45, grimeColour: '#3a2c1e',
  // No grain: moving, it read as rain, and the user did not want it.
  grain: 0, vignette: 0.7,
  // The reds kept (blood, his facings, the glint, the flash); clouds' shadows going over; the
  // faintest haze; a low evening sun, raking and warm; and a glow round only what burns.
  reds: 0.8, clouds: 0.32, haze: 0.1, bloom: 0.7,
  sunHigh: 24, sunStrength: 2.5, sunColour: '#ffd9b4',
};

/** The look the user tuned in the panel and chose (17 October 2026), made harder (19 October). */
export const LOOK: Look = {
  pixel: 3, far: 1.8, creases: 0.3, outlines: 0.89,
  sunStrength: 2.4, sunColour: '#fff1d6', sunRound: -50, sunHigh: 55,
  skyStrength: 1.6, skyColour: '#cfd8dc', groundColour: '#8a7a50', shadows: true,
  steps: 3, darkest: 0.45,
  brightness: 0, contrast: 1, saturation: 1, gamma: 1,
  shadeColour: '#2a3a6a', shade: 0, lightColour: '#ffd9a0', light: 0,
  crush: 0, murkColour: '#6b6448', murk: 0, grime: 0, grimeColour: '#3a2c1e',
  reds: 0, clouds: 0, cloudSize: 900, cloudSpeed: 14, haze: 0, hazeColour: '#8e8f86', bloom: 0, bloomFrom: 0.92,
  levels: 0, dither: 0,
  grain: 0, grainMoves: true, vignette: 0, aberration: 0.9, bulge: 0, scanlines: 0.05,
  trail: true,
  impactFrom: 2, impactTo: 14, impactBand: 0.14, impactLife: 0.24, impactColour: '#ff2a1a',
  impactGlowColour: '#ff5a30', impactGlow: 0.45, impactGlowWider: 1.15, impactGlowBand: 0.5,
  impactFacesStriker: true,
  // The 2D game's dash is 0.5 s and 96: under two metres, and a whole roll in it turned on the spot.
  // Mixamo's roll lasts 1.8 s and goes 4.5 m. A little quicker than that, chosen by the user: the
  // dive, tied to how far he has come, quickens most, and the roll and getting up a little.
  rollTime: 1.1, rollDistance: 200,
  // Half as fast again as in the 2D game, chosen by the user.
  speed: 126,
  ...HARSH,
};

/** A colour as it is written, for the finishing pass, which works on the screen's colours (Three keeps its own linear). */
const written = (colour: string) => new THREE.Color().setStyle(colour, THREE.LinearSRGBColorSpace);

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
      crush: { value: 0 }, murkColour: { value: new THREE.Color() }, murk: { value: 0 },
      grime: { value: 0 }, grimeColour: { value: new THREE.Color() }, offset: { value: new THREE.Vector2() },
      reds: { value: 0 }, clouds: { value: 0 }, cloudSize: { value: 900 }, cloudSpeed: { value: 14 },
      haze: { value: 0 }, hazeColour: { value: new THREE.Color() }, far: { value: 1.8 },
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
      uniform float crush, murk, grime, reds, clouds, cloudSize, cloudSpeed, haze, far;
      uniform vec3 murkColour, grimeColour, hazeColour;
      // Where the camera stands, in the world's pixels: the grime is held to the world by it.
      uniform vec2 offset;
      varying vec2 vUv;

      float bayer(vec2 p) {
        // A 4x4 ordered dither, from 0 to 1.
        int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
        int i = x + y * 4;
        float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
        return (m[i] + 0.5) / 16.0;
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float billows(vec2 p) {
        float sum = 0.0, strength = 0.5;
        for (int o = 0; o < 4; o++) { sum += noise(p) * strength; p *= 2.03; strength *= 0.5; }
        return sum / 0.9375;
      }

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
        // How red it is before anything is done to it: red well above green and blue.
        vec3 was = col;
        float redness = smoothstep(0.08, 0.3, was.r - max(was.g, was.b)) * smoothstep(0.12, 0.3, was.r);
        vec2 world = block + offset;

        col = (col - 0.5) * contrast + 0.5 + brightness;
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(luma), col, saturation);
        col = pow(max(col, 0.0), vec3(1.0 / gamma));
        luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, col * shadeColour * 2.0, shade * (1.0 - luma));
        col = mix(col, col * lightColour * 1.4, light * luma);
        // Sadder: every colour drawn toward one dull one, by its own lightness.
        luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, murkColour * (luma * 1.9), murk);
        // Harder: the darks pushed down into black.
        col = mix(col, col * smoothstep(0.0, 0.28, col), crush);
        // Dirtier: blotches and specks of grime, held to the world (the camera's place moves them with it).
        float blotch = smoothstep(0.48, 0.82, billows(world * 0.022)) * 0.75 + smoothstep(0.55, 0.9, billows(world * 0.09 + 17.0)) * 0.35;
        float specks = step(0.986, hash(world)) * 0.5;
        col = mix(col, col * grimeColour * 2.2, clamp(blotch + specks, 0.0, 1.0) * grime);
        // The shadows of clouds drifting over, a little cold, held to the world as it moves.
        vec2 sky = world * far / cloudSize + vec2(time, time * 0.4) * cloudSpeed / cloudSize;
        float shadow = smoothstep(0.42, 0.7, billows(sky)) * clouds;
        col *= mix(vec3(1.0), vec3(0.8, 0.84, 0.92), shadow / max(clouds, 0.001)) * (1.0 - shadow * 0.55);
        // The reds keep their colour, lifted a little, at the lightness the rest has come to.
        float lightness = dot(col, vec3(0.299, 0.587, 0.114)), wasLight = max(dot(was, vec3(0.299, 0.587, 0.114)), 0.001);
        col = mix(col, clamp(was * (lightness / wasLight) * vec3(1.18, 0.95, 0.95), 0.0, 1.0), redness * reds);
        // The faintest haze, thicker further off (up the picture).
        col = mix(col, hazeColour, haze * smoothstep(0.2, 1.0, uv.y));

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

/** Sets the finishing pass's numbers from a look, and where the camera stands (in the world's pixels, across and up). */
export function finish(pass: ShaderPass, look: Look, width: number, height: number, time: number, at = new THREE.Vector2()): void {
  const u = pass.uniforms;
  u.resolution.value.set(width, height);
  u.pixel.value = look.pixel;
  u.time.value = time;
  for (const key of ['brightness', 'contrast', 'saturation', 'gamma', 'shade', 'light', 'crush', 'murk', 'grime', 'reds', 'clouds', 'cloudSize', 'cloudSpeed', 'haze', 'far', 'levels', 'dither', 'grain', 'vignette', 'aberration', 'bulge', 'scanlines'] as const) {
    u[key].value = look[key];
  }
  u.grainMoves.value = look.grainMoves ? 1 : 0;
  u.shadeColour.value.copy(written(look.shadeColour));
  u.lightColour.value.copy(written(look.lightColour));
  u.murkColour.value.copy(written(look.murkColour));
  u.grimeColour.value.copy(written(look.grimeColour));
  u.hazeColour.value.copy(written(look.hazeColour));
  u.offset.value.copy(at);
}

/** The way to the sun, from its place round the camera and its height. */
export function sunWay(look: Look): THREE.Vector3 {
  const round = THREE.MathUtils.degToRad(look.sunRound), high = THREE.MathUtils.degToRad(look.sunHigh);
  // Round from straight ahead of the camera (it looks north, -Z): 0 is behind the camera, south.
  return new THREE.Vector3(Math.sin(round) * Math.cos(high), Math.sin(high), Math.cos(round) * Math.cos(high));
}
