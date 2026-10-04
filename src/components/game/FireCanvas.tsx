import { useEffect, useRef } from 'react';

/**
 * Burning frame for the player at the oche — ported from nice-to-be-nice
 * (`src/components/FireCanvas.tsx`, its "on fire" opener card).
 *
 * WebGL fragment shader: 5-octave value-noise FBM with two-stage domain
 * warping (licking, curling tongues), an upward time scroll, a blackbody ramp
 * deep red → orange → amber → white-hot, a heat aura and a spark layer.
 * Falls back to a 2D-canvas particle system without WebGL or after a context
 * loss. Never starts under prefers-reduced-motion; pauses while the tab is
 * hidden; DPR capped at 1.5 (WebGL) / 1.75 (2D).
 *
 * Only the active player's card mounts it, so one context exists at a time;
 * it is released explicitly on unmount (a new turn mounts a new one, and
 * browsers cap live WebGL contexts at ~16).
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

vec3 fireColor(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.35, 0.01, 0.0), vec3(0.89, 0.23, 0.0), smoothstep(0.0, 0.38, t));
  c = mix(c, vec3(1.0, 0.53, 0.06), smoothstep(0.34, 0.68, t));
  c = mix(c, vec3(1.0, 0.85, 0.35), smoothstep(0.62, 0.9, t));
  c = mix(c, vec3(1.0, 0.98, 0.88), smoothstep(0.88, 1.04, t));
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float time = uTime;

  float flicker = 0.85 + 0.3 * fbm(vec2(time * 1.7, time * 0.9));

  vec2 q = vec2(
    fbm(p * 3.0 + vec2(0.0, -time * 1.4)),
    fbm(p * 3.0 + vec2(5.2, -time * 1.9))
  );
  vec2 r = vec2(
    fbm(p * 3.0 + 3.0 * q + vec2(1.7, 9.2) - vec2(0.0, time * 2.4)),
    fbm(p * 3.0 + 3.0 * q + vec2(8.3, 2.8) - vec2(0.0, time * 1.6))
  );
  float f = fbm(p * 3.5 + 2.5 * r + vec2(0.0, -time * 2.6));

  float hmod = fbm(vec2(p.x * 4.0, time * 2.2)) * 0.5;
  float height = (uv.y + 0.06) * (1.25 + hmod);
  float body = f * 1.75 - height * 1.5;

  float edge = smoothstep(0.0, 0.13, uv.x) * smoothstep(1.0, 0.87, uv.x);

  float texture_keep = 0.55 + 0.65 * f;
  float intensity = clamp(body, 0.0, 1.0) * texture_keep * edge * flicker * 1.18;

  float core = smoothstep(0.68, 1.1, body) * smoothstep(0.42, 0.05, uv.y);
  intensity += core * 0.3;

  float aura = smoothstep(-0.55, 0.05, body) * (1.0 - smoothstep(0.0, 0.35, body));
  aura *= smoothstep(0.9, 0.3, uv.y) * edge * 0.10 * flicker;

  vec2 sp = vec2(p.x * 30.0, p.y * 20.0 - time * 8.5);
  sp.x += fbm(vec2(p.y * 3.0 - time, time * 0.5)) * 1.6;
  float sparkN = vnoise(floor(sp));
  float spark = step(0.986, sparkN);
  vec2 cell = (fract(sp) - 0.5) * vec2(1.0, 0.55);
  float sparkShape = smoothstep(0.17, 0.02, length(cell));
  float sparkA = spark * sparkShape * smoothstep(1.0, 0.25, uv.y) * smoothstep(0.02, 0.2, uv.y);
  sparkA *= 0.55 + 0.45 * vnoise(floor(sp) + floor(time * 9.0));

  float t = clamp(intensity, 0.0, 1.0);
  vec3 col = fireColor(t);
  col += vec3(0.9, 0.28, 0.02) * aura;
  col += vec3(1.0, 0.75, 0.35) * sparkA * 0.9;

  float alpha = smoothstep(0.02, 0.55, intensity) * 0.92 + aura;
  alpha = max(alpha, sparkA * 0.85);
  alpha = min(alpha, 1.0);

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/** WebGL-Pfad. Gibt null zurück wenn WebGL/Shader nicht verfügbar. */
function startWebGLFire(canvas: HTMLCanvasElement, onContextLost: () => void): (() => void) | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch {
    return null;
  }
  if (!gl) return null;

  function compile(g: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const s = g.createShader(type);
    if (!s) return null;
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      g.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let raf = 0;
  let running = true;
  let disposed = false;
  // eigene Uhr: läuft nur während sichtbar → kein Zeitsprung nach Tab-Wechsel
  let t = Math.random() * 100; // zufälliger Start → jede Card brennt anders
  let last = performance.now();

  function frame(now: number) {
    if (!running || disposed) return;
    t += Math.min((now - last) / 1000, 0.05);
    last = now;
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, t);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function onVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running && !disposed) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  function handleContextLost(e: Event) {
    e.preventDefault();
    cleanup();
    onContextLost();
  }
  canvas.addEventListener('webglcontextlost', handleContextLost);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
  }
  return cleanup;
}

