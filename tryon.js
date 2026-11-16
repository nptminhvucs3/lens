/* ======================================================================
 * Contact Lens Try-On – phần chạy trên trình duyệt.
 * Toàn bộ hình ảnh được xử lý trên thiết bị của khách, không tải lên máy chủ.
 * ==================================================================== */
(function () {
'use strict';

const ENV = window.CLTRYON_ENV || {};
const root = document.getElementById('cltryon-root');
const dataEl = document.getElementById('cltryon-data');
if (!root || !dataEl || root.getAttribute('data-cltryon') === 'ready') { return; }
let DATA = {};
try { DATA = JSON.parse(dataEl.textContent || '{}'); } catch (e) { return; }
const PRODUCTS = (DATA.products || []).filter(function (p) { return p && p.texture; });
if (!PRODUCTS.length) { return; }

/* ---------- Chuỗi giao diện (có thể ghi đè bằng filter cltryon_strings) ---------- */
const T = Object.assign({
  start: 'Bật camera', stop: 'Tắt camera', flip: 'Đổi camera', upload: 'Tải ảnh lên',
  tabLens: 'Chọn lens', tabBeauty: 'Làm đẹp', tabGuide: 'Gợi ý cho bạn',
  emptyTitle: 'Thử lens ngay trên khuôn mặt bạn',
  emptyText: 'Ảnh và video chỉ được xử lý trên thiết bị của bạn, không tải lên máy chủ.',
  loadingModel: 'Đang tải bộ nhận diện mắt…',
  noFace: 'Chưa thấy khuôn mặt. Hãy đưa mặt vào khung và nhìn thẳng.',
  noFacePhoto: 'Không tìm thấy khuôn mặt trong ảnh này. Hãy thử ảnh chụp thẳng mặt, đủ sáng.',
  starting: 'Đang bật camera…',
  errDenied: 'Bạn chưa cho phép dùng camera. Hãy cấp quyền camera cho trang này trong trình duyệt rồi bấm lại, hoặc tải ảnh lên.',
  errNotFound: 'Không tìm thấy camera trên thiết bị này. Bạn vẫn có thể tải ảnh lên để thử.',
  errBusy: 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.',
  errLost: 'Camera bị ngắt kết nối. Hãy bật lại camera.',
  errInsecure: 'Camera chỉ hoạt động trên trang HTTPS. Bạn vẫn có thể tải ảnh lên để thử.',
  errUnsupported: 'Trình duyệt này chưa hỗ trợ camera. Hãy dùng Chrome hoặc Safari bản mới, hoặc tải ảnh lên.',
  errGeneric: 'Không bật được camera. Hãy thử lại hoặc tải ảnh lên.',
  errModel: 'Không tải được bộ nhận diện mắt. Hãy kiểm tra kết nối mạng rồi thử lại.',
  errImage: 'Không đọc được ảnh này. Hãy thử ảnh JPG hoặc PNG khác.',
  errTexture: 'Không tải được ảnh của lens này.',
  noWebgl: 'Thiết bị không hỗ trợ WebGL nên đang dùng chế độ hiển thị đơn giản (làm đẹp và lens kém tinh tế hơn).',
  all: 'Tất cả', moreFilters: 'Lọc thêm', lessFilters: 'Thu gọn bộ lọc',
  fStyle: 'Phong cách', fDilation: 'Giãn tròng', fBorder: 'Viền', fUsage: 'Mục đích',
  fColor: 'Màu lens', noMatch: 'Không có lens nào khớp bộ lọc.', clearFilters: 'Xóa lọc',
  buy: 'Mua hàng', details: 'Thông số chi tiết', hideDetails: 'Thu gọn',
  openProduct: 'Mở trang sản phẩm', reassure: 'An tâm khi dùng',
  beautyOn: 'Bật làm đẹp', beautyHint: 'Hiệu ứng nhẹ, không làm đổi màu lens. Hoạt động độc lập với việc chọn lens.',
  smooth: 'Làm mịn da', bright: 'Sáng da', glow: 'Da khỏe', blemish: 'Giảm khuyết điểm', soft: 'Làm đẹp tổng thể',
  resetBeauty: 'Đặt lại mặc định',
  guideIntro: 'Trả lời nhanh vài câu để lọc ra những mẫu hợp gu. Đây chỉ là gợi ý về thẩm mỹ, không phải tư vấn y khoa.',
  guideGo: 'Xem lens gợi ý', guideReset: 'Làm lại',
  guideAny: 'Không quan trọng',
  guideRelaxed: 'Không có mẫu khớp hoàn toàn, đã nới lỏng: ',
  guideNone: 'Chưa có mẫu nào có đủ thông tin để gợi ý theo lựa chọn này.',
  guideActive: 'Đang hiển thị lens gợi ý theo sở thích.', guideClear: 'Bỏ gợi ý',
  specLabels: { dia: 'DIA', gdia: 'G.DIA', bc: 'BC', pwr: 'PWR', material: 'Chất liệu', water: 'Hàm lượng nước', dkt: 'Truyền oxy (Dk/t)', cycle: 'Chu kỳ thay lens', schedule: 'Lịch đeo', brand: 'Thương hiệu', origin: 'Xuất xứ' },
  stageHint: 'Chọn một lens bên dưới để thử.'
}, ENV.strings || {});

/* ---------- Tiện ích ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function h(tag, attrs) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) { continue; }
      if (k === 'class') { e.className = v; }
      else if (k === 'text') { e.textContent = v; }
      else if (k === 'html') { e.innerHTML = v; }
      else if (k.slice(0, 2) === 'on') { e.addEventListener(k.slice(2), v); }
      else { e.setAttribute(k, v === true ? '' : v); }
    }
  }
  for (let i = 2; i < arguments.length; i++) {
    const kids = [].concat(arguments[i]);
    for (const c of kids) {
      if (c == null || c === false) { continue; }
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return e;
}
const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 1500 }) : (f) => setTimeout(f, 120);

/* ---------- Bộ lọc One Euro: giảm rung nhưng không trễ khi di chuyển nhanh ---------- */
class OneEuroBank {
  constructor(n, minCutoff, beta, dCutoff) {
    this.n = n; this.mc = minCutoff; this.b = beta; this.dc = dCutoff || 1;
    this.x = new Float32Array(n); this.dx = new Float32Array(n); this.t = 0; this.ready = false;
  }
  reset() { this.ready = false; }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  apply(raw, t) {
    if (!this.ready) { this.x.set(raw); this.dx.fill(0); this.t = t; this.ready = true; return this.x; }
    const dt = Math.max(t - this.t, 1e-3); this.t = t;
    const ad = OneEuroBank.alpha(this.dc, dt);
    for (let i = 0; i < this.n; i++) {
      const dxr = (raw[i] - this.x[i]) / dt;
      this.dx[i] += ad * (dxr - this.dx[i]);
      const a = OneEuroBank.alpha(this.mc + this.b * Math.abs(this.dx[i]), dt);
      this.x[i] += a * (raw[i] - this.x[i]);
    }
    return this.x;
  }
}

/* ---------- Chỉ số điểm mốc MediaPipe Face Mesh ---------- */
const EYES = [
  { lid: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], axis: [33, 133], up: 159, lo: 145 },
  { lid: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466], axis: [362, 263], up: 386, lo: 374 }
];
const IRIS = [{ c: 468, ring: [469, 470, 471, 472] }, { c: 473, ring: [474, 475, 476, 477] }];
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const BROWS = [[70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [276, 283, 282, 295, 285, 336, 296, 334, 293, 300]];
const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const HVID_MM = 11.7; // đường kính mống mắt trung bình, dùng để quy đổi G.DIA ra tỉ lệ

/* ---------- Mặt nạ da: lớp ngoài (rất mềm) và lớp loại trừ mắt/mày/môi ---------- */
const MASK_OUT_W = 40, MASK_HOLE_W = 128;
const REF_IDX = [50, 280, 151, 205, 425]; // má, trán: lấy màu da tham chiếu
function makeMasks() { return { outer: document.createElement('canvas'), holes: document.createElement('canvas'), ratio: 4 / 3 }; }
function drawFaceMasks(m, lm) {
  const trace = (c, w, hh, ids) => { c.beginPath(); ids.forEach((i, k) => { const p = lm[i]; if (k) { c.lineTo(p.x * w, p.y * hh); } else { c.moveTo(p.x * w, p.y * hh); } }); c.closePath(); };
  let w = MASK_OUT_W, hh = Math.max(8, Math.round(w * m.ratio));
  if (m.outer.width !== w || m.outer.height !== hh) { m.outer.width = w; m.outer.height = hh; }
  let c = m.outer.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, hh);
  c.fillStyle = '#fff'; trace(c, w, hh, OVAL); c.fill();
  const fw = dist(lm[234].x * w, lm[234].y * hh, lm[454].x * w, lm[454].y * hh);
  c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; c.lineJoin = 'round';
  c.lineWidth = Math.max(1.2, fw * 0.10); trace(c, w, hh, OVAL); c.stroke();
  c.globalCompositeOperation = 'source-over';
  w = MASK_HOLE_W; hh = Math.max(8, Math.round(w * m.ratio));
  if (m.holes.width !== w || m.holes.height !== hh) { m.holes.width = w; m.holes.height = hh; }
  c = m.holes.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fff'; c.fillRect(0, 0, w, hh);
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineJoin = 'round';
  c.lineWidth = fw / MASK_OUT_W * w * 0.05;
  [EYES[0].lid, EYES[1].lid, BROWS[0], BROWS[1], LIPS].forEach((ids) => { trace(c, w, hh, ids); c.fill(); c.stroke(); });
  c.globalCompositeOperation = 'source-over';
}

