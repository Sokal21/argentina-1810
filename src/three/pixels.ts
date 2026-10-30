import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// The pixel pass: the world drawn at its own few pixels, with lines along its outlines (where the
// depth jumps) and its creases (where the normal turns). Three's RenderPixelatedPass drew the whole
// scene twice for it, once for its colours and once again for its normals; here every material
// writes its normal beside its colour in the one drawing (a second colour attachment, see
// `writeNormals`), and the scene is drawn once. The lines are found as Three finds them, except
// that only lit surfaces have creases: what has no normal of its own (a sprite, a line, a glow)
// writes none, and no crease is drawn against it.

/**
 * Makes every material write its normal, in view space and packed 0 to 1, as a second output
 * beside its colour, with 1 in the alpha; or, if it has no normal (unlit things: sprites, lines,
 * points, shadows, plain colours), nothing, with 0 in the alpha. Done once, before any material is
 * compiled: Three's shader chunks and libraries are patched where every one of them passes.
 * Where the picture is drawn into has no second attachment (the screen, a shadow map), the
 * output goes nowhere, as GLSL ES 3.0 says.
 */
function writeNormals(): void {
  const declare = 'layout(location = 1) out highp vec4 gNormal;\n';
  // The lit materials (toon, lambert, basic and the rest of that family): their shaders include
  // these chunks, the first at the top, the second last in main; and normal_fragment_begin, which
  // defines `normal`, only in those that are lit.
  THREE.ShaderChunk.dithering_pars_fragment = declare + THREE.ShaderChunk.dithering_pars_fragment;
  THREE.ShaderChunk.normal_fragment_begin = THREE.ShaderChunk.normal_fragment_begin + '\n#define PIXELS_LIT\n';
  THREE.ShaderChunk.dithering_fragment = THREE.ShaderChunk.dithering_fragment + `
#ifdef PIXELS_LIT
  gNormal = vec4(normalize(normal) * 0.5 + 0.5, 1.0);
#else
  gNormal = vec4(0.0);
#endif
`;
  // The unlit ones that do not pass through those chunks.
  for (const name of ['sprite', 'points', 'dashed', 'shadow'] as const) {
    const lib = THREE.ShaderLib[name];
    if (!lib || lib.fragmentShader.includes('gNormal')) continue;
    lib.fragmentShader = declare + unlit(lib.fragmentShader);
  }
}

/** A fragment shader of something unlit, made to write no normal (ShaderMaterials of the game's own pass through here too). */
export function unlit(fragmentShader: string): string {
  const write = '\n  gNormal = vec4(0.0);\n';
  const at = fragmentShader.indexOf('#include <colorspace_fragment>');
  if (at >= 0) return fragmentShader.slice(0, at) + write + fragmentShader.slice(at);
  const end = fragmentShader.lastIndexOf('}');
  return fragmentShader.slice(0, end) + write + fragmentShader.slice(end);
}

/** A ShaderMaterial of the game's own, unlit: its fragment shader declaring the normal output and writing none. */
export function unlitShader(fragmentShader: string): string {
  return 'layout(location = 1) out highp vec4 gNormal;\n' + unlit(fragmentShader);
}

/**
 * As `unlitShader`, for something that takes no outline: it writes pure red where a normal would go,
 * which no surface facing the camera can write (their blue is always large), even with smoke over it.
 */
export function unoutlinedShader(fragmentShader: string): string {
  const end = fragmentShader.lastIndexOf('}');
  return 'layout(location = 1) out highp vec4 gNormal;\n' + fragmentShader.slice(0, end) + '\n  gNormal = vec4(1.0, 0.0, 0.0, 0.0);\n' + fragmentShader.slice(end);
}

writeNormals();

export class PixelPass extends Pass {
  /** How strongly the creases (lighter) and the outlines (darker) are drawn. */
  normalEdgeStrength: number;
  depthEdgeStrength: number;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly quad: FullScreenQuad;
  private readonly material: THREE.ShaderMaterial;
  private readonly resolution = new THREE.Vector2();
  private pixelSize: number;

