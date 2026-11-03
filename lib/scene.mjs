// Сборка сцен пака: node lib/scene.mjs <pack> [id…]
// Сцена — packs/<pack>/scenes/<id>.svg: <bg/> + <part id x y s/> + обычный SVG.
// Детали — все packs/<pack>/parts/*.svg (их содержимое уходит в <defs>).
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { ROOT, expandLimbs, applyTheme } from './compose.mjs';

const FACE = { 'cat-keys': 'wink', 'cat-drive': 'happy' }; // эмоция по умолчанию для позы
const W = 480, H = 360, FLOOR = 320;
const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

// Фон «Офис/витрина» (стиль B): прямоугольные окна, линия пола, табличка
function bgOffice(a) {
  const n = +(a.windows ?? 4), x0 = +(a.x ?? 40);
  let s = '';
  for (let i = 0; i < n; i++) s += `<rect x="${x0 + i * 84}" y="40" width="70" height="${FLOOR - 70}" rx="10" fill="tint"/>`;
  s += `<path d="M14 ${FLOOR} H${W - 14}" stroke="ink"/><path d="M60 ${FLOOR + 14} H160 M300 ${FLOOR + 14} H420" stroke="mute2" stroke-width="3"/>`;
  if (a.sign) {
    const [sx, sy] = a.sign.split(',').map(Number);
    s += `<g transform="translate(${sx} ${sy})"><rect width="64" height="40" rx="8" fill="acc" stroke="ink"/><path d="M12 14 H52 M12 26 H38" stroke="paper" stroke-width="4"/></g>`;
  }
  return s;
}

export function buildScene(pack, id, sw) {
  const parts = fs.readdirSync(`${ROOT}/packs/${pack}/parts`).filter((f) => f.endsWith('.svg'))
    .map((f) => fs.readFileSync(`${ROOT}/packs/${pack}/parts/${f}`, 'utf8').replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')).join('\n');
  let body = fs.readFileSync(`${ROOT}/packs/${pack}/scenes/${id}.svg`, 'utf8').replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '');
  body = body.replace(/<bg\s*([^>]*)\/>/g, (_, a) => bgOffice(attrs(a)));
  body = body.replace(/<part\s+([^>]*)\/>/g, (_, a) => {
    const p = attrs(a), s = +(p.s ?? 1), fx = p.flip ? -1 : 1;
    const use = (href) => `<use href="#${href}" transform="translate(${p.x ?? 0} ${p.y ?? 0}) scale(${s * fx} ${s})" stroke-width="${+(sw / s).toFixed(2)}"/>`;
    // позы кота без лица: лицо подставляется отдельно (face="happy|smug|wink|…")
    const face = p.id.startsWith('cat-') ? p.face || FACE[p.id] || 'smug' : null;
    return use(p.id) + (face ? use(`face-${face}`) : '');
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs>${expandLimbs(parts, sw)}<clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath></defs>` +
    `<g stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#frame)"><rect width="${W}" height="${H}" fill="paper"/>${expandLimbs(body, sw)}</g></svg>`;
}

const [pack = 'cars', ...only] = process.argv.slice(2);
const sw = JSON.parse(fs.readFileSync(`${ROOT}/style.json`)).stroke;
const themes = Object.fromEntries(fs.readdirSync(`${ROOT}/themes`).map((t) => [t.replace('.json', ''), JSON.parse(fs.readFileSync(`${ROOT}/themes/${t}`))]));
const ids = only.length ? only : fs.readdirSync(`${ROOT}/packs/${pack}/scenes`).filter((f) => f.endsWith('.svg')).map((f) => f.replace('.svg', '')).sort();
const out = `${ROOT}/dist/${pack}`;
for (const id of ids) {
  const svg = buildScene(pack, id, sw);
  fs.mkdirSync(`${out}/vars`, { recursive: true });
  fs.writeFileSync(`${out}/vars/${id}.svg`, applyTheme(svg, themes.cyan, 'vars'));
  for (const [t, th] of Object.entries(themes)) {
    fs.mkdirSync(`${out}/${t}`, { recursive: true });
    const hex = applyTheme(svg, th);
    fs.writeFileSync(`${out}/${t}/${id}.svg`, hex);
    if (t === 'cyan') fs.writeFileSync(`${out}/${id}.png`, new Resvg(hex, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
  }
}
fs.writeFileSync(`${out}/scenes.json`, JSON.stringify({ themes: Object.keys(themes), scenes: fs.readdirSync(`${out}/vars`).map((f) => f.replace('.svg', '')).sort() }));
console.log('built', ids.join(', '));