/* ---------- Tải ảnh texture lens (thu về 384 px, cắt vuông giữa) ---------- */
const TEX = 384;
function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous'; im.decoding = 'async';
    im.onload = () => res(im); im.onerror = () => rej(new Error('texture'));
    im.src = url;
  });
}
async function lensCanvas(p) {
  const im = await loadImage(p.texture);
  const c = document.createElement('canvas'); c.width = c.height = TEX;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  const s = Math.min(im.naturalWidth, im.naturalHeight);
  x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, TEX, TEX);
  return c;
}

/* ======================================================================
 * Bộ dựng hình WebGL (WebGL2 nếu có, nếu không WebGL1)
 *  Pass 1 (nửa độ phân giải): lớp da mịn bảo toàn biên
 *  Pass 2: ghép da (mặt nạ mềm + màu da tham chiếu), sáng/da khỏe/soft
 *  Pass 3: ghép lens lên mống mắt (khớp ánh sáng, bóng mí, cân bằng màu)
 * ==================================================================== */
const VS = 'attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=vec2(a_pos.x*0.5+0.5,0.5-a_pos.y*0.5);gl_Position=vec4(a_pos,0.0,1.0);}';
const FS_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

const FS_SMOOTH = FS_HEAD + `
varying vec2 v_uv;
uniform sampler2D u_tex; uniform sampler2D u_mask;
uniform vec2 u_texel; uniform float u_rad; uniform float u_sigma;
uniform vec2 u_disc[16];
void main(){
  vec3 c0 = texture2D(u_tex, v_uv).rgb;
  float m = texture2D(u_mask, v_uv).a;
  if (m < 0.01) { gl_FragColor = vec4(c0, 1.0); return; }
  vec3 sum = c0; float wsum = 1.0;
  float inv = 1.0 / (2.0 * u_sigma * u_sigma);
  for (int i = 0; i < 16; i++) {
    vec3 s = texture2D(u_tex, v_uv + u_disc[i] * u_rad * u_texel).rgb;
    vec3 d = s - c0;
    float w = exp(-dot(d, d) * inv);
    sum += s * w; wsum += w;
  }
  gl_FragColor = vec4(sum / wsum, 1.0);
}`;

