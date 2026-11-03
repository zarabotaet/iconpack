// Сборка сцены: описание (YAML) + детали (персонаж, глифы) + style.json → SVG с цветовыми токенами.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const TOKENS = ['ink', 'paper', 'mute', 'mute2', 'dark', 'skin', 'hair', 'acc', 'acc-d', 'acc-l', 'tint', 'alt', 'fur', 'fur-d', 'cream', 'nose', 'fur-s', 'eye', 'gold', 'bow'];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- утилиты ----------
function rng(seedStr) {
  let h = 1779033703;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const f = (n) => +n.toFixed(1);

function svgInner(src) {
  const m = src.match(/<svg([^>]*)>([\s\S]*)<\/svg>/);
  if (!m) throw new Error('not an svg part');
  const attrs = Object.fromEntries([...m[1].matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((a) => [a[1], a[2] ?? a[3]]));
  return { attrs, inner: m[2] };
}

// <limb d="..." w="14" fill="skin"/> → трубка с обводкой (две линии одной траектории)
export function expandLimbs(s, sw) {
  return s.replace(/<limb\s+([^>]*?)\/>/g, (_, a) => {
    const at = Object.fromEntries([...a.matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    const w = +(at.w || 14), fill = at.fill || 'skin';
    return `<path d="${at.d}" fill="none" stroke="ink" stroke-width="${w}"/>` +
      `<path d="${at.d}" fill="none" stroke="${fill}" stroke-width="${f(w - 2 * sw)}"/>`;
  });
}

// ---------- глифы ----------
const glyphCache = {};
function glyph(name, cx, cy, size, sw) {
  if (!name) return '';
  glyphCache[name] ??= svgInner(read(`glyphs/${name}.svg`)).inner;
  const k = size / 48;
  return `<g transform="translate(${f(cx - size / 2)} ${f(cy - size / 2)}) scale(${+k.toFixed(3)})" stroke-width="${f(sw / k)}">${expandLimbs(glyphCache[name], sw)}</g>`;
}

// ---------- фон-пятно ----------
function blob(cx, cy, rx, ry, S, rand) {
  const n = S.blob.points, pts = [];
  const a0 = rand() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const r = 1 + (rand() * 2 - 1) * S.blob.jitter;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return { d: d + 'Z', pts };
}
const sparkle = (x, y, r) =>
  `<path d="M${f(x)} ${f(y - r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x - r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - r)}Z" fill="acc-d"/>`;

// ---------- доска и атомы интерфейса ----------
const FIXED = new Set(['card', 'dash', 'button']);
function atom(it, x, y, w, h, ctx) {
  const { S, sw } = ctx, r = S.radius;
  const kind = Object.keys(it).find((k) => ['card', 'dash', 'button', 'link', 'lines', 'block', 'space'].includes(k));
  const v = it[kind];
  switch (kind) {
    case 'card': {
      let bg = it.bg || 'mute', out = '';
      if (bg === 'checker') { ctx.defs.add('checker'); bg = 'url(#checker)'; }
      if (bg === 'split') {
        out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="alt"/>`;
        out += `<path d="M${f(x)} ${f(y + h / 2)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h / 2)}Z" fill="acc"/>`;
        out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="none" stroke="ink"/>`;
      } else out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="${bg}" stroke="ink"/>`;
      if (it.lines) out += lines(x + w * 0.18, y + h * 0.2, w * 0.64, h * 0.6, it.lines, 'paper');
      out += glyph(typeof v === 'string' ? v : null, x + w / 2, y + h / 2, Math.min(w, h) * 0.72, sw);
      return out;
    }
    case 'dash': {
      let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="none" stroke="ink" stroke-dasharray="4 5"/>`;
      if (v === 'dot') out += `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(Math.min(w, h) * 0.22)}" fill="acc" stroke="ink"/>`;
      else if (v === 'lines') out += lines(x + w * 0.15, y + h * 0.25, w * 0.7, h * 0.5, 3, 'mute2');
      else out += glyph(v, x + w / 2, y + h / 2, Math.min(w, h) * 0.66, sw);
      return out;
    }
    case 'button':
      return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="${it.bg || 'acc'}" stroke="ink"/>` +
        glyph(v, x + w / 2, y + h / 2, Math.min(w, h) * 0.78, sw);
    case 'link': {
      const cy = y + h / 2, n = Math.max(2, Math.floor((w - 8) / 7));
      let out = '';
      for (let i = 0; i < n; i++) out += `<circle cx="${f(x + 4 + i * 7)}" cy="${f(cy)}" r="1.5" fill="mute2"/>`;
      return out + `<circle cx="${f(x + w - 3)}" cy="${f(cy)}" r="2.4" fill="ink"/>`;
    }
    case 'lines': return lines(x, y + h * 0.15, w, h * 0.7, v, 'mute2');
    case 'block':
      return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="mute"/>` +
        lines(x + w * 0.15, y + h * 0.22, w * 0.7, h * 0.56, v, 'mute2');
    default: return '';
  }
}
function lines(x, y, w, h, n, color) {
  n = +n || 3;
  const step = n > 1 ? h / (n - 1) : 0, sw = Math.min(4, Math.max(2, step * 0.45));
  let out = '';
  for (let i = 0; i < n; i++) {
    const ww = i === n - 1 && n > 1 ? w * 0.6 : w;
    out += `<path d="M${f(x)} ${f(y + i * step)} H${f(x + ww)}" stroke="${color}" stroke-width="${f(sw)}"/>`;
  }
  return out;
}

function board(rect, spec, ctx) {
  const { S } = ctx, [x, y, w, h] = rect, r = S.radius + 2, H = S.header;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h + 20}" rx="${r}" fill="paper" stroke="ink"/>`;
  out += `<path d="M${x} ${y + H} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + H}Z" fill="acc" stroke="ink"/>`;
  for (let i = 0; i < 3; i++) out += `<circle cx="${x + w - 14 - i * 8}" cy="${y + H / 2}" r="2" fill="paper"/>`;
  const rows = spec.rows || [];
  const P = S.pad, G = S.gap, cx = x + P, cw = w - 2 * P;
  const top = y + H + P, avail = h - H - 2 * P - G * (rows.length - 1);
  const wsum = rows.reduce((s, rw) => s + (rw.h || 1), 0);
  let yy = top;
  for (const row of rows) {
    const rh = (avail * (row.h || 1)) / wsum;
    const items = row.items || [];
    let fixedW = items.map((it) => (FIXED.has(Object.keys(it)[0]) ? rh * (it.w || 1) : 0));
    const nflex = items.filter((it, i) => !fixedW[i]).length;
    // гибким элементам оставляем минимум 36px каждому, иначе ужимаем фиксированные
    const room = cw - G * (items.length - 1) - nflex * 36, sum = fixedW.reduce((a, b) => a + b, 0);
    if (sum > room) fixedW = fixedW.map((v) => (v * room) / sum);
    const cellH = Math.min(rh, ...fixedW.filter(Boolean).map((v, i) => v));
    const free = cw - fixedW.reduce((a, b) => a + b, 0) - G * (items.length - 1);
    const flexW = nflex ? free / nflex : 0;
    let xx = cx + (nflex ? 0 : free / 2), centers = [];
    for (const [i, it] of items.entries()) {
      const iw = fixedW[i] || flexW;
      out += atom(it, xx, yy, iw, rh, ctx);
      centers.push(xx + iw / 2);
      xx += iw + G;
    }
    if (row.connect && centers.length > 1) {
      const a = centers[0], b = centers.at(-1), ty = yy - G / 2 - 1;
      out += `<path d="M${f(a)} ${f(yy)} V${f(ty)} H${f(b)} V${f(yy)}" fill="none" stroke="ink" stroke-width="1.4" stroke-dasharray="3 4"/>`;
      out += `<circle cx="${f(b)}" cy="${f(ty - 4)}" r="2.4" fill="ink"/>`;
    }
    yy += rh + G;
  }
  return out;
}

// ---------- значок справа внизу ----------
function badge(name, ctx) {
  const tile = (x, y, s, g) =>
    `<rect x="${x + 2}" y="${y + 3}" width="${s}" height="${s}" rx="7" fill="ink" opacity=".18" stroke="none"/>` +
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="7" fill="paper" stroke="ink"/>` +
    `<rect x="${x + 4}" y="${y + 4}" width="${s - 8}" height="${s - 8}" rx="4" fill="acc-d"/>` + glyph(g, x + s / 2, y + s / 2, (s - 8) * 0.8, ctx.sw);
  return tile(374, 222, 30, name) + tile(390, 190, 44, name);
}

// ---------- сцена ----------
export function loadScene(pack, id) {
  return YAML.parse(read(`packs/${pack}/scenes/${id}.yaml`));
}

export function compose(pack, sceneId) {
  const S = JSON.parse(read('style.json')), sw = S.stroke;
  const sc = loadScene(pack, sceneId);
  const pose = svgInner(read(`packs/${pack}/character/${sc.pose}.svg`));
  const rect = pose.attrs['data-board'].split(/\s+/).map(Number);
  const anchors = JSON.parse(pose.attrs['data-anchors'] || '{}');
  const layer = (id) => (pose.inner.match(new RegExp(`<g id="${id}">([\\s\\S]*?)</g><!--/${id}-->`)) || [])[1] || '';
  const ctx = { S, sw, defs: new Set() };
  const rand = rng(sceneId + (sc.seed ?? ''));
  const cut = S.canvas.cutY;

  const b = blob(185, 150, 168, 118, S, rand);
  let back = `<path d="${b.d}" fill="tint"/>`;
  let front = '';
  for (const d of sc.decor || []) {
    const name = typeof d === 'string' ? d : Object.keys(d)[0];
    const at = (typeof d === 'object' && d[name]) || anchors[name];
    if (!at) continue;
    if (name === 'sparkles') continue;
    const [gx, gy, gs = 70] = at;
    const g = glyph(name, gx, gy, gs, sw);
    if (name === 'plant') front += g; else back += g;
  }
  if ((sc.decor || []).includes('sparkles')) {
    for (let i = 0; i < S.sparkles; i++) {
      const p = b.pts[Math.floor(rand() * b.pts.length)];
      const x = p[0] + (rand() - 0.5) * 50, y = Math.min(cut - 20, p[1] + (rand() - 0.5) * 40);
      front += i % 2 ? sparkle(x, y, 3 + rand() * 3) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + rand())}" fill="acc-d"/>`;
    }
  }

  let body = back + expandLimbs(layer('back'), sw) + board(rect, sc.board || {}, ctx) + expandLimbs(layer('front'), sw) + front;
  let defs = `<clipPath id="cut"><rect width="370" height="${cut}"/></clipPath>`;
  if (ctx.defs.has('checker'))
    defs += `<pattern id="checker" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="paper"/><path d="M0 0h5v5H0zM5 5h5v5H5z" fill="mute"/></pattern>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S.canvas.w} ${S.canvas.h}">` +
    `<defs>${defs}</defs><g stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">` +
    `<g clip-path="url(#cut)">${body}</g>${sc.badge ? badge(sc.badge, ctx) : ''}</g></svg>`;
}

// токены → var(--tok,#hex) либо → #hex
export function applyTheme(svg, theme, mode = 'hex') {
  return svg.replace(/(fill|stroke)="([\w-]+)"/g, (m, attr, tok) => {
    if (!TOKENS.includes(tok)) return m;
    return `${attr}="${mode === 'vars' ? `var(--${tok},${theme[tok]})` : theme[tok]}"`;
  });
}
