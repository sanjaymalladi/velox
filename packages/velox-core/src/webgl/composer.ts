/**
 * WebGL post-processing composer for the Velox Studio preview/export.
 *
 * Strategy: the existing Canvas2D engine (`drawFrame`) renders a frame to an
 * offscreen 2D canvas, which we upload as a texture and run through a single
 * fragment-shader pass that applies premium GPU effects (bloom, chromatic
 * aberration, vignette, film grain, paper/crumble displacement, exposure).
 *
 * This keeps the battle-tested 2D draw path intact while giving a cinematic,
 * GPU-accelerated look — and runs entirely in the browser with zero native
 * dependencies (WebGL1, widely supported, serverless-safe).
 */

export interface FxSettings {
  /** Soft glow on bright areas, 0..1 */
  bloom: number
  /** RGB channel split, 0..1 */
  chromatic: number
  /** Edge darkening, 0..1 */
  vignette: number
  /** Film grain amount, 0..1 */
  grain: number
  /** Paper crumple UV displacement, 0..1 */
  paper: number
  /** Brightness multiplier, default 1 */
  exposure: number
}

export const DEFAULT_FX: FxSettings = {
  bloom: 0.35,
  chromatic: 0.25,
  vignette: 0.35,
  grain: 0.15,
  paper: 0,
  exposure: 1.02,
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uBloom;
uniform float uChromatic;
uniform float uVignette;
uniform float uGrain;
uniform float uPaper;
uniform float uExposure;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 sampleCA(vec2 uv, float amt){
  vec2 d = uv - 0.5;
  float r = texture2D(uSrc, uv - d*amt).r;
  float g = texture2D(uSrc, uv).g;
  float b = texture2D(uSrc, uv + d*amt).b;
  return vec3(r, g, b);
}
void main(){
  vec2 uv = vUv;
  if (uPaper > 0.0) {
    vec2 disp = vec2(vnoise(uv*6.0+1.3), vnoise(uv*6.0+7.1)) - 0.5;
    float n = vnoise(uv*9.0)*0.6 + vnoise(uv*23.0)*0.4;
    uv += disp * uPaper * 0.02 * (0.5 + n);
  }
  vec3 col = sampleCA(uv, uChromatic * 0.02);
  if (uBloom > 0.0) {
    vec3 acc = vec3(0.0); float w = 0.0;
    for (int i=-2;i<=2;i++) for (int j=-2;j<=2;j++) {
      vec2 o = vec2(float(i), float(j)) / uRes * 4.0;
      vec3 s = texture2D(uSrc, uv+o).rgb;
      float l = max(0.0, max(s.r, max(s.g, s.b)) - 0.6);
      acc += s * l; w += 1.0;
    }
    col += (acc / w) * uBloom * 1.6;
  }
  col *= uExposure;
  if (uVignette > 0.0) {
    float d = distance(vUv, vec2(0.5));
    col *= 1.0 - uVignette * smoothstep(0.4, 0.85, d);
  }
  if (uGrain > 0.0) {
    float g = hash(vUv * uRes + uTime * 60.0) - 0.5;
    col += g * uGrain * 0.12;
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('Velox WebGL shader compile failed: ' + log)
  }
  return sh
}

export class WebGLComposer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private tex: WebGLTexture
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  readonly ok: boolean

  constructor(canvas: HTMLCanvasElement) {
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) {
      this.ok = false
      // @ts-expect-error minimal stub to satisfy types before disposal
      this.gl = null
      this.program = null as unknown as WebGLProgram
      this.tex = null as unknown as WebGLTexture
      return
    }
    this.gl = gl
    this.ok = true

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Velox WebGL link failed: ' + gl.getProgramInfoLog(program))
    }
    this.program = program

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    this.tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

    for (const name of [
      'uSrc', 'uRes', 'uBloom', 'uChromatic', 'uVignette', 'uGrain', 'uPaper', 'uExposure', 'uTime',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name)
    }
    gl.useProgram(program)
    gl.uniform1i(this.uniforms.uSrc, 0)
  }

  setSize(w: number, h: number): void {
    if (this.ok) this.gl.viewport(0, 0, w, h)
  }

  draw(source: TexImageSource, fx: FxSettings, timeSec: number): void {
    if (!this.ok) return
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.useProgram(this.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform2f(this.uniforms.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.uniform1f(this.uniforms.uBloom, fx.bloom)
    gl.uniform1f(this.uniforms.uChromatic, fx.chromatic)
    gl.uniform1f(this.uniforms.uVignette, fx.vignette)
    gl.uniform1f(this.uniforms.uGrain, fx.grain)
    gl.uniform1f(this.uniforms.uPaper, fx.paper)
    gl.uniform1f(this.uniforms.uExposure, fx.exposure)
    gl.uniform1f(this.uniforms.uTime, timeSec)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose(): void {
    if (!this.ok) return
    const gl = this.gl
    gl.deleteTexture(this.tex)
    gl.deleteProgram(this.program)
  }
}