const FS_COMPOSE = FS_HEAD + `
varying vec2 v_uv;
uniform sampler2D u_tex; uniform sampler2D u_smooth; uniform sampler2D u_outer; uniform sampler2D u_holes;
uniform vec2 u_ref[5];
uniform float u_smoothA, u_bright, u_glow, u_blem, u_soft;
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 cbcr(vec3 c){ vec3 p = c * 255.0; return vec2(128.0 - 0.168736 * p.r - 0.331264 * p.g + 0.5 * p.b, 128.0 + 0.5 * p.r - 0.418688 * p.g - 0.081312 * p.b); }
void main(){
  vec3 c0 = texture2D(u_tex, v_uv).rgb;
  float mo = texture2D(u_outer, v_uv).a;
  if (mo < 0.01) { gl_FragColor = vec4(c0, 1.0); return; }
  float mh = texture2D(u_holes, v_uv).a;
  vec3 S = texture2D(u_smooth, vec2(v_uv.x, 1.0 - v_uv.y)).rgb;
  vec3 ref = vec3(0.0);
  for (int i = 0; i < 5; i++) { ref += texture2D(u_smooth, vec2(u_ref[i].x, 1.0 - u_ref[i].y)).rgb; }
  ref *= 0.2;
  float dc = length(cbcr(S) - cbcr(ref));
  float lS = luma(S);
  float skin = (1.0 - smoothstep(9.0, 21.0, dc)) * smoothstep(0.10, 0.22, lS) * (1.0 - smoothstep(0.97, 1.0, lS) * 0.5);
  float k = mo * mh * skin;
  if (k < 0.003) { gl_FragColor = vec4(c0, 1.0); return; }
  float keep = mix(1.0, 1.0 - u_smoothA * 0.85, k);
  vec3 col = S + (c0 - S) * keep;
  float dl = lS - luma(c0);
  float rd = (c0.r - c0.g) - (S.r - S.g);
  float spot = max(smoothstep(0.012, 0.04, dl) * (1.0 - smoothstep(0.12, 0.25, dl)),
                   smoothstep(0.015, 0.05, rd) * (1.0 - smoothstep(0.10, 0.22, rd)));
  col = mix(col, S, clamp(u_blem * 1.2, 0.0, 1.0) * spot * k);
  col += (1.0 - col) * (u_bright * 0.26 * k);
  float hl = smoothstep(0.35, 0.85, lS);
  col += vec3(1.0, 0.90, 0.82) * u_glow * k * (0.04 + 0.10 * hl);
  float l = luma(col);
  col = mix(vec3(l), col, 1.0 + u_glow * 0.14 * k);
  col = 1.0 - (1.0 - col) * (1.0 - S * u_soft * 0.22 * k);
  col = mix(col, S, u_soft * 0.22 * k);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function eyeCode(E) {
  return `
  if (u_on${E} > 0.5) {
    vec2 p = px - u_c${E};
    float d = length(p);
    if (d < u_R${E} * 1.1) {
      float md = 1.0e9; bool inside = false;
      for (int i = 0; i < 16; i++) {
        vec2 a = u_lid${E}[i]; vec2 b = u_lid${E}[i + 1];
        vec2 e = b - a; vec2 w = px - a;
        float t = clamp(dot(w, e) / max(dot(e, e), 1.0e-6), 0.0, 1.0);
        md = min(md, length(w - e * t));
        if ((a.y > px.y) != (b.y > px.y)) {
          if (px.x < (b.x - a.x) * (px.y - a.y) / (b.y - a.y) + a.x) { inside = !inside; }
        }
      }
      float sd = inside ? md : -md;
      float cs = cos(u_rot${E}); float sn = sin(u_rot${E});
      vec2 q = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / u_R${E};
      float ql = length(q);
      vec2 uv0 = q * 0.5 + 0.5;
      vec4 t = (texture2D(u_lens, uv0) * 2.0
              + texture2D(u_lens, uv0 + vec2(0.0042, 0.0)) + texture2D(u_lens, uv0 - vec2(0.0042, 0.0))
              + texture2D(u_lens, uv0 + vec2(0.0, 0.0042)) + texture2D(u_lens, uv0 - vec2(0.0, 0.0042))) / 6.0;
      float rho = d / u_r${E};
      float edge = 1.0 - smoothstep(1.0 - u_soft - 0.01, 1.0, ql);
      float pupil = smoothstep(u_pupil * 0.70, u_pupil * 1.25, rho);
      float scl = mix(1.0, u_sclera, smoothstep(0.96, 1.08, rho));
      float lidm = smoothstep(0.8, 1.6 + u_r${E} * 0.06, sd);
      vec3 cur = col;
      float l0 = luma(cur);
      float kk = u_r${E} * 0.14;
      float lm = 0.25 * (luma(baseAt(px + vec2(kk, 0.0))) + luma(baseAt(px - vec2(kk, 0.0))) + luma(baseAt(px + vec2(0.0, kk))) + luma(baseAt(px - vec2(0.0, kk))));
      vec2 dir = vec2(cs, sn);
      vec3 sw = brighter(brighter(baseAt(u_c${E} + dir * u_r${E} * 1.45), baseAt(u_c${E} - dir * u_r${E} * 1.45)),
                         brighter(baseAt(u_c${E} + dir * u_r${E} * 1.8), baseAt(u_c${E} - dir * u_r${E} * 1.8)));
      float wl = luma(sw);
      float expo = clamp(wl / 0.80, 0.50, 1.15);
      vec3 sceneCast = mix(vec3(1.0), sw / max(wl, 0.05), 0.35);
      vec3 lc = t.rgb / max(t.a, 0.004);
      float dark = 1.0 - smoothstep(0.14, 0.42, lm);
      vec3 tint = lc * u_bright * expo * sceneCast;
      tint *= mix(1.0, clamp(0.62 + l0 * 1.2, 0.70, 1.2), u_keep);
      tint = mix(vec3(luma(tint)), tint, 0.90);
      tint += vec3(l0 - lm) * u_keep * (1.6 + dark * 1.6);
      float up = clamp(-q.y, 0.0, 1.0);
      tint *= 1.0 - 0.30 * up * up + 0.08 * clamp(q.y, 0.0, 1.0);
      tint *= mix(0.72, 1.0, smoothstep(0.0, u_R${E} * 0.35, sd));
      float sclProt = smoothstep(0.5, 0.8, l0) * smoothstep(0.85, 1.0, rho);
      float a = t.a * edge * pupil * scl * lidm * mix(u_opacity, 0.92, dark) * (1.0 - 0.85 * sclProt);
      vec3 res = mix(cur, clamp(tint, 0.0, 1.0), a);
      float spec = smoothstep(0.86, 0.97, l0) * (1.0 - smoothstep(0.96, 1.06, rho));
      col = mix(res, cur, spec);
    }
  }`;
}

const FS_LENS = FS_HEAD + `
varying vec2 v_uv;
uniform sampler2D u_base; uniform sampler2D u_lens;
uniform float u_flip; uniform vec2 u_res;
uniform float u_opacity, u_keep, u_pupil, u_soft, u_sclera, u_bright;
uniform float u_onA, u_RA, u_rA, u_rotA; uniform vec2 u_cA; uniform vec2 u_lidA[17];
uniform float u_onB, u_RB, u_rB, u_rotB; uniform vec2 u_cB; uniform vec2 u_lidB[17];
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 baseAt(vec2 pos){ vec2 uv = pos / u_res; uv.y = mix(uv.y, 1.0 - uv.y, u_flip); return texture2D(u_base, uv).rgb; }
vec3 brighter(vec3 a, vec3 b){ return luma(a) > luma(b) ? a : b; }
void main(){
  vec2 px = v_uv * u_res;
  vec3 col = baseAt(px);
  ${eyeCode('A')}
  ${eyeCode('B')}
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('Shader: ' + log); }
  return s;
}
function makeProgram(gl, fsSrc, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.bindAttribLocation(p, 0, 'a_pos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error('Link: ' + gl.getProgramInfoLog(p)); }
  const u = {};
  names.forEach((n) => { u[n] = gl.getUniformLocation(p, n); });
  return { p: p, u: u };
}

const DISC = (function () {
  const a = [];
  for (let i = 0; i < 16; i++) { const r = Math.sqrt((i + 0.5) / 16), t = i * 2.39996323; a.push(Math.cos(t) * r, Math.sin(t) * r); }
  return new Float32Array(a);
})();

class GLRenderer {
  constructor(canvas) {
    this.kind = 'webgl'; this.cv = canvas; this.ok = false; this.cache = new Map(); this.lost = false;
    this.w = 0; this.h = 0; this.onRestore = null; this.hasSource = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => {
      this.cache = new Map(); this.hasSource = false;
      try { this.build(); this.resize(this.w, this.h); this.lost = false; } catch (err) { this.ok = false; }
      if (this.onRestore) { this.onRestore(); }
    });
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let gl = null;
    try { gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
    if (!gl) { return; }
    this.gl = gl;
    this.kind = (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) ? 'webgl2' : 'webgl';
    try { this.build(); this.ok = true; } catch (e) { if (window.console) { console.warn('[cltryon]', e); } this.ok = false; }
  }
  build() {
    const gl = this.gl;
    this.ps = makeProgram(gl, FS_SMOOTH, ['u_tex', 'u_mask', 'u_texel', 'u_rad', 'u_sigma', 'u_disc']);
    this.pc = makeProgram(gl, FS_COMPOSE, ['u_tex', 'u_smooth', 'u_outer', 'u_holes', 'u_ref', 'u_smoothA', 'u_bright', 'u_glow', 'u_blem', 'u_soft']);
    const ln = ['u_base', 'u_lens', 'u_flip', 'u_res', 'u_opacity', 'u_keep', 'u_pupil', 'u_soft', 'u_sclera', 'u_bright'];
    ['A', 'B'].forEach((E) => { ['on', 'R', 'r', 'rot', 'c', 'lid'].forEach((n) => { ln.push('u_' + n + E); }); });
    this.pl = makeProgram(gl, FS_LENS, ln);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const mk = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.mk = mk;
    this.srcTex = mk(); this.outerTex = mk(); this.holesTex = mk(); this.dummy = mk();
    this.fullTex = mk(); this.halfTex = mk();
    gl.bindTexture(gl.TEXTURE_2D, this.dummy);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    this.fullFbo = gl.createFramebuffer(); this.halfFbo = gl.createFramebuffer();
  }
  resize(w, h) {
    this.w = w; this.h = h;
    if (this.cv.width !== w) { this.cv.width = w; }
    if (this.cv.height !== h) { this.cv.height = h; }
    if (!this.gl) { return; }
    const gl = this.gl;
    this.hw = Math.max(2, Math.round(w / 2)); this.hh = Math.max(2, Math.round(h / 2));
    [[this.fullTex, this.fullFbo, w, h], [this.halfTex, this.halfFbo, this.hw, this.hh]].forEach((a) => {
      gl.bindTexture(gl.TEXTURE_2D, a[0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, a[2], a[3], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, a[1]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a[0], 0);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /** Tải khung hình nguồn lên GPU (gọi ngay trước khi nhận diện để lens và hình khớp nhau). */
  setSource(src) {
    if (!this.ok || this.lost) { return; }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    this.hasSource = true;
  }
  async ensureLens(p) {
    const hit = this.cache.get(p.id);
    if (hit) { hit.t = performance.now(); return hit; }
    const canvas = await lensCanvas(p);
    if (!this.gl || this.lost) { throw new Error('ctx'); }
    const gl = this.gl;
    const tex = this.mk();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const entry = { id: p.id, tex: tex, t: performance.now() };
    this.cache.set(p.id, entry);
    if (this.cache.size > 14) {
      let oldest = null;
      this.cache.forEach((v) => { if (v !== entry && (!oldest || v.t < oldest.t)) { oldest = v; } });
      if (oldest) { gl.deleteTexture(oldest.tex); this.cache.delete(oldest.id); }
    }
    return entry;
  }
  render(st) {
    if (!this.ok || this.lost || !this.hasSource) { return; }
    const gl = this.gl, W = this.w, H = this.h;
    let base = this.srcTex, flip = 0;
    const b = st.beauty;
    if (b && st.masks && st.faceW > 0) {
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.outerTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, st.masks.outer);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.holesTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, st.masks.holes);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      // Pass 1: lớp da mịn (nửa độ phân giải)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.halfFbo);
      gl.viewport(0, 0, this.hw, this.hh);
      let P = this.ps;
      gl.useProgram(P.p);
      gl.uniform1i(P.u.u_tex, 0); gl.uniform1i(P.u.u_mask, 2);
      gl.uniform2f(P.u.u_texel, 1 / W, 1 / H);
      gl.uniform1f(P.u.u_rad, clamp(st.faceW * 0.017, 3, 14));
      gl.uniform1f(P.u.u_sigma, 0.10 + 0.10 * Math.max(b.smooth, b.blem));
      gl.uniform2fv(P.u.u_disc, DISC);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // Pass 2: ghép
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fullFbo);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.halfTex);
      P = this.pc;
      gl.useProgram(P.p);
      gl.uniform1i(P.u.u_tex, 0); gl.uniform1i(P.u.u_smooth, 1); gl.uniform1i(P.u.u_outer, 2); gl.uniform1i(P.u.u_holes, 3);
      gl.uniform2fv(P.u.u_ref, st.refUV);
      gl.uniform1f(P.u.u_smoothA, b.smooth); gl.uniform1f(P.u.u_bright, b.bright);
      gl.uniform1f(P.u.u_glow, b.glow); gl.uniform1f(P.u.u_blem, b.blem); gl.uniform1f(P.u.u_soft, b.soft);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      base = this.fullTex; flip = 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // Pass 3: lens
    gl.viewport(0, 0, W, H);
    const P = this.pl;
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, base);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, st.lens ? st.lens.tex : this.dummy);
    gl.uniform1i(P.u.u_base, 0); gl.uniform1i(P.u.u_lens, 1);
    gl.uniform1f(P.u.u_flip, flip); gl.uniform2f(P.u.u_res, W, H);
    const lp = st.lensParams || { opacity: 0, keep: 0, pupil: 0.3, soft: 0.1, sclera: 0.3, bright: 1 };
    gl.uniform1f(P.u.u_opacity, lp.opacity); gl.uniform1f(P.u.u_keep, lp.keep); gl.uniform1f(P.u.u_pupil, lp.pupil);
    gl.uniform1f(P.u.u_soft, lp.soft); gl.uniform1f(P.u.u_sclera, lp.sclera); gl.uniform1f(P.u.u_bright, lp.bright);
    ['A', 'B'].forEach((E, i) => {
      const e = st.lens && st.eyes ? st.eyes[i] : null;
      const on = e && e.on ? 1 : 0;
      gl.uniform1f(P.u['u_on' + E], on);
      if (on) {
        gl.uniform1f(P.u['u_R' + E], e.R); gl.uniform1f(P.u['u_r' + E], e.r); gl.uniform1f(P.u['u_rot' + E], e.rot);
        gl.uniform2f(P.u['u_c' + E], e.cx, e.cy); gl.uniform2fv(P.u['u_lid' + E], e.lid17);
      }
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // trả đơn vị texture 0 về nguồn để lần sau không có vòng phản hồi
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
  }
}

/* ======================================================================
 * Phương án dự phòng khi không có WebGL: Canvas 2D
 * ==================================================================== */
class Canvas2DRenderer {
  constructor(canvas) {
    this.kind = '2d'; this.cv = canvas; this.ok = true; this.cache = new Map();
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.frame = document.createElement('canvas'); this.small = document.createElement('canvas'); this.tmp = document.createElement('canvas');
    this.w = 0; this.h = 0; this.hasSource = false;
    if (!this.ctx) { this.ok = false; }
  }
  resize(w, h) {
    this.w = w; this.h = h; this.cv.width = w; this.cv.height = h;
    this.frame.width = w; this.frame.height = h;
    this.small.width = Math.max(8, Math.round(w / 4)); this.small.height = Math.max(8, Math.round(h / 4));
    this.tmp.width = w; this.tmp.height = h;
  }
  setSource(src) { this.frame.getContext('2d').drawImage(src, 0, 0, this.w, this.h); this.hasSource = true; }
  async ensureLens(p) {
    let hit = this.cache.get(p.id);
    if (!hit) { hit = { id: p.id, tex: await lensCanvas(p) }; this.cache.set(p.id, hit); }
    return hit;
  }
  render(st) {
    if (!this.hasSource) { return; }
    const c = this.ctx, W = this.w, H = this.h, b = st.beauty;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(this.frame, 0, 0, W, H);
    if (b && st.masks && st.faceW > 0) {
      const s = this.small.getContext('2d'), t = this.tmp.getContext('2d');
      s.drawImage(this.frame, 0, 0, this.small.width, this.small.height);
      const masked = (fill) => {
        t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(0, 0, W, H);
        fill();
        t.globalCompositeOperation = 'destination-in';
        t.drawImage(st.masks.outer, 0, 0, W, H); t.drawImage(st.masks.holes, 0, 0, W, H);
        t.globalCompositeOperation = 'source-over';
      };
      masked(() => { t.imageSmoothingEnabled = true; t.drawImage(this.small, 0, 0, W, H); });
      c.globalAlpha = clamp(b.smooth * 0.6 + b.soft * 0.25 + b.blem * 0.15, 0, 0.8);
      c.drawImage(this.tmp, 0, 0);
      const lift = clamp(b.bright * 0.22 + b.glow * 0.12, 0, 0.5);
      if (lift > 0.005) {
        masked(() => { t.fillStyle = 'rgb(255,238,226)'; t.fillRect(0, 0, W, H); });
        c.globalCompositeOperation = 'screen'; c.globalAlpha = lift; c.drawImage(this.tmp, 0, 0);
      }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    if (st.lens && st.eyes) {
      const lp = st.lensParams;
      st.eyes.forEach((e) => {
        if (!e || !e.on) { return; }
        c.save();
        c.beginPath();
        for (let i = 0; i < 16; i++) { const x = e.lid17[i * 2], y = e.lid17[i * 2 + 1]; if (i) { c.lineTo(x, y); } else { c.moveTo(x, y); } }
        c.closePath(); c.clip();
        c.beginPath(); c.arc(e.cx, e.cy, e.r * 1.06, 0, Math.PI * 2); c.clip();
        c.translate(e.cx, e.cy); c.rotate(e.rot);
        c.globalAlpha = lp.opacity;
        c.drawImage(st.lens.tex, -e.R, -e.R, e.R * 2, e.R * 2);
        c.restore();
      });
    }
    c.globalAlpha = 1;
  }
}

/* ======================================================================
 * Ứng dụng: giao diện, camera, nhận diện, vòng lặp dựng hình
 * ==================================================================== */
const CH = ENV.choices || {};
const ICON = {
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8.5h3.2l1.6-2.2h6.4l1.6 2.2H20v10H4z"/><circle cx="12" cy="13.4" r="3.2"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M5 10a7.5 7.5 0 0 1 13-3.2M19 14a7.5 7.5 0 0 1-13 3.2"/><path d="M18.5 3.5v3.6h-3.6M5.5 20.5v-3.6h3.6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V5.5M7.8 9.5 12 5.3l4.2 4.2M5 19h14"/></svg>'
};
const SPEC_ORDER = ['dia', 'gdia', 'bc', 'pwr', 'material', 'water', 'dkt', 'cycle', 'schedule', 'brand', 'origin'];
const FILTER_KEYS = ['color', 'style', 'dilation', 'border', 'usage'];

const state = {
  mode: 'idle', facing: 'user', mirrored: true, stream: null, source: null, photoCanvas: null,
  renderer: null, tracker: null, trackerState: 'none', loopId: 0,
  selected: null, active: null,
  filters: { color: '', style: '', dilation: '', border: '', usage: '' },
  quiz: null, answers: {}, detailsOpen: false, moreOpen: false,
  beauty: { on: true, smooth: 0.55, bright: 0.25, glow: 0.25, blem: 0.55, soft: 0.30 },
  lastSeen: 0, face: null, videoCount: 1, statusKey: '', quality: 0, frameMs: 0, frameN: 0, warming: false
};
const BEAUTY_DEFAULT = Object.assign({}, state.beauty);

const facet = (key) => {
  const present = new Set(PRODUCTS.map((p) => p[key]).filter(Boolean));
  return Object.keys(CH[key] || {}).filter((k) => present.has(k));
};
const labelOf = (key, val) => ((CH[key] || {})[val]) || val;
const shortOf = (key, val) => labelOf(key, val).split(' – ')[0];

/* ---------- Dựng giao diện ---------- */
let canvas = h('canvas', { class: 'cl-canvas', role: 'img', 'aria-label': 'Khung xem thử lens trên khuôn mặt' });
const video = h('video', { class: 'cl-video', playsinline: true, muted: true, autoplay: true, 'aria-hidden': 'true', tabindex: '-1' });
video.muted = true; video.setAttribute('webkit-playsinline', '');
const masks = makeMasks();

const btn = (cls, iconHtml, text, onclick, extra) => h('button', Object.assign({ type: 'button', class: 'cl-b ' + cls, onclick: onclick }, extra || {}),
  iconHtml ? h('span', { class: 'cl-ico', html: iconHtml }) : null, text ? h('span', { class: 'cl-b__t', text: text }) : null);

const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'cl-file', hidden: true, tabindex: '-1', 'aria-hidden': 'true' });
const emptyBox = h('div', { class: 'cl-empty' },
  h('div', { class: 'cl-empty__in' },
    h('h2', { class: 'cl-empty__t', text: T.emptyTitle }),
    h('p', { class: 'cl-empty__p', text: T.emptyText }),
    h('div', { class: 'cl-actions' },
      btn('cl-btn cl-btn--primary', ICON.cam, T.start, () => startCamera()),
      btn('cl-btn cl-btn--ghost', ICON.up, T.upload, () => fileInput.click()))));
const statusEl = h('div', { class: 'cl-status', role: 'status', 'aria-live': 'polite', hidden: true });
const chipName = h('div', { class: 'cl-chip', hidden: true });
const flipBtn = btn('cl-tool', ICON.flip, '', () => flipCamera(), { 'aria-label': T.flip, title: T.flip, hidden: true });
const upBtn = btn('cl-tool', ICON.up, '', () => fileInput.click(), { 'aria-label': T.upload, title: T.upload });
const tools = h('div', { class: 'cl-tools', hidden: true }, flipBtn, upBtn);
const mainBtnLabel = h('span', { class: 'cl-b__t', text: T.start });
const mainBtnIcon = h('span', { class: 'cl-ico', html: ICON.cam });
const mainBtn = h('button', { type: 'button', class: 'cl-b cl-btn cl-btn--primary cl-bar__main', onclick: () => { state.mode === 'camera' ? stopCamera() : startCamera(); } }, mainBtnIcon, mainBtnLabel);
const bar = h('div', { class: 'cl-bar', hidden: true }, mainBtn);
const stage = h('div', { class: 'cl-stage', 'data-mode': 'idle' }, canvas, video, emptyBox, statusEl, chipName, tools, bar);

/* Tabs */
const tabDefs = [['lens', T.tabLens], ['beauty', T.tabBeauty], ['guide', T.tabGuide]];
const tabEls = {}, panelEls = {};
const tablist = h('div', { class: 'cl-tabs', role: 'tablist' });
tabDefs.forEach((d, i) => {
  const b = h('button', { type: 'button', class: 'cl-b cl-tab', role: 'tab', id: 'cltab-' + d[0], 'aria-controls': 'clpanel-' + d[0], 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', text: d[1], onclick: () => showTab(d[0]),
    onkeydown: (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') { return; }
      const n = (i + (ev.key === 'ArrowRight' ? 1 : tabDefs.length - 1)) % tabDefs.length;
      showTab(tabDefs[n][0]); tabEls[tabDefs[n][0]].focus();
    } });
  tabEls[d[0]] = b; tablist.appendChild(b);
  panelEls[d[0]] = h('div', { class: 'cl-tabpanel', role: 'tabpanel', id: 'clpanel-' + d[0], 'aria-labelledby': 'cltab-' + d[0], hidden: i !== 0 });
});
function showTab(name) {
  tabDefs.forEach((d) => {
    const on = d[0] === name;
    tabEls[d[0]].setAttribute('aria-selected', on ? 'true' : 'false'); tabEls[d[0]].tabIndex = on ? 0 : -1;
    panelEls[d[0]].hidden = !on;
  });
}

/* --- Tab chọn lens --- */
const colorRow = h('div', { class: 'cl-chips', role: 'group', 'aria-label': T.fColor });
const moreToggle = h('button', { type: 'button', class: 'cl-b cl-link', 'aria-expanded': 'false', onclick: () => { state.moreOpen = !state.moreOpen; renderFilters(); } });
const moreBox = h('div', { class: 'cl-more', hidden: true });
const quizNote = h('div', { class: 'cl-quiznote', hidden: true });
const countEl = h('div', { class: 'cl-count', 'aria-live': 'polite' });
const rail = h('div', { class: 'cl-rail', role: 'group', 'aria-label': 'Danh sách lens' });
const emptyList = h('div', { class: 'cl-nomatch', hidden: true }, h('span', { text: T.noMatch }), ' ',
  h('button', { type: 'button', class: 'cl-b cl-link', text: T.clearFilters, onclick: () => { clearFilters(); clearQuiz(); } }));
const info = h('div', { class: 'cl-info' });
panelEls.lens.append(h('div', { class: 'cl-filterbar' }, colorRow, moreToggle), moreBox, quizNote, countEl, rail, emptyList, info);

/* --- Tab làm đẹp --- */
const beautySwitch = h('input', { type: 'checkbox', class: 'cl-switch__in', checked: true, id: 'cl-beauty-on' });
beautySwitch.checked = state.beauty.on;
beautySwitch.addEventListener('change', () => { state.beauty.on = beautySwitch.checked; sliderWrap.classList.toggle('is-off', !state.beauty.on); requestDraw(); });
const sliderWrap = h('div', { class: 'cl-sliders' });
const sliderEls = {};
[['smooth', T.smooth], ['bright', T.bright], ['glow', T.glow], ['blem', T.blemish], ['soft', T.soft]].forEach((d) => {
  const out = h('output', { class: 'cl-range__v', text: Math.round(state.beauty[d[0]] * 100) });
  const inp = h('input', { type: 'range', class: 'cl-range__in', min: '0', max: '100', step: '1', value: String(Math.round(state.beauty[d[0]] * 100)), id: 'cl-r-' + d[0] });
  inp.addEventListener('input', () => { state.beauty[d[0]] = inp.value / 100; out.textContent = inp.value; requestDraw(); });
  sliderEls[d[0]] = { inp: inp, out: out };
  sliderWrap.appendChild(h('div', { class: 'cl-range' }, h('label', { class: 'cl-range__l', for: 'cl-r-' + d[0], text: d[1] }), inp, out));
});
panelEls.beauty.append(
  h('label', { class: 'cl-switch', for: 'cl-beauty-on' }, beautySwitch, h('span', { class: 'cl-switch__ui', 'aria-hidden': 'true' }), h('span', { class: 'cl-switch__t', text: T.beautyOn })),
  h('p', { class: 'cl-hint', text: T.beautyHint }), sliderWrap,
  h('button', { type: 'button', class: 'cl-b cl-link', text: T.resetBeauty, onclick: () => {
    Object.assign(state.beauty, BEAUTY_DEFAULT);
    beautySwitch.checked = true; sliderWrap.classList.remove('is-off');
    Object.keys(sliderEls).forEach((k) => { sliderEls[k].inp.value = String(Math.round(BEAUTY_DEFAULT[k] * 100)); sliderEls[k].out.textContent = sliderEls[k].inp.value; });
    requestDraw();
  } }));

/* --- Tab gợi ý --- */
const QUIZ = [
  { id: 'look', q: 'Bạn thích lens tự nhiên hay nổi bật?', opts: [['natural', 'Tự nhiên'], ['bold', 'Nổi bật']] },
  { id: 'color', q: 'Bạn thích màu nào?', opts: facet('color').map((k) => [k, shortOf('color', k)]) },
  { id: 'border', q: 'Bạn thích lens có viền hay không viền?', opts: [['with', 'Có viền'], ['without', 'Không viền']] },
  { id: 'dilation', q: 'Bạn muốn hiệu ứng giãn tròng nhẹ hay rõ?', opts: [['soft', 'Nhẹ'], ['clear', 'Rõ']] },
  { id: 'usage', q: 'Bạn muốn dùng hàng ngày hay để trang điểm, chụp ảnh?', opts: [['daily', 'Hàng ngày'], ['makeup', 'Trang điểm, chụp ảnh']] }
];
const QUIZ_TEST = {
  look: (a, p) => (a === 'natural' ? ['natural', 'sweet', 'clear'] : ['western', 'glam']).indexOf(p.style) >= 0,
  color: (a, p) => p.color === a,
  border: (a, p) => p.border === a,
  dilation: (a, p) => (a === 'soft' ? (p.dilation === 'none' || p.dilation === 'slight') : p.dilation === 'clear'),
  usage: (a, p) => p.usage === a
};
const QUIZ_LABEL = { look: 'phong cách', color: 'màu', border: 'viền', dilation: 'giãn tròng', usage: 'mục đích' };
const guideBox = h('div', { class: 'cl-quiz' });
const guideMsg = h('p', { class: 'cl-hint', hidden: true });
function renderQuiz() {
  guideBox.textContent = '';
  QUIZ.forEach((q) => {
    if (q.opts.length < 1) { return; }
    const chips = h('div', { class: 'cl-chips cl-chips--wrap', role: 'group', 'aria-label': q.q });
    const mk = (val, text) => h('button', { type: 'button', class: 'cl-b cl-fc', 'aria-pressed': state.answers[q.id] === val ? 'true' : 'false', text: text,
      onclick: () => { state.answers[q.id] = (state.answers[q.id] === val) ? '' : val; renderQuiz(); } });
    chips.append(h('button', { type: 'button', class: 'cl-b cl-fc', 'aria-pressed': state.answers[q.id] ? 'false' : 'true', text: T.guideAny, onclick: () => { state.answers[q.id] = ''; renderQuiz(); } }));
    q.opts.forEach((o) => chips.append(mk(o[0], o[1])));
    guideBox.append(h('fieldset', { class: 'cl-q' }, h('legend', { class: 'cl-q__l', text: q.q }), chips));
  });
}
function runQuiz() {
  const order = QUIZ.map((q) => q.id).filter((id) => state.answers[id]);
  const relaxed = [];
  let active = order.slice();
  const match = (ids) => PRODUCTS.filter((p) => ids.every((id) => QUIZ_TEST[id](state.answers[id], p)));
  let list = match(active);
  while (!list.length && active.length > 1) { relaxed.unshift(active.pop()); list = match(active); }
  if (!list.length && active.length === 1) { relaxed.unshift(active.pop()); list = []; }
  if (!order.length) { clearQuiz(); showTab('lens'); return; }
  if (!list.length) { guideMsg.hidden = false; guideMsg.textContent = T.guideNone; return; }
  guideMsg.hidden = true;
  state.quiz = { ids: new Set(list.map((p) => p.id)), relaxed: relaxed };
  clearFilters(true);
  renderFilters(); renderList(); showTab('lens');
  quizNote.hidden = false; quizNote.textContent = '';
  quizNote.append(h('span', { text: relaxed.length ? T.guideRelaxed + relaxed.map((id) => QUIZ_LABEL[id]).join(', ') + '. ' : T.guideActive + ' ' }),
    h('button', { type: 'button', class: 'cl-b cl-link', text: T.guideClear, onclick: () => clearQuiz() }));
  if (list.length && !list.some((p) => state.selected && p.id === state.selected.id)) { select(list[0]); }
}
function clearQuiz() { state.quiz = null; quizNote.hidden = true; renderList(); }
panelEls.guide.append(h('p', { class: 'cl-hint', text: T.guideIntro }), guideBox, guideMsg,
  h('div', { class: 'cl-actions cl-actions--row' },
    h('button', { type: 'button', class: 'cl-b cl-btn cl-btn--primary', text: T.guideGo, onclick: runQuiz }),
    h('button', { type: 'button', class: 'cl-b cl-btn cl-btn--ghost', text: T.guideReset, onclick: () => { state.answers = {}; guideMsg.hidden = true; renderQuiz(); clearQuiz(); } })));

const panel = h('div', { class: 'cl-panel' }, tablist, panelEls.lens, panelEls.beauty, panelEls.guide);
const app = h('div', { class: 'cl-app' }, stage, panel);
root.textContent = '';
root.appendChild(app);
root.appendChild(fileInput);
root.setAttribute('data-cltryon', 'ready');

/* ---------- Bộ lọc và danh sách ---------- */
function chip(text, pressed, onclick) {
  return h('button', { type: 'button', class: 'cl-b cl-fc', 'aria-pressed': pressed ? 'true' : 'false', text: text, onclick: onclick });
}
function setFilter(key, val) { state.filters[key] = state.filters[key] === val ? '' : val; renderFilters(); renderList(); }
function clearFilters(silent) {
  FILTER_KEYS.forEach((k) => { state.filters[k] = ''; });
  if (!silent) { renderFilters(); renderList(); }
}
function activeFilterCount() { return FILTER_KEYS.filter((k) => k !== 'color' && state.filters[k]).length; }
function renderFilters() {
  colorRow.textContent = '';
  const colors = facet('color');
  if (colors.length > 1) {
    colorRow.append(chip(T.all, !state.filters.color, () => setFilter('color', state.filters.color)));
    colors.forEach((c) => colorRow.append(chip(shortOf('color', c), state.filters.color === c, () => setFilter('color', c))));
  }
  const groups = [['style', T.fStyle], ['dilation', T.fDilation], ['border', T.fBorder], ['usage', T.fUsage]].filter((g) => facet(g[0]).length > 1);
  moreToggle.hidden = !groups.length;
  const n = activeFilterCount();
  moreToggle.textContent = (state.moreOpen ? T.lessFilters : T.moreFilters) + (n ? ' (' + n + ')' : '');
  moreToggle.setAttribute('aria-expanded', state.moreOpen ? 'true' : 'false');
  moreBox.hidden = !state.moreOpen || !groups.length;
  moreBox.textContent = '';
  groups.forEach((g) => {
    const row = h('div', { class: 'cl-chips cl-chips--wrap', role: 'group', 'aria-label': g[1] });
    row.append(chip(T.all, !state.filters[g[0]], () => setFilter(g[0], state.filters[g[0]])));
    facet(g[0]).forEach((v) => row.append(chip(shortOf(g[0], v), state.filters[g[0]] === v, () => setFilter(g[0], v))));
    moreBox.append(h('div', { class: 'cl-fgroup' }, h('div', { class: 'cl-fgroup__l', text: g[1] }), row));
  });
}
function visibleList() {
  return PRODUCTS.filter((p) => {
    for (let i = 0; i < FILTER_KEYS.length; i++) { const k = FILTER_KEYS[i]; if (state.filters[k] && p[k] !== state.filters[k]) { return false; } }
    return state.quiz ? state.quiz.ids.has(p.id) : true;
  });
}
function renderList() {
  const list = visibleList();
  rail.textContent = '';
  list.forEach((p) => {
    rail.append(h('button', { type: 'button', class: 'cl-b cl-item', 'data-id': String(p.id), 'aria-pressed': state.selected && state.selected.id === p.id ? 'true' : 'false', title: p.name,
      onclick: () => select(p),
      onpointerdown: () => { if (state.renderer) { state.renderer.ensureLens(p).catch(() => {}); } } },
      h('span', { class: 'cl-item__sw' }, h('img', { src: p.swatch, alt: '', loading: 'lazy', draggable: 'false' })),
      h('span', { class: 'cl-item__name', text: p.name })));
  });
  rail.hidden = !list.length; emptyList.hidden = list.length > 0;
  countEl.textContent = list.length + '/' + PRODUCTS.length + ' lens';
}
function markRail() {
  rail.querySelectorAll('.cl-item').forEach((el) => { el.setAttribute('aria-pressed', state.selected && String(state.selected.id) === el.getAttribute('data-id') ? 'true' : 'false'); });
}

/* ---------- Thông tin sản phẩm ---------- */
function lines(text) { return String(text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }
function renderInfo() {
  const p = state.selected;
  info.textContent = '';
  if (!p) { info.append(h('p', { class: 'cl-hint', text: T.stageHint })); return; }
  const specs = p.specs || {};
  const quick = ['dia', 'gdia', 'bc'].filter((k) => specs[k]).map((k) => h('span', { class: 'cl-pill', text: T.specLabels[k] + ' ' + specs[k] }));
  const price = h('div', { class: 'cl-price' });
  if (p.price) { price.append(h('span', { class: 'cl-price__now', text: p.price })); }
  if (p.priceRegular) { price.append(h('s', { class: 'cl-price__old', text: p.priceRegular })); }
  const head = h('div', { class: 'cl-info__head' },
    p.image ? h('img', { class: 'cl-info__img', src: p.image, alt: '', loading: 'lazy' }) : null,
    h('div', { class: 'cl-info__txt' }, h('h3', { class: 'cl-info__name', text: p.name }), price, quick.length ? h('div', { class: 'cl-pills' }, quick) : null));

  const det = h('div', { class: 'cl-details', id: 'cl-details', hidden: !state.detailsOpen });
  const specKeys = SPEC_ORDER.filter((k) => specs[k]);
  if (specKeys.length) {
    const dl = h('dl', { class: 'cl-spec' });
    specKeys.forEach((k) => { dl.append(h('dt', { text: T.specLabels[k] }), h('dd', { text: specs[k] })); });
    det.append(dl);
  }
  const tags = FILTER_KEYS.filter((k) => p[k]).map((k) => h('span', { class: 'cl-pill cl-pill--soft', text: shortOf(k, p[k]) }));
  if (tags.length) { det.append(h('div', { class: 'cl-pills' }, tags)); }
  const care = lines(p.notes).concat(lines(ENV.care));
  const notice = lines(ENV.notice);
  if (care.length || notice.length) {
    const box = h('div', { class: 'cl-reassure' }, h('h4', { class: 'cl-reassure__t', text: T.reassure }));
    if (care.length) { box.append(h('ul', { class: 'cl-list' }, care.map((l) => h('li', { text: l })))); }
    notice.forEach((l) => box.append(h('p', { class: 'cl-note', text: l })));
    det.append(box);
  }
  if (p.url) { det.append(h('a', { class: 'cl-link cl-link--a', href: p.url, target: '_blank', rel: 'noopener', text: T.openProduct })); }

  const toggle = h('button', { type: 'button', class: 'cl-b cl-btn cl-btn--ghost', 'aria-expanded': state.detailsOpen ? 'true' : 'false', 'aria-controls': 'cl-details',
    text: state.detailsOpen ? T.hideDetails : T.details,
    onclick: () => { state.detailsOpen = !state.detailsOpen; renderInfo(); } });
  const actions = h('div', { class: 'cl-actions cl-actions--row' }, toggle, p.url ? h('a', { class: 'cl-b cl-btn cl-btn--primary', href: p.url, text: T.buy }) : null);
  info.append(head, actions, det);
}

/* ---------- Trạng thái ---------- */
let statusTimer = 0;
function setStatus(msg, kind, key, autoHideMs) {
  clearTimeout(statusTimer);
  state.statusKey = key || '';
  statusEl.textContent = msg; statusEl.hidden = !msg;
  statusEl.setAttribute('data-kind', kind || 'info');
  if (autoHideMs) { statusTimer = setTimeout(() => clearStatus(key), autoHideMs); }
}
function clearStatus(key) { if (!key || state.statusKey === key) { statusEl.hidden = true; statusEl.textContent = ''; state.statusKey = ''; } }

/* ---------- Dựng hình ---------- */
function ensureRenderer() {
  if (state.renderer) { return state.renderer; }
  let r = new GLRenderer(canvas);
  if (!r.ok) {
    if (r.gl) { const nc = canvas.cloneNode(false); canvas.replaceWith(nc); canvas = nc; }
    r = new Canvas2DRenderer(canvas);
    setStatus(T.noWebgl, 'info', 'gl', 9000);
  }
  r.onRestore = () => { if (state.source) { r.setSource(state.source); } if (state.selected) { select(state.selected); } requestDraw(); };
  state.renderer = r;
  r.resize(480, 640);
  return r;
}
const CAPS = [1280, 960, 720];
function fitCanvas(w, h2, cap) {
  const s = Math.min(1, cap / Math.max(w, h2));
  const cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h2 * s));
  const r = ensureRenderer();
  if (r.w !== cw || r.h !== ch) { r.resize(cw, ch); }
  masks.ratio = ch / cw;
}
function lensParamsFor(p) {
  const r = p.render || {};
  const g = (k, d) => (typeof r[k] === 'number' ? r[k] : d);
  let s = p.gdiaNum > 0 ? p.gdiaNum / HVID_MM : ({ none: 1, slight: 1.07, clear: 1.14 }[p.dilation] || 1);
  s = clamp(s * g('scale', 100) / 100, 0.9, 1.3);
  return { scale: s, opacity: g('opacity', 85) / 100, keep: g('keep', 60) / 100, pupil: g('pupil', 34) / 100, soft: g('soft', 12) / 100, sclera: g('sclera', 35) / 100, bright: g('bright', 100) / 100 };
}
async function select(p) {
  state.selected = p;
  renderInfo(); markRail();
  chipName.textContent = p.name; chipName.hidden = state.mode === 'idle';
  if (state.mode === 'idle') { return; }  // chưa có nguồn hình: chỉ cập nhật thông tin, nạp texture khi bật camera/ảnh
  const r = ensureRenderer();
  try {
    const entry = await r.ensureLens(p);
    if (state.selected !== p) { return; }
    state.active = { product: p, entry: entry, params: lensParamsFor(p) };
    clearStatus('tex');
    requestDraw();
  } catch (e) {
    if (state.selected === p) { setStatus(T.errTexture, 'error', 'tex', 5000); }
  }
}
let drawPending = false;
function requestDraw() {
  if (state.mode === 'photo' && !drawPending) { drawPending = true; requestAnimationFrame(() => { drawPending = false; draw(); }); }
}
function buildState() {
  const st = { beauty: null, masks: null, refUV: null, faceW: 0, lens: null, lensParams: null, eyes: null };
  const f = state.face;
  if (!f) { return st; }
  st.faceW = f.faceW;
  if (state.beauty.on) {
    st.beauty = state.beauty;
    drawFaceMasks(masks, f.lm);
    st.masks = masks;
    st.refUV = new Float32Array(10);
    REF_IDX.forEach((id, i) => { st.refUV[i * 2] = f.lm[id].x; st.refUV[i * 2 + 1] = f.lm[id].y; });
  }
  if (state.active) {
    const prm = state.active.params;
    st.lens = state.active.entry; st.lensParams = prm;
    st.eyes = f.eyes.map((e) => (e ? { on: e.on, cx: e.cx, cy: e.cy, r: e.r, R: e.r * prm.scale, rot: e.rot, lid17: e.lid17 } : null));
  }
  return st;
}
function draw() {
  const r = state.renderer;
  if (!r || !r.ok || !state.source) { return; }
  r.render(buildState());
}

