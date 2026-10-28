"use strict";
/* Fundo 3D leve: um shader WebGL2 (seda + esferas de vidro), sem Three.js. */
globalThis.Bg3d = (() => {
  const canvas = document.getElementById("bg3d");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let gl = null, prog = null, uTime = null, uRes = null, uPtr = null;
  let raf = 0, alive = false, message = "";
  let tier = "high", scaleMul = 1, slow = 0, dropped = false;
  let startAt = 0, last = 0, acc = 999;
  let px = 0, py = 0, tx = 0, ty = 0;

  const FPS = 30;
  const SCALE = { low: 0.4, mid: 0.5, high: 0.58 };
  const CAP = { low: 640, mid: 800, high: 960 };
  let quiet = false, hold = false;

  function lowEnd() {
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const save = navigator.connection && navigator.connection.saveData;
    if (save) return true;
    if (mem && mem <= 2) return true;
    if (cores && cores <= 2) return true;
    return false;
  }
  function detectTier() {
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    if (mem <= 4 || cores <= 4) return "mid";
    return "high";
  }

  function publish() {
    document.querySelectorAll(".bg-msg").forEach(n => {
      n.textContent = message;
      n.hidden = !message;
    });
  }

  function fallback(text) {
    stopLoop();
    message = text;
    if (canvas) canvas.classList.add("off");
    document.body.classList.remove("webgl-ok");
    document.body.classList.add("webgl-fallback");
    document.documentElement.classList.remove("want-3d");
    publish();
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initGL() {
    if (prog) return true;
    if (!canvas) return false;
    try {
      gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) { gl = null; }
    if (!gl) return false;
    const vs = `#version 300 es
      layout(location=0) in vec2 a;
      void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
    const fs = `#version 300 es
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_ptr;
      out vec4 fragColor;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.6;
        for (int i = 0; i < 2; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
      }
      vec4 orb(vec2 uv, vec2 c, float r, vec3 color){
        vec2 d = uv - c;
        float dist = length(d);
        float glow = exp(-pow(dist / r, 2.0)) * 0.34;
        if (dist >= r) return vec4(color, glow * 0.42);
        float z = sqrt(max(r*r - dist*dist, 0.0));
        vec3 n = normalize(vec3(d, z));
        vec3 light = normalize(vec3(-0.38 + u_ptr.x * 0.25, 0.62, 0.72));
        float diff = clamp(dot(n, light), 0.0, 1.0);
        float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.7);
        float spec = pow(clamp(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 48.0);
        float edge = smoothstep(r, r * 0.88, dist);
        vec3 glass = color * (0.16 + diff * 1.05) + vec3(0.78, 0.9, 0.84) * fres * 0.62 + spec * vec3(1.0, 0.97, 0.9);
        return vec4(glass, max(edge, glow));
      }
      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
        uv += u_ptr * 0.055;
        float t = u_time * 0.055;
        float n = fbm(uv * 1.25 + vec2(t, -t * 0.55));
        float n2 = n;
        vec3 col = mix(vec3(0.02, 0.025, 0.034), vec3(0.035, 0.09, 0.075), smoothstep(0.25, 0.8, n2));
        col = mix(col, vec3(0.09, 0.38, 0.3), smoothstep(0.48, 0.92, n) * 0.5);
        col = mix(col, vec3(0.55, 0.4, 0.2), smoothstep(0.66, 0.98, n2) * 0.22);
        float wave = sin(uv.x * 2.6 + n * 3.2 + t * 1.6);
        float filament = exp(-pow(uv.y * 1.25 - wave * 0.1, 2.0) * 22.0);
        col += vec3(0.86, 0.7, 0.4) * filament * 0.045;
        vec2 c1 = vec2(-0.58, 0.38) + vec2(sin(t * 0.72), cos(t * 0.48)) * 0.07;
        vec2 c2 = vec2(0.66, -0.52) + vec2(cos(t * 0.42), sin(t * 0.58)) * 0.06;
        vec2 c3 = vec2(0.12, 0.78) + vec2(sin(t * 0.9 + 2.0), cos(t * 0.77)) * 0.045;
        vec4 o1 = orb(uv, c1, 0.46, vec3(0.16, 0.62, 0.46));
        vec4 o2 = orb(uv, c2, 0.34, vec3(0.78, 0.58, 0.28));
        vec4 o3 = orb(uv, c3, 0.16, vec3(0.7, 0.84, 0.76));
        col = mix(col, o1.rgb, clamp(o1.a, 0.0, 1.0));
        col = mix(col, o2.rgb, clamp(o2.a, 0.0, 1.0));
        col = mix(col, o3.rgb, clamp(o3.a, 0.0, 1.0));
        float vig = smoothstep(1.28, 0.22, length(uv));
        col *= mix(0.42, 1.0, vig);
        col += (hash(gl_FragCoord.xy) - 0.5) * 0.028;
        fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`;
    const a = compile(gl.VERTEX_SHADER, vs);
    const b = compile(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) { gl = null; return false; }
    prog = gl.createProgram();
    gl.attachShader(prog, a);
    gl.attachShader(prog, b);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog));
      prog = null;
      gl = null;
      return false;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    uTime = gl.getUniformLocation(prog, "u_time");
    uRes = gl.getUniformLocation(prog, "u_res");
    uPtr = gl.getUniformLocation(prog, "u_ptr");
    canvas.addEventListener("webglcontextlost", ev => {
      ev.preventDefault();
      prog = null;
      gl = null;
      fallback("WebGL não está disponível neste aparelho. Mantive o fundo leve.");
    });
    tier = detectTier();
    return true;
  }

  function resize() {
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * SCALE[tier] * scaleMul;
    let w = Math.max(2, Math.round(Math.max(1, window.innerWidth) * dpr));
    let h = Math.max(2, Math.round(Math.max(1, window.innerHeight) * dpr));
    const cap = CAP[tier];
    const m = Math.max(w, h);
    if (m > cap) { const k = cap / m; w = Math.max(2, Math.round(w * k)); h = Math.max(2, Math.round(h * k)); }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(timeSec) {
    if (!prog) return;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    gl.useProgram(prog);
    gl.uniform1f(uTime, timeSec);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uPtr, px, py);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function degrade() {
    if (!dropped) {
      dropped = true;
      scaleMul = 0.62;
      slow = 0;
      resize();
      return;
    }
    fallback("O fundo 3D pesou neste aparelho e voltou para o visual leve.");
  }

  let lastDraw = 0;
  function schedule() { raf = requestAnimationFrame(tick); }
  function tick(now) {
    if (!alive || quiet || hold) return;
    const dt = now - last;
    last = now;
    if (now - startAt > 1200 && dt > 48) slow++;
    else if (dt > 0 && dt < 40) slow = Math.max(0, slow - 1);
    if (slow > 18) degrade();
    if (!alive || quiet || hold) return;
    if (now - lastDraw >= 1000 / FPS) { lastDraw = now; draw(now / 1000); }
    raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    alive = false;
    cancelAnimationFrame(raf);
  }

  function setQuiet(on) {
    quiet = !!on;
    if (quiet) { cancelAnimationFrame(raf); return; }
    if (!alive || reduced() || document.hidden || hold) return;
    last = performance.now();
    slow = 0;
    schedule();
  }
  function start() {
    stopLoop();
    message = "";
    if (!canvas) return;
    if (lowEnd()) {
      fallback("Aparelho leve: o fundo ficou estático para não travar.");
      return;
    }
    if (!initGL()) {
      fallback("WebGL não está disponível neste aparelho. Mantive o fundo leve.");
      return;
    }
    document.body.classList.remove("webgl-fallback");
    document.body.classList.add("webgl-ok");
    canvas.classList.remove("off");
    resize();
    if (reduced()) {
      message = "Movimento reduzido: o fundo 3D fica numa imagem parada.";
      draw(18);
      publish();
      return;
    }
    publish();
    alive = true;
    startAt = performance.now();
    last = startAt;
    acc = 999;
    slow = 0;
    if (!quiet && !hold && !document.hidden) schedule();
  }

  function stop() {
    stopLoop();
    message = "";
    if (canvas) canvas.classList.add("off");
    document.body.classList.remove("webgl-ok", "webgl-fallback");
    publish();
  }

  addEventListener("pointermove", e => {
    tx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
    ty = (e.clientY / Math.max(1, innerHeight)) * 2 - 1;
  }, { passive: true });
  addEventListener("resize", () => { if (prog && canvas && !canvas.classList.contains("off")) resize(); });
  let quietTimer = 0;
  function bumpQuiet() {
    document.body.classList.add("is-quiet");
    setQuiet(true);
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      if (document.hidden) return;
      document.body.classList.remove("is-quiet");
      setQuiet(false);
    }, 180);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.body.classList.add("is-quiet");
      hold = true;
      setQuiet(true);
      return;
    }
    hold = false;
    document.body.classList.remove("is-quiet");
    setQuiet(false);
  });
  addEventListener("scroll", bumpQuiet, { passive: true, capture: true });
  addEventListener("pointerdown", bumpQuiet, { passive: true });
  addEventListener("touchstart", bumpQuiet, { passive: true });
  document.addEventListener("input", bumpQuiet, true);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    if (document.body.classList.contains("mode-3d")) start();
  });

  return {
    start,
    stop,
    setQuiet,
    lowEnd,
    get message() { return message; }
  };
})();