  constructor(pixelSize: number, private readonly scene: THREE.Scene, private readonly camera: THREE.Camera, options: { normalEdgeStrength?: number; depthEdgeStrength?: number } = {}) {
    super();
    this.pixelSize = pixelSize;
    this.normalEdgeStrength = options.normalEdgeStrength ?? 0.3;
    this.depthEdgeStrength = options.depthEdgeStrength ?? 0.4;
    // The colours and, beside them, the normals; and the depth, for the outlines.
    this.target = new THREE.WebGLRenderTarget(1, 1, { count: 2, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) });
    this.material = pixelated();
    this.quad = new FullScreenQuad(this.material);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }

  setSize(width: number, height: number): void {
    this.resolution.set(width, height);
    const x = (width / this.pixelSize) | 0, y = (height / this.pixelSize) | 0;
    this.target.setSize(x, y);
    (this.material.uniforms.resolution.value as THREE.Vector4).set(x, y, 1 / x, 1 / y);
  }

  setPixelSize(pixelSize: number): void {
    this.pixelSize = pixelSize;
    this.setSize(this.resolution.x, this.resolution.y);
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget): void {
    const u = this.material.uniforms;
    u.normalEdgeStrength.value = this.normalEdgeStrength;
    u.depthEdgeStrength.value = this.depthEdgeStrength;
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    u.tDiffuse.value = this.target.textures[0];
    u.tNormal.value = this.target.textures[1];
    u.tDepth.value = this.target.depthTexture;
    if (this.renderToScreen) renderer.setRenderTarget(null);
    else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.quad.render(renderer);
  }
}

/** The lines along outlines and creases, as Three's RenderPixelatedPass draws them; creases only between lit surfaces. */
function pixelated(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      tNormal: { value: null },
      resolution: { value: new THREE.Vector4() },
      normalEdgeStrength: { value: 0 },
      depthEdgeStrength: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform sampler2D tNormal;
      uniform vec4 resolution;
      uniform float normalEdgeStrength;
      uniform float depthEdgeStrength;
      varying vec2 vUv;

      float getDepth(int x, int y) {
        return texture2D(tDepth, vUv + vec2(x, y) * resolution.zw).r;
      }

      // The normal, and in its alpha whether there is one (0: unlit, no creases against it).
      vec4 getNormal(int x, int y) {
        vec4 n = texture2D(tNormal, vUv + vec2(x, y) * resolution.zw);
        return vec4(n.rgb * 2.0 - 1.0, n.a);
      }

      float depthEdgeIndicator(float depth) {
        float diff = 0.0;
        diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);
        diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);
        diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);
        diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);
        return floor(smoothstep(0.01, 0.02, diff) * 2.) / 2.;
      }

      float neighborNormalEdgeIndicator(int x, int y, float depth, vec4 normal) {
        float depthDiff = getDepth(x, y) - depth;
        vec4 neighborNormal = getNormal(x, y);
        // Edge pixels should yield to faces whose normals are closer to the bias normal.
        vec3 normalEdgeBias = vec3(1., 1., 1.);
        float normalDiff = dot(normal.xyz - neighborNormal.xyz, normalEdgeBias);
        float normalIndicator = clamp(smoothstep(-.01, .01, normalDiff), 0.0, 1.0);
        // Only the shallower pixel should detect the normal edge.
        float depthIndicator = clamp(sign(depthDiff * .25 + .0025), 0.0, 1.0);
        return (1.0 - dot(normal.xyz, neighborNormal.xyz)) * depthIndicator * normalIndicator * normal.a * neighborNormal.a;
      }

      float normalEdgeIndicator(float depth, vec4 normal) {
        float indicator = 0.0;
        indicator += neighborNormalEdgeIndicator(0, -1, depth, normal);
        indicator += neighborNormalEdgeIndicator(0, 1, depth, normal);
        indicator += neighborNormalEdgeIndicator(-1, 0, depth, normal);
        indicator += neighborNormalEdgeIndicator(1, 0, depth, normal);
        return step(0.1, indicator);
      }

      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        float depth = 0.0;
        vec4 normal = vec4(0.0);
        if (depthEdgeStrength > 0.0 || normalEdgeStrength > 0.0) {
          depth = getDepth(0, 0);
          normal = getNormal(0, 0);
        }
        float dei = 0.0;
        if (depthEdgeStrength > 0.0) dei = depthEdgeIndicator(depth);
        float nei = 0.0;
        if (normalEdgeStrength > 0.0) nei = normalEdgeIndicator(depth, normal);
        float strength = dei > 0.0 ? (1.0 - depthEdgeStrength * dei) : (1.0 + normalEdgeStrength * nei);
        // What takes no outline (see unoutlinedShader).
        vec4 written = texture2D(tNormal, vUv);
        if (written.b * 4.0 < written.r) strength = 1.0;
        gl_FragColor = texel * strength;
      }
    `,
  });
}