/* ---------- Nhận diện và làm mượt ---------- */
const eyeBanks = [new OneEuroBank(32, 3.0, 0.10), new OneEuroBank(32, 3.0, 0.10)];
const irisBanks = [new OneEuroBank(2, 2.5, 0.10), new OneEuroBank(2, 2.5, 0.10)];
const radBanks = [new OneEuroBank(1, 0.8, 0.01), new OneEuroBank(1, 0.8, 0.01)];
const rotSmooth = [null, null];
const held = [null, null];
function resetFilters() {
  eyeBanks.concat(irisBanks, radBanks).forEach((b) => b.reset());
  rotSmooth[0] = rotSmooth[1] = null; held[0] = held[1] = null;
}
function computeFace(lm, W, H, t) {
  const P = (i) => [lm[i].x * W, lm[i].y * H];
  const lids = [], cents = [], met = [];
  for (let e = 0; e < 2; e++) {
    const def = EYES[e];
    const raw = new Float32Array(32);
    def.lid.forEach((id, k) => { raw[k * 2] = lm[id].x * W; raw[k * 2 + 1] = lm[id].y * H; });
    const f = eyeBanks[e].apply(raw, t);
    let sx = 0, sy = 0;
    for (let k = 0; k < 16; k++) { sx += f[k * 2]; sy += f[k * 2 + 1]; }
    cents.push([sx / 16, sy / 16]);
    const a = P(def.axis[0]), b = P(def.axis[1]);
    const ew = dist(a[0], a[1], b[0], b[1]);
    const eh = dist.apply(null, P(def.up).concat(P(def.lo)));
    met.push({ ew: ew, open: eh / Math.max(ew, 1), rot: Math.atan2(b[1] - a[1], b[0] - a[0]) });
    lids.push(f);
  }
  const ic = IRIS.map((g) => P(g.c));
  const direct = dist(ic[0][0], ic[0][1], cents[0][0], cents[0][1]) + dist(ic[1][0], ic[1][1], cents[1][0], cents[1][1]);
  const swap = dist(ic[0][0], ic[0][1], cents[1][0], cents[1][1]) + dist(ic[1][0], ic[1][1], cents[0][0], cents[0][1]);
  const map = direct <= swap ? [0, 1] : [1, 0];
  const eyes = [];
  for (let e = 0; e < 2; e++) {
    const g = IRIS[map[e]], m = met[e];
    const ring = g.ring.map(P), c = ic[map[e]];
    let r = 0.25 * (dist(ring[0][0], ring[0][1], ring[2][0], ring[2][1]) + dist(ring[1][0], ring[1][1], ring[3][0], ring[3][1]));
    r = clamp(r, 0.15 * m.ew, 0.30 * m.ew);
    let cx, cy, rr;
    if (m.open >= 0.10 || !held[e]) {
      const cf = irisBanks[e].apply(new Float32Array(c), t);
      rr = radBanks[e].apply(new Float32Array([r]), t)[0];
      cx = cf[0]; cy = cf[1];
      held[e] = { cx: cx, cy: cy, r: rr };
    } else { cx = held[e].cx; cy = held[e].cy; rr = held[e].r; }
    rotSmooth[e] = rotSmooth[e] === null ? m.rot : rotSmooth[e] + 0.3 * (m.rot - rotSmooth[e]);
    const lid17 = new Float32Array(34);
    lid17.set(lids[e]); lid17[32] = lids[e][0]; lid17[33] = lids[e][1];
    eyes.push({ cx: cx, cy: cy, r: rr, rot: rotSmooth[e], lid17: lid17, open: m.open, on: m.open > 0.05 });
  }
  return { eyes: eyes, faceW: dist.apply(null, P(234).concat(P(454))), lm: lm };
}
function onResults(res) {
  const r = state.renderer;
  if (state.warming || !r || !state.source) { return; }
  const t = performance.now() / 1000;
  const lm = res && res.multiFaceLandmarks && res.multiFaceLandmarks[0];
  if (lm && lm.length >= 478) {
    if (t - state.lastSeen > 0.6) { resetFilters(); }
    state.face = computeFace(lm, r.w, r.h, t);
    state.lastSeen = t;
    clearStatus('face');
  } else if (t - state.lastSeen > 0.18) {
    state.face = null;
    if (state.mode === 'camera' && t - state.lastSeen > 0.7) { setStatus(T.noFace, 'info', 'face'); }
  }
  draw();
}