/* ── 2D-Partikel-Fallback (v127/v128-Stand, unverändert) ─────────────── */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; decay: number; size: number;
  ei: number; wobblePhase: number; wobbleFreq: number; wobbleAmp: number;
  ember: boolean;
}
interface Emitter {
  baseX: number; x: number; phase: number; freq: number; swayAmp: number; heat: number;
}

function makeSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const cx = c.getContext('2d')!;
  const grad = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.42)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, s, s);
  return c;
}

const EMITTER_COUNT = 4;

function start2DFire(canvas: HTMLCanvasElement): (() => void) | null {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let w = 0, h = 0;

  const emitters: Emitter[] = Array.from({ length: EMITTER_COUNT }, () => ({
    baseX: 0, x: 0,
    phase: Math.random() * Math.PI * 2,
    freq: 0.0004 + Math.random() * 0.0006,
    swayAmp: 0,
    heat: 0.65 + Math.random() * 0.45,
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    emitters.forEach((e, i) => {
      e.baseX = w * (0.12 + (0.76 * (i + 0.5)) / EMITTER_COUNT);
      e.swayAmp = w * 0.05;
    });
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const sprFlame = [
    makeSprite(255, 252, 238),
    makeSprite(255, 234, 120),
    makeSprite(251, 228, 22),
    makeSprite(254, 130, 0),
    makeSprite(226, 59, 0),
  ];
  const sprEmber = makeSprite(255, 176, 40);

  const particles: Particle[] = [];

  function pickEmitter(): number {
    const total = emitters.reduce((s, e) => s + e.heat, 0);
    let r = Math.random() * total;
    for (let i = 0; i < emitters.length; i++) {
      r -= emitters[i].heat;
      if (r <= 0) return i;
    }
    return 0;
  }
  function gauss(): number {
    return (Math.random() + Math.random() - 1);
  }
  function spawn(ember: boolean) {
    const ei = pickEmitter();
    const ex = emitters[ei].x;
    if (ember) {
      particles.push({
        x: ex + gauss() * 14, y: h - 3,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(1.9 + Math.random() * 1.6),
        life: 0,
        decay: 0.0055 + Math.random() * 0.0045,
        size: 1.6 + Math.random() * 2.2,
        ei,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 0.05 + Math.random() * 0.06,
        wobbleAmp: 0.6 + Math.random() * 1.1,
        ember: true,
      });
    } else {
      particles.push({
        x: ex + gauss() * 20, y: h - 2,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -(0.9 + Math.random() * 1.2),
        life: 0,
        decay: 0.016 + Math.random() * 0.014,
        size: 11 + Math.random() * 16,
        ei,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 0.055 + Math.random() * 0.07,
        wobbleAmp: 0.7 + Math.random() * 1.3,
        ember: false,
      });
    }
  }

  let raf = 0;
  let last = performance.now();
  let spawnAcc = 0;
  let emberAcc = 0;
  let running = true;
  let flickerPhase = 0;

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;

    for (const e of emitters) {
      e.x = e.baseX + Math.sin(now * e.freq + e.phase) * e.swayAmp;
    }

    flickerPhase += dt * 0.13;
    const intensity = 0.82 + Math.sin(flickerPhase) * 0.10
      + Math.sin(flickerPhase * 2.7) * 0.06;

    spawnAcc += dt * 6 * intensity;
    while (spawnAcc >= 1) { spawnAcc -= 1; spawn(false); }
    emberAcc += dt * 0.7;
    while (emberAcc >= 1) { emberAcc -= 1; spawn(true); }

    ctx!.clearRect(0, 0, w, h);
    ctx!.globalCompositeOperation = 'lighter';

    const bedR = w * 0.55;
    const bed = ctx!.createRadialGradient(w / 2, h, 0, w / 2, h, bedR);
    const bedA = 0.16 * intensity;
    bed.addColorStop(0, `rgba(255,150,30,${bedA})`);
    bed.addColorStop(0.5, `rgba(226,59,0,${bedA * 0.5})`);
    bed.addColorStop(1, 'rgba(0,0,0,0)');
    ctx!.fillStyle = bed;
    ctx!.fillRect(0, h - bedR, w, bedR);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += p.decay * dt;
      if (p.life >= 1) { particles.splice(i, 1); continue; }
      const t = p.life;

      p.vy -= 0.02 * dt;
      const wob = Math.sin(p.life * 60 * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp;
      const pull = (emitters[p.ei].x - p.x) * (0.003 + t * 0.006);
      p.x += (p.vx + wob + pull) * dt;
      p.y += p.vy * dt;

      if (p.ember) {
        ctx!.globalAlpha = Math.sin(t * Math.PI) * 0.9 * intensity;
        const sz = p.size;
        ctx!.drawImage(sprEmber, p.x - sz, p.y - sz, sz * 2, sz * 2);
      } else {
        const grow = t < 0.22 ? t / 0.22 : 1;
        const shrink = 1 - Math.max(0, (t - 0.22) / 0.78) * 0.82;
        const sz = p.size * grow * shrink;
        const a = Math.min(1, t * 7) * Math.pow(1 - t, 1.35) * 0.52 * intensity;
        ctx!.globalAlpha = a;
        const spr = t < 0.14 ? sprFlame[0]
          : t < 0.32 ? sprFlame[1]
          : t < 0.52 ? sprFlame[2]
          : t < 0.74 ? sprFlame[3]
          : sprFlame[4];
        ctx!.drawImage(spr, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
    }
    ctx!.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function onVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

function FireCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // jsdom (unit tests) has no canvas backend.
    if (/jsdom/i.test(navigator.userAgent)) return;

    let cleanup: (() => void) | null = null;
    let sibling: HTMLCanvasElement | null = null;
    // WebGL-Shader zuerst; bei Context-Loss oder fehlendem WebGL → 2D-Partikel.
    // Nach webglcontextlost liefert derselbe <canvas> keinen 2D-Context mehr —
    // der Fallback rendert dann auf ein Geschwister-Canvas (Reacts eigener
    // Knoten bleibt unangetastet, sonst crasht removeChild beim Unmount).
    cleanup = startWebGLFire(canvas, () => {
      sibling = document.createElement('canvas');
      sibling.className = canvas.className;
      sibling.setAttribute('aria-hidden', 'true');
      canvas.style.display = 'none';
      canvas.parentNode?.insertBefore(sibling, canvas.nextSibling);
      cleanup = start2DFire(sibling);
    });
    if (!cleanup) cleanup = start2DFire(canvas);

    return () => {
      cleanup?.();
      sibling?.remove();
      // getContext('webgl') returns the existing context only if WebGL was used.
      (canvas.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="sotd-fire-canvas" aria-hidden="true" />;
}

export default FireCanvas;
