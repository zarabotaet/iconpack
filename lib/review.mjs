// node lib/review.mjs <pack> <id> → лист проверки dist/<pack>/review/<id>.png + снимок в history/<id>/vN.png
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import { ROOT } from './compose.mjs';
const [pack, id] = process.argv.slice(2);
execFileSync(process.execPath, [`${ROOT}/lib/scene.mjs`, pack, id], { stdio: 'inherit' });
const src = (t) => fs.readFileSync(`${ROOT}/dist/${pack}/${t}/${id}.svg`, 'utf8');
const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();
const uri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const big = png(src('cyan'), 960);
const thumb = png(src('cyan'), 120);
const others = ['indigo', 'green', 'violet'].map((t) => png(src(t), 240));
// предупреждения: неизвестные детали и цвета вне токенов
const scene = fs.readFileSync(`${ROOT}/packs/${pack}/scenes/${id}.svg`, 'utf8');
const parts = fs.readdirSync(`${ROOT}/packs/${pack}/parts`).map((f) => fs.readFileSync(`${ROOT}/packs/${pack}/parts/${f}`, 'utf8')).join('');
const warn = [];
for (const m of scene.matchAll(/<part[^>]*id="([^"]+)"/g)) if (!parts.includes(`id="${m[1]}"`)) warn.push(`нет детали ${m[1]}`);
for (const m of (scene + parts).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]+)"/g)) warn.push(`цвет вне токенов ${m[1]}`);
// контраст кота с акцентом темы: кот не должен сливаться с машиной и ошейником
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
for (const f of fs.readdirSync(`${ROOT}/themes`)) {
  const th = JSON.parse(fs.readFileSync(`${ROOT}/themes/${f}`)), a = rgb(th.acc), b = rgb(th.fur);
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  if (d < 120) warn.push(`гамма ${f}: акцент ${th.acc} слишком близок к шерсти кота ${th.fur} (Δ=${d.toFixed(0)}, нужно ≥120)`);
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="740" viewBox="0 0 1240 740"><rect width="1240" height="740" fill="#e9e9ee"/>
<image x="10" y="10" width="960" height="720" href="${uri(big)}"/>
<rect x="985" y="10" width="245" height="180" fill="#fff"/><image x="1047" y="55" width="120" height="90" href="${uri(thumb)}"/>
${others.map((b, i) => `<image x="985" y="${200 + i * 182}" width="240" height="180" href="${uri(b)}"/>`).join('')}</svg>`;
const outDir = `${ROOT}/dist/${pack}/review`, hist = `${ROOT}/dist/${pack}/history/${id}`;
fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(hist, { recursive: true });
const sheetPng = new Resvg(sheet).render().asPng();
fs.writeFileSync(`${outDir}/${id}.png`, sheetPng);
const n = fs.readdirSync(hist).length;
fs.writeFileSync(`${hist}/v${n}.png`, png(src('cyan'), 480));
console.log(`${outDir}/${id}.png  (версия v${n})`, warn.length ? '\n⚠ ' + [...new Set(warn)].join('\n⚠ ') : '');