/* ---------- MediaPipe Face Mesh (chạy trên thiết bị) ---------- */
let trackerPromise = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('script'));
    document.head.appendChild(s);
  });
}
function ensureTracker() {
  if (trackerPromise) { return trackerPromise; }
  state.trackerState = 'loading';
  if (state.mode === 'camera') { setStatus(T.loadingModel, 'info', 'model'); }
  const base = ENV.vendorUrl || '';
  trackerPromise = (async () => {
    if (!window.FaceMesh) { await loadScript(base + 'face_mesh.js'); }
    const fm = new window.FaceMesh({ locateFile: (f) => base + f });
    fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.4, minTrackingConfidence: 0.5, selfieMode: false });
    fm.onResults(onResults);
    await fm.initialize();
    // chạy thử một khung để biên dịch/khởi động sẵn đường ống, tránh khựng ở lần nhận diện đầu
    try {
      const wc = document.createElement('canvas'); wc.width = wc.height = 256;
      const wx = wc.getContext('2d'); wx.fillStyle = '#888'; wx.fillRect(0, 0, 256, 256);
      state.warming = true; await fm.send({ image: wc });
    } catch (e) { /* bỏ qua */ }
    state.warming = false;
    state.tracker = fm; state.trackerState = 'ready';
    clearStatus('model');
    return fm;
  })().catch((e) => {
    state.trackerState = 'failed'; trackerPromise = null;
    setStatus(T.errModel, 'error', 'model');
    throw e;
  });
  return trackerPromise;
}

