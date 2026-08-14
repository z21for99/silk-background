// silk-background — dsh client plugin, BROWSER half (official module-loader
// bundle). v4: OFFICIAL THEME-TOKEN OVERRIDES (ThemeService.overrideTokens).
//
// The dsh layout paints every surface through CSS variables
// (--dsw-alias-bg-base, --dsw-alias-bg-layer-1/2, --dsw-specific-sidebar-fill),
// and the theme presenter syncs them onto document.body. v3 overrode those
// variables by hand (inline style + a 1s self-healing re-apply); v4 registers
// the same glass as a proper token layer through the theme service
// overrideTokens(source, { token: { light, dark } }), so the presenter keeps
// it applied on every theme re-sync — including light/dark switches, which
// now get dedicated light-glass values. The v3 inline-style path is retained
// as a fallback for the (unsupported) case where the theme service is
// missing. The WebGL silk canvas sits behind the page at z-index -1, exactly
// like the original working version.
//
// Modes (corner toggle, persisted in localStorage):
//   off   — nothing
//   dim   — readable glass over a subdued silk (default)
//   vivid — bright silk clearly visible through light glass

window.__ModuleLoader__.load({
  id: "silk-background",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // ── shaders (21st.dev Shader Builder "Silk", verbatim) ───────────────────
    const VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec2 q = p * 1.6;
  float amp = 0.25 + u_intensity * 0.85;
  for (float i = 1.0; i < 5.0; i += 1.0) {
    q.x += amp / i * cos(i * 2.4 * q.y + t * 0.8 + u_seed);
    q.y += amp / i * cos(i * 1.7 * q.x + t * 0.6);
  }
  return palette(0.5 + 0.5 * sin(q.x + q.y));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  if (u_cursorPresence > 0.001) {
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

    // ── presets ────────────────────────────────────────────────────────────────
    const BASE = {
      colors: [
        [0.043137254901960784, 0.06274509803921569, 0.14901960784313725],
        [0.23921568627450981, 0.27450980392156865, 0.9098039215686274],
        [0.6941176470588235, 0.5490196078431373, 1],
        [1, 0.8392156862745098, 0.9058823529411765],
        [1, 0.8392156862745098, 0.9058823529411765],
        [1, 0.8392156862745098, 0.9058823529411765],
        [1, 0.8392156862745098, 0.9058823529411765],
        [1, 0.8392156862745098, 0.9058823529411765],
      ],
      colorCount: 4,
      scale: 1.5,
      intensity: 0.55,
      paramA: 0.5,
      warp: 0,
      detail: 2.4,
      contrast: 1.005,
      brightness: 0,
      saturation: 1,
      hue: 0,
      vignette: 0,
      blur: 0,
      grain: 0.042,
      seed: 1,
      rotate: 0,
      offsetX: 0,
      offsetY: 0,
      drift: 0,
      cursorEnabled: true,
      cursorEffect: 2.0,
      cursorStrength: 1.0,
      cursorRadius: 0.202,
      oklab: 0,
      timeScale: 0.613,
    };

    const PRESETS = {
      dim: {
        ...BASE,
        intensity: 0.32,
        brightness: -0.03,
        saturation: 0.6,
        grain: 0.05,
        cursorEnabled: false,
        timeScale: 0.30,
      },
      vivid: {
        ...BASE,
        intensity: 0.7,
        brightness: 0.12,
        saturation: 1.15,
        grain: 0.035,
        timeScale: 0.38,
      },
    };

    // Colour palettes (more purple/black share by default now).
    const PALETTES = {
      purpleDark: [
        [0.016, 0.018, 0.045],
        [0.10, 0.055, 0.235],
        [0.345, 0.19, 0.62],
        [0.72, 0.50, 0.98],
        [1, 0.85, 0.95],
        [1, 0.85, 0.95],
        [1, 0.85, 0.95],
        [1, 0.85, 0.95],
      ],
      default: BASE.colors,
      original: BASE.colors,
      green: [
        [0.01, 0.035, 0.02],
        [0.02, 0.16, 0.10],
        [0.10, 0.55, 0.38],
        [0.45, 0.95, 0.75],
        [0.9, 1, 0.95],
        [0.9, 1, 0.95],
        [0.9, 1, 0.95],
        [0.9, 1, 0.95],
      ],
      blue: [
        [0.01, 0.02, 0.06],
        [0.03, 0.10, 0.30],
        [0.15, 0.35, 0.85],
        [0.55, 0.75, 1],
        [0.9, 0.96, 1],
        [0.9, 0.96, 1],
        [0.9, 0.96, 1],
        [0.9, 0.96, 1],
      ],
      cyan: [
        [0.01, 0.04, 0.05],
        [0.02, 0.25, 0.26],
        [0.10, 0.65, 0.70],
        [0.55, 0.95, 1],
        [0.9, 1, 1],
        [0.9, 1, 1],
        [0.9, 1, 1],
        [0.9, 1, 1],
      ],
      red: [
        [0.05, 0.01, 0.02],
        [0.28, 0.04, 0.08],
        [0.75, 0.12, 0.20],
        [1, 0.45, 0.5],
        [1, 0.85, 0.88],
        [1, 0.85, 0.88],
        [1, 0.85, 0.88],
        [1, 0.85, 0.88],
      ],
    };

    const PALETTE_NAMES = {
      purpleDark: "紫黑",
      default: "默认",
      original: "原版",
      green: "绿",
      blue: "蓝",
      cyan: "青",
      red: "红",
    };

    function hexToRgb(hex) {
      const n = parseInt(String(hex).slice(1), 16);
      if (Number.isNaN(n)) return null;
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    function rgbToHex(rgb) {
      const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
      return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
    }
    function activeColors() {
      if (USER.palette === "custom" && Array.isArray(USER.customColors) && USER.customColors.length === 8) {
        return USER.customColors;
      }
      return (PALETTES[USER.palette] || PALETTES.purpleDark);
    }

    // User-tunable parameters, persisted in localStorage.
    const PARAMS_KEY = "dsh.silk-params";
    let USER = { speed: null, palette: "purpleDark", intensity: null, customColors: null };
    try {
      const saved = JSON.parse(localStorage.getItem(PARAMS_KEY) || "{}");
      USER = { ...USER, ...(saved && typeof saved === "object" ? saved : {}) };
    } catch { /* ignore */ }

    function saveParams() {
      try { localStorage.setItem(PARAMS_KEY, JSON.stringify(USER)); } catch { /* ignore */ }
    }

    function composeUniforms(mode) {
      const u = { ...PRESETS[mode] };
      u.colors = activeColors();
      if (typeof USER.speed === "number") u.timeScale = USER.speed;
      if (typeof USER.intensity === "number") u.intensity = USER.intensity;
      return u;
    }

    // Theme-token overrides: the app paints surfaces through these tokens.
    // base → fully transparent (silk is the app background); layer-1/2 and the
    // sidebar fill → translucent glass; overlay (popovers) stays solid. The
    // official overrideTokens API requires a { light, dark } pair per token:
    // dark values carry the proven v3 look, light values glass the light
    // palette equivalently.
    const THEME_OVERRIDES = {
      dim: {
        "--dsw-alias-bg-base": { light: "transparent", dark: "transparent" },
        "--dsw-alias-bg-layer-1": { light: "rgba(252, 252, 255, 0.55)", dark: "rgba(17, 19, 24, 0.42)" },
        "--dsw-alias-bg-layer-2": { light: "rgba(252, 252, 255, 0.68)", dark: "rgba(17, 19, 24, 0.50)" },
        "--dsw-specific-sidebar-fill": { light: "rgba(252, 252, 255, 0.50)", dark: "rgba(17, 19, 24, 0.38)" },
      },
      vivid: {
        "--dsw-alias-bg-base": { light: "transparent", dark: "transparent" },
        "--dsw-alias-bg-layer-1": { light: "rgba(252, 252, 255, 0.38)", dark: "rgba(17, 19, 24, 0.28)" },
        "--dsw-alias-bg-layer-2": { light: "rgba(252, 252, 255, 0.52)", dark: "rgba(17, 19, 24, 0.34)" },
        "--dsw-specific-sidebar-fill": { light: "rgba(252, 252, 255, 0.32)", dark: "rgba(17, 19, 24, 0.22)" },
      },
    };
    // Manual inline-style fallback (v3 behaviour), used only when the theme
    // service is unavailable.
    const FALLBACK_OVERRIDES = {
      dim: {
        "--dsw-alias-bg-base": "transparent",
        "--dsw-alias-bg-layer-1": "rgba(17, 19, 24, 0.42)",
        "--dsw-alias-bg-layer-2": "rgba(17, 19, 24, 0.50)",
        "--dsw-specific-sidebar-fill": "rgba(17, 19, 24, 0.38)",
      },
      vivid: {
        "--dsw-alias-bg-base": "transparent",
        "--dsw-alias-bg-layer-1": "rgba(17, 19, 24, 0.28)",
        "--dsw-alias-bg-layer-2": "rgba(17, 19, 24, 0.34)",
        "--dsw-specific-sidebar-fill": "rgba(17, 19, 24, 0.22)",
      },
    };

    const SCM_ALPHA = { dim: 0.22, vivid: 0.06 };
    const MODES = ["off", "dim", "vivid"];
    const STORE_KEY = "dsh.silk-background";

    // ── WebGL engine (created once, never destroyed) ──────────────────────────
    function createEngine(canvas, uniforms) {
      const gl = canvas.getContext("webgl", { antialias: false });
      if (!gl) return null;

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const program = gl.createProgram();
      const vertexShader = compile(gl.VERTEX_SHADER, VERT);
      const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const uni = {
        colors: gl.getUniformLocation(program, "u_colors"),
        scene: gl.getUniformLocation(program, "u_scene"),
        shape: gl.getUniformLocation(program, "u_shape"),
        surface: gl.getUniformLocation(program, "u_surface"),
        finish: gl.getUniformLocation(program, "u_finish"),
        transform: gl.getUniformLocation(program, "u_transform"),
        space: gl.getUniformLocation(program, "u_space"),
        cursor: gl.getUniformLocation(program, "u_cursor"),
      };

      const applyUniforms = () => {
        gl.uniform3fv(uni.colors, new Float32Array(uniforms.colors.flat()));
        gl.uniform4f(uni.shape, uniforms.scale, uniforms.intensity, uniforms.paramA, uniforms.warp);
        gl.uniform4f(uni.surface, uniforms.detail, uniforms.contrast, uniforms.brightness, uniforms.saturation);
        gl.uniform4f(uni.finish, uniforms.hue, uniforms.vignette, uniforms.blur, uniforms.grain);
        gl.uniform4f(uni.transform, uniforms.seed, uniforms.rotate, uniforms.drift, uniforms.oklab);
        gl.uniform4f(uni.cursor, 0, uniforms.cursorEffect, uniforms.cursorStrength, uniforms.cursorRadius);
      };
      applyUniforms();

      let targetX = 0, targetY = 0, targetPresence = 0;
      let mouseX = 0, mouseY = 0, cursorPresence = 0;
      let pointerKnown = false, pointerClientX = 0, pointerClientY = 0;
      let bounds = canvas.getBoundingClientRect();
      let raf = 0, lastNow = null;
      let visible = document.visibilityState === "visible";
      let inView = true, disposed = false;
      const start = performance.now();
      let drawCount = 0;
      let lastDrawAt = 0;
      const timeAnimated = () => Math.abs(uniforms.timeScale) > 0.0001;

      const resizeCanvas = () => {
        bounds = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rawWidth = Math.max(1, Math.round(bounds.width * dpr));
        const rawHeight = Math.max(1, Math.round(bounds.height * dpr));
        const pixelScale = Math.min(1, Math.sqrt(2000000 / Math.max(1, rawWidth * rawHeight)));
        const width = Math.max(1, Math.round(rawWidth * pixelScale));
        const height = Math.max(1, Math.round(rawHeight * pixelScale));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };

      function requestRender() {
        if (!disposed && visible && inView && raf === 0) raf = requestAnimationFrame(render);
      }

      const updatePointerTarget = () => {
        if (!pointerKnown) return;
        if (bounds.width === 0 || bounds.height === 0) return;
        const inside =
          pointerClientX >= bounds.left && pointerClientX <= bounds.right &&
          pointerClientY >= bounds.top && pointerClientY <= bounds.bottom;
        if (!inside) { targetPresence = 0; requestRender(); return; }
        const nextX = ((pointerClientX - bounds.left) / bounds.width) * 2 - 1;
        const nextY = -(((pointerClientY - bounds.top) / bounds.height) * 2 - 1);
        if (targetPresence === 0 && cursorPresence < 0.01) { mouseX = nextX; mouseY = nextY; }
        targetX = nextX; targetY = nextY; targetPresence = 1;
        requestRender();
      };
      const onPointerMove = (event) => {
        pointerKnown = true;
        pointerClientX = event.clientX; pointerClientY = event.clientY;
        bounds = canvas.getBoundingClientRect();
        updatePointerTarget();
      };
      const onPointerLeave = () => { pointerKnown = false; targetPresence = 0; requestRender(); };
      const updateLayout = () => { bounds = canvas.getBoundingClientRect(); resizeCanvas(); updatePointerTarget(); requestRender(); };

      window.addEventListener("resize", updateLayout);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointercancel", onPointerLeave);
      window.addEventListener("scroll", updateLayout, true);
      window.addEventListener("blur", onPointerLeave);
      document.documentElement.addEventListener("pointerleave", onPointerLeave);

      const resizeObserver = new ResizeObserver(updateLayout);
      resizeObserver.observe(canvas);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        inView = entry?.isIntersecting ?? true;
        if (inView) requestRender();
        else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; lastNow = null; }
      });
      intersectionObserver.observe(canvas);
      const onVisibilityChange = () => {
        visible = document.visibilityState === "visible";
        if (visible) requestRender();
        else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; lastNow = null; }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      let lost = gl.isContextLost();
      const onLost = (e) => { lost = true; e.preventDefault(); };
      const onRestored = () => { lost = false; requestRender(); };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);

      const render = (now) => {
        raf = 0;
        if (disposed || !visible || !inView) return;
        const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.1);
        lastNow = now;
        const follow = 1 - Math.exp(-12 * dt);
        mouseX += (targetX - mouseX) * follow;
        mouseY += (targetY - mouseY) * follow;
        cursorPresence += (targetPresence - cursorPresence) * follow;
        resizeCanvas();
        gl.uniform4f(uni.scene, canvas.width, canvas.height, ((now - start) / 1000) * uniforms.timeScale, uniforms.colorCount);
        gl.uniform4f(uni.space, uniforms.offsetX, uniforms.offsetY, mouseX, mouseY);
        gl.uniform4f(uni.cursor, uniforms.cursorEnabled ? cursorPresence : 0, uniforms.cursorEffect, uniforms.cursorStrength, uniforms.cursorRadius);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        lastDrawAt = performance.now();
        drawCount += 1;
        const pointerSettling =
          Math.abs(targetX - mouseX) > 0.001 ||
          Math.abs(targetY - mouseY) > 0.001 ||
          Math.abs(targetPresence - cursorPresence) > 0.001;
        if (timeAnimated() || pointerSettling) requestRender();
        else lastNow = null;
      };
      requestRender();

      return {
        get status() {
          return {
            lost: gl.isContextLost(),
            drawCount,
            lastDrawAt,
            canvasW: canvas.width,
            canvasH: canvas.height,
            linked: gl.getProgramParameter(program, gl.LINK_STATUS) === true,
          };
        },
        redraw() { requestRender(); },
        setMode(next) {
          Object.assign(uniforms, composeUniforms(next));
          applyUniforms();
          requestRender();
        },
      };
    }

    // ── DOM ────────────────────────────────────────────────────────────────────
    let container = null;
    let canvasEl = null;
    let scrimEl = null;
    let toggleEl = null;
    let engine = null;
    let current = "off";
    let booted = false;
    let savedThemeVars = new Map();
    let themeService = null;
    let tokenLayerDispose = null;

    function ensureDom() {
      if (container) return;
      container = document.createElement("div");
      container.id = "dsh-silk-container";
      Object.assign(container.style, {
        position: "fixed", inset: "0", width: "100vw", height: "100vh",
        pointerEvents: "none", zIndex: "-1", overflow: "hidden",
      });
      canvasEl = document.createElement("canvas");
      Object.assign(canvasEl.style, { display: "block", width: "100%", height: "100%" });
      container.appendChild(canvasEl);
      scrimEl = document.createElement("div");
      Object.assign(scrimEl.style, {
        position: "absolute", inset: "0", pointerEvents: "none",
        background: "rgba(6, 8, 18, 0)", transition: "background 400ms ease",
      });
      container.appendChild(scrimEl);
      document.body.appendChild(container);
    }

    // ── theme-token overrides: official overrideTokens layer, manual fallback ──
    function applyThemeOverrides(mode) {
      const body = document.body;
      if (mode === "off") {
        if (tokenLayerDispose) {
          tokenLayerDispose();
          tokenLayerDispose = null;
        }
        if (!body) return;
        for (const [name, original] of savedThemeVars) {
          if (original === null) body.style.removeProperty(name);
          else body.style.setProperty(name, original);
        }
        savedThemeVars.clear();
        return;
      }
      if (themeService && typeof themeService.overrideTokens === "function") {
        if (tokenLayerDispose) tokenLayerDispose();
        tokenLayerDispose = themeService.overrideTokens(
          "silk-background",
          THEME_OVERRIDES[mode] || THEME_OVERRIDES.dim,
        );
      } else if (body) {
        // Fallback: inline style with !important (v3 behaviour).
        const overrides = FALLBACK_OVERRIDES[mode] || FALLBACK_OVERRIDES.dim;
        for (const [name, value] of Object.entries(overrides)) {
          if (!savedThemeVars.has(name)) {
            savedThemeVars.set(name, body.style.getPropertyValue(name) || null);
          }
          body.style.setProperty(name, value, "important");
        }
      }
      if (!body) return;
      // The app base lives on html/body/#root backgrounds as well.
      for (const el of [document.documentElement, body, document.querySelector("#root")]) {
        if (el) {
          el.style.setProperty("background", "transparent", "important");
          el.style.setProperty("background-color", "transparent", "important");
        }
      }
    }

    function makeToggle() {
      if (toggleEl) return;
      toggleEl = document.createElement("button");
      toggleEl.title = "Silk background: click to switch (off / dim / vivid)";
      toggleEl.setAttribute("aria-label", "Toggle silk background");
      Object.assign(toggleEl.style, {
        position: "fixed", right: "14px", bottom: "14px", zIndex: "2147483000",
        width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.4)", background: "rgba(15,18,28,0.85)",
        color: "rgba(255,255,255,0.95)", fontSize: "14px", lineHeight: "32px",
        textAlign: "center", padding: "0", userSelect: "none",
        boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, sans-serif",
      });
      toggleEl.addEventListener("click", (event) => {
        event.stopPropagation();
        const idx = MODES.indexOf(current);
        setMode(MODES[(idx + 1) % MODES.length]);
      });
      document.body.appendChild(toggleEl);
    }

    let settingsBtnEl = null;
    function makeSettingsButton() {
      if (settingsBtnEl) return;
      settingsBtnEl = document.createElement("button");
      settingsBtnEl.title = "Silk settings (speed / intensity / colours)";
      settingsBtnEl.setAttribute("aria-label", "Silk settings");
      settingsBtnEl.textContent = "⚙";
      Object.assign(settingsBtnEl.style, {
        position: "fixed", right: "14px", bottom: "56px", zIndex: "2147483000",
        width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.35)", background: "rgba(15,18,28,0.75)",
        color: "rgba(255,255,255,0.9)", fontSize: "14px", lineHeight: "28px",
        textAlign: "center", padding: "0", userSelect: "none",
        boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, sans-serif",
      });
      settingsBtnEl.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDebugPanel();
      });
      document.body.appendChild(settingsBtnEl);
    }

    function updateToggle() {
      if (!toggleEl) return;
      toggleEl.textContent = current === "off" ? "✕" : current === "dim" ? "◐" : "◉";
      toggleEl.style.opacity = current === "off" ? "0.45" : "0.9";
    }

    function setMode(mode) {
      if (!MODES.includes(mode)) mode = "off";
      current = mode;
      try { localStorage.setItem(STORE_KEY, mode); } catch { /* ignore */ }
      applyThemeOverrides(mode);
      if (mode === "off") {
        if (container) container.style.display = "none";
        if (scrimEl) scrimEl.style.background = "rgba(6, 8, 18, 0)";
      } else {
        ensureDom();
        container.style.display = "block";
        if (scrimEl) scrimEl.style.background = `rgba(6, 8, 18, ${SCM_ALPHA[mode]})`;
        if (!engine) {
          engine = createEngine(canvasEl, composeUniforms(mode));
          console.log("[silk-background] engine", engine ? "created (v4 token-layer)" : "FAILED");
        } else {
          engine.setMode(mode);
        }
      }
      updateToggle();
      refreshDebug();
    }

    // ── slim debug panel ───────────────────────────────────────────────────────
    let debugEl = null;
    let debugOpen = false;

    function buildDebugText() {
      const lines = [];
      lines.push(`mode: ${current}`);
      if (engine) {
        const st = engine.status;
        lines.push(`gl: lost=${st.lost} linked=${st.linked} draws=${st.drawCount} canvas=${st.canvasW}x${st.canvasH}`);
      } else {
        lines.push("gl: no engine");
      }
      const body = document.body;
      if (body) {
        const base = body.style.getPropertyValue("--dsw-alias-bg-base");
        const l1 = body.style.getPropertyValue("--dsw-alias-bg-layer-1");
        lines.push(`vars: bg-base=${base || "(unset)"} layer-1=${l1 || "(unset)"}`);
      }
      lines.push(`params: speed=${USER.speed ?? "auto"} palette=${USER.palette} intensity=${USER.intensity ?? "auto"}`);
      return lines.join("\n");
    }

    function refreshDebug() {
      if (debugOpen && debugEl) {
        const textEl = debugEl.querySelector("pre");
        if (textEl) textEl.textContent = buildDebugText();
      }
    }

    function toggleDebugPanel() {
      debugOpen = !debugOpen;
      if (!debugOpen) {
        if (debugEl) debugEl.remove();
        debugEl = null;
        return;
      }
      if (!debugEl) {
        debugEl = document.createElement("div");
        Object.assign(debugEl.style, {
          position: "fixed", right: "14px", top: "14px", zIndex: "2147483000",
          maxWidth: "420px", maxHeight: "60vh", overflow: "auto",
          background: "rgba(10,12,20,0.94)", color: "#d7dce8",
          border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px",
          padding: "10px 12px", fontSize: "11px", lineHeight: "1.5",
          fontFamily: "ui-monospace, Consolas, monospace",
        });
        const textEl = document.createElement("pre");
        Object.assign(textEl.style, { margin: "0 0 8px", whiteSpace: "pre-wrap", font: "inherit", color: "inherit" });
        debugEl.appendChild(textEl);
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "6px";
        row.style.flexWrap = "wrap";
        const mkBtn = (label, onClick) => {
          const b = document.createElement("button");
          b.textContent = label;
          Object.assign(b.style, {
            cursor: "pointer", background: "#2b3a5c", color: "#fff",
            border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "11px",
          });
          b.addEventListener("click", onClick);
          row.appendChild(b);
        };
        mkBtn("close", () => toggleDebugPanel());
        debugEl.appendChild(row);

        // ── settings: speed / intensity / palette presets / RGB pickers ───────
        const settings = document.createElement("div");
        Object.assign(settings.style, {
          marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.15)",
          display: "flex", flexDirection: "column", gap: "8px",
        });

        const mkSlider = (label, min, max, step, value, onChange) => {
          const wrap = document.createElement("label");
          wrap.style.cssText = "display:flex;align-items:center;gap:8px;font-size:11px;color:#d7dce8;";
          const span = document.createElement("span");
          span.style.cssText = "min-width:34px;";
          span.textContent = label;
          const input = document.createElement("input");
          input.type = "range";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(value);
          input.style.cssText = "flex:1;";
          const val = document.createElement("span");
          val.style.cssText = "min-width:38px;text-align:right;";
          val.textContent = String(value);
          input.addEventListener("input", () => {
            val.textContent = input.value;
            onChange(parseFloat(input.value));
          });
          wrap.appendChild(span);
          wrap.appendChild(input);
          wrap.appendChild(val);
          settings.appendChild(wrap);
          return input;
        };

        const speed = typeof USER.speed === "number" ? USER.speed : PRESETS.vivid.timeScale;
        const intensity = typeof USER.intensity === "number" ? USER.intensity : PRESETS.vivid.intensity;
        mkSlider("速度", 0.05, 1.2, 0.02, speed, (v) => {
          USER.speed = v; saveParams(); engine?.setMode(current);
        });
        mkSlider("强度", 0.1, 1.4, 0.05, intensity, (v) => {
          USER.intensity = v; saveParams(); engine?.setMode(current);
        });

        // Palette presets.
        const palRow = document.createElement("div");
        palRow.style.cssText = "display:flex;align-items:center;gap:6px;font-size:11px;color:#d7dce8;flex-wrap:wrap;";
        const palLabel = document.createElement("span");
        palLabel.textContent = "配色";
        palRow.appendChild(palLabel);
        const refreshPalBtns = () => {
          for (const cb of palRow.querySelectorAll("button")) {
            cb.style.background = cb.dataset.pal === USER.palette ? "#5b3f8f" : "#2b3a5c";
          }
        };
        for (const key of Object.keys(PALETTES)) {
          const b = document.createElement("button");
          b.textContent = PALETTE_NAMES[key] || key;
          b.dataset.pal = key;
          Object.assign(b.style, {
            cursor: "pointer", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "6px", padding: "3px 8px", fontSize: "11px",
            background: USER.palette === key ? "#5b3f8f" : "#2b3a5c",
          });
          b.addEventListener("click", () => {
            USER.palette = key;
            saveParams();
            engine?.setMode(current);
            refreshPalBtns();
            syncPickers();
          });
          palRow.appendChild(b);
        }
        settings.appendChild(palRow);

        // RGB pickers for the four active palette colours.
        const pickRow = document.createElement("div");
        pickRow.style.cssText = "display:flex;align-items:center;gap:8px;font-size:11px;color:#d7dce8;";
        const pickLabel = document.createElement("span");
        pickLabel.textContent = "调色";
        pickRow.appendChild(pickLabel);
        const pickers = [];
        const syncPickers = () => {
          const colors = activeColors();
          for (let i = 0; i < 4; i++) {
            pickers[i].value = rgbToHex(colors[i]);
            pickers[i].style.background = rgbToHex(colors[i]);
          }
        };
        for (let i = 0; i < 4; i++) {
          const input = document.createElement("input");
          input.type = "color";
          input.style.cssText = "width:26px;height:26px;padding:0;border:1px solid rgba(255,255,255,0.3);border-radius:6px;background:none;cursor:pointer;";
          input.addEventListener("input", () => {
            const colors = activeColors().slice();
            for (let j = 0; j < 4; j++) {
              const rgb = hexToRgb(pickers[j].value);
              if (rgb) colors[j] = rgb;
            }
            for (let j = 4; j < 8; j++) colors[j] = colors[3];
            USER.palette = "custom";
            USER.customColors = colors;
            saveParams();
            engine?.setMode(current);
            refreshPalBtns();
          });
          pickers.push(input);
          pickRow.appendChild(input);
        }
        settings.appendChild(pickRow);
        syncPickers();
        debugEl.appendChild(settings);
        document.body.appendChild(debugEl);
      }
      refreshDebug();
    }

    // ── sidebar polish: neutralize gradient fades / decorative shadows that
    //    paint over the glass (e.g. the scroll fade above the settings footer).
    function polishSidebar() {
      const col = document.querySelector(".pI_x6G_sidebarCol");
      if (!col) return;
      for (const el of col.querySelectorAll("*")) {
        if (el.closest("button, input, textarea, select, a, code, pre")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 100 && r.height < 100) continue;
        let cs;
        try { cs = getComputedStyle(el); } catch { continue; }
        if (cs.backgroundImage && cs.backgroundImage !== "none") {
          el.style.setProperty("background", "transparent", "important");
          el.style.setProperty("background-image", "none", "important");
        }
        if (cs.boxShadow && cs.boxShadow !== "none") {
          el.style.setProperty("box-shadow", "none", "important");
        }
      }
    }

    function boot() {
      if (booted) return;
      booted = true;
      let saved = null;
      try { saved = localStorage.getItem(STORE_KEY); } catch { /* ignore */ }
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      let initial = saved || "dim";
      if (!MODES.includes(initial)) initial = "dim";
      if (reduced && initial === "dim") PRESETS.dim.timeScale = 0;
      console.log("[silk-background] v4 boot, mode =", initial, "reducedMotion =", reduced);
      setMode(initial);
      makeToggle();
      makeSettingsButton();
      if (/\bsilk-debug\b/.test(location.search)) toggleDebugPanel();

      // v4: the token layer is official, so the presenter keeps it applied on
      // every theme re-sync — no self-healing needed. The interval only
      // re-runs the sidebar polish (React re-renders can repaint gradient
      // fades over the glass); the manual fallback path also rides it,
      // matching v3 exactly.
      setInterval(() => {
        if (current !== "off") {
          if (!themeService) applyThemeOverrides(current);
          polishSidebar();
        }
      }, 1000);

      window.__dshSilk = {
        get mode() { return current; },
        get engineStatus() { return engine ? engine.status : null; },
        setMode,
      };
    }

    function apply(ctx) {
      const theme = ctx && typeof ctx.get === "function" ? ctx.get("theme") : undefined;
      if (theme && typeof theme.overrideTokens === "function") themeService = theme;
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
      else boot();
    }

    // Hard dependency on the theme service: the client cordis runner waits for
    // it before calling apply, so the official overrideTokens layer is always
    // available in the normal web-profile mount (the ctx.get above merely
    // guards exotic mounts without the runner).
    exports.inject = ["theme"];
    exports.apply = apply;
    return module.exports;
  }
});