/* ---------- Chế độ hiển thị ---------- */
function setMode(m) {
  state.mode = m;
  stage.setAttribute('data-mode', m);
  stage.classList.toggle('is-mirrored', m === 'camera' && state.mirrored);
  stage.classList.toggle('is-photo', m === 'photo');
  emptyBox.hidden = m !== 'idle';
  tools.hidden = m === 'idle' || m === 'starting';
  bar.hidden = m === 'idle' || m === 'starting';
  flipBtn.hidden = !(m === 'camera' && state.videoCount > 1);
  chipName.hidden = !(state.selected && m !== 'idle');
  const cam = m === 'camera';
  mainBtnLabel.textContent = cam ? T.stop : T.start;
  mainBtnIcon.innerHTML = cam ? ICON.stop : ICON.cam;
}

/* ---------- Camera ---------- */
function stopStream() {
  state.loopId++;
  if (state.stream) { state.stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) { /* bỏ qua */ } }); }
  state.stream = null;
  try { video.pause(); } catch (e) { /* bỏ qua */ }
  video.srcObject = null;
}
function stopCamera() {
  stopStream();
  state.face = null; state.source = null;
  clearStatus('face'); clearStatus('model');
  setMode('idle');
}
function cameraError(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') { return T.errDenied; }
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') { return T.errNotFound; }
  if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') { return T.errBusy; }
  return T.errGeneric;
}
async function openStream(facing) {
  const attempts = [
    { video: { facingMode: { ideal: facing }, width: { ideal: 960 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: true, audio: false }
  ];
  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try { return await navigator.mediaDevices.getUserMedia(attempts[i]); }
    catch (e) { lastErr = e; if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'NotReadableError')) { break; } }
  }
  throw lastErr;
}
async function startCamera() {
  if (state.mode === 'starting') { return; }
  clearStatus();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus(T.errUnsupported, 'error', 'cam'); return; }
  if (window.isSecureContext === false) { setStatus(T.errInsecure, 'error', 'cam'); return; }
  const prev = state.mode;
  stopStream();
  setMode('starting');
  setStatus(T.starting, 'info', 'cam');
  ensureRenderer();
  let stream;
  try { stream = await openStream(state.facing); }
  catch (e) { setMode(prev === 'photo' ? 'photo' : 'idle'); setStatus(cameraError(e), 'error', 'cam'); return; }
  state.stream = stream;
  const track = stream.getVideoTracks()[0];
  track.addEventListener('ended', () => { if (state.stream === stream) { stopStream(); state.face = null; setMode('idle'); setStatus(T.errLost, 'error', 'cam'); } });
  video.srcObject = stream;
  try { await video.play(); } catch (e) { /* trình duyệt có thể tự phát khi có metadata */ }
  if (!video.videoWidth) {
    await new Promise((res) => { const f = () => { video.removeEventListener('loadedmetadata', f); res(); }; video.addEventListener('loadedmetadata', f); setTimeout(f, 4000); });
  }
  if (!video.videoWidth) { stopStream(); setMode('idle'); setStatus(T.errGeneric, 'error', 'cam'); return; }
  const ts = (track.getSettings && track.getSettings()) || {};
  state.mirrored = ts.facingMode ? ts.facingMode === 'user' : state.facing === 'user';
  state.source = video;
  fitCanvas(video.videoWidth, video.videoHeight, CAPS[state.quality]);
  state.frameMs = 0; state.frameN = 0;
  resetFilters(); state.face = null; state.lastSeen = 0;
  clearStatus('cam');
  setMode('camera');
  if (state.selected) { select(state.selected); }
  navigator.mediaDevices.enumerateDevices().then((d) => {
    state.videoCount = d.filter((x) => x.kind === 'videoinput').length;
    flipBtn.hidden = !(state.mode === 'camera' && state.videoCount > 1);
  }).catch(() => {});
  if (state.trackerState === 'ready' && state.tracker && state.tracker.reset) { try { state.tracker.reset(); } catch (e) { /* bỏ qua */ } }
  ensureTracker().catch(() => {});
  runLoop();
  idle(() => { visibleList().slice(0, 6).forEach((p) => { state.renderer.ensureLens(p).catch(() => {}); }); });
}
function flipCamera() {
  state.facing = state.facing === 'user' ? 'environment' : 'user';
  startCamera();
}
/* Tự hạ độ phân giải dựng hình nếu máy xử lý chậm, để lens luôn bám kịp mắt. */
function adaptQuality(ms) {
  state.frameMs = state.frameMs ? state.frameMs * 0.9 + ms * 0.1 : ms;
  if (++state.frameN < 30 || state.quality >= CAPS.length - 1) { return; }
  if (state.frameMs > 58) {
    state.quality++; state.frameN = 0; state.frameMs = 0;
    fitCanvas(video.videoWidth, video.videoHeight, CAPS[state.quality]);
    state.renderer.setSource(video);
  }
}
function nextTick(f) {
  if (video.requestVideoFrameCallback && !document.hidden) { video.requestVideoFrameCallback(() => f()); }
  else { setTimeout(f, 33); }
}
function runLoop() {
  const id = ++state.loopId;
  const tick = async () => {
    if (id !== state.loopId || state.mode !== 'camera') { return; }
    if (!document.hidden && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const t0 = performance.now();
        state.renderer.setSource(video);   // cùng khung hình dùng để nhận diện và để hiển thị
        if (state.trackerState === 'ready') { await state.tracker.send({ image: video }); }
        else { draw(); }
        adaptQuality(performance.now() - t0);
      } catch (e) {
        if (window.console) { console.warn('[cltryon]', e); }
        state.trackerState = 'failed'; setStatus(T.errModel, 'error', 'model');
      }
    }
    if (id === state.loopId) { nextTick(tick); }
  };
  nextTick(tick);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.mode === 'camera') {
    const tr = state.stream && state.stream.getVideoTracks()[0];
    if (!tr || tr.readyState === 'ended') { stopStream(); setMode('idle'); setStatus(T.errLost, 'error', 'cam'); return; }
    try { video.play(); } catch (e) { /* bỏ qua */ }
    runLoop();
  }
});
window.addEventListener('pagehide', () => { stopStream(); });

/* ---------- Ảnh tải lên ---------- */
function readImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    im.src = url;
  });
}
async function loadPhoto(file) {
  if (!file) { return; }
  clearStatus();
  let img;
  try { img = await readImage(file); } catch (e) { setStatus(T.errImage, 'error', 'img', 6000); return; }
  stopStream();
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) { setStatus(T.errImage, 'error', 'img', 6000); return; }
  const s = Math.min(1, 1280 / Math.max(w0, h0));
  const pc = state.photoCanvas || (state.photoCanvas = document.createElement('canvas'));
  pc.width = Math.round(w0 * s); pc.height = Math.round(h0 * s);
  pc.getContext('2d').drawImage(img, 0, 0, pc.width, pc.height);
  state.mirrored = false; state.source = pc; state.face = null; state.lastSeen = 0;
  resetFilters();
  ensureRenderer(); fitCanvas(pc.width, pc.height, 1280);
  state.renderer.setSource(pc);
  setMode('photo');
  if (state.selected) { await select(state.selected); }
  draw();
  setStatus(state.trackerState === 'ready' ? '' : T.loadingModel, 'info', 'model');
  try {
    const fm = await ensureTracker();
    if (state.mode !== 'photo' || state.source !== pc) { return; }
    if (fm.reset) { fm.reset(); }
    await fm.send({ image: pc });
    clearStatus('model');
    if (!state.face) { setStatus(T.noFacePhoto, 'info', 'face'); }
  } catch (e) { /* lỗi đã được hiển thị trong ensureTracker */ }
}
fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; fileInput.value = ''; loadPhoto(f); });

/* ---------- Tải sẵn bộ nhận diện khi khách cuộn gần tới công cụ ---------- */
function preloadTracker() { ensureTracker().catch(() => {}); }
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); idle(preloadTracker); } }, { rootMargin: '300px' });
  io.observe(root);
} else { idle(preloadTracker); }

/* ---------- Khởi tạo ---------- */
renderFilters();
renderList();
renderQuiz();
renderInfo();
setMode('idle');
if (PRODUCTS.length) { select(PRODUCTS[0]); }
root.__cltryon = { state: state, draw: draw, select: select, startCamera: startCamera, loadPhoto: loadPhoto };
})();
