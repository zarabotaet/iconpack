// node lib/page.mjs <pack> → dist/index.html: сцены с переключателем гамм, журнал доработки, история версий
import fs from 'node:fs';
import { ROOT } from './compose.mjs';
const pack = process.argv[2] || 'cars';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const md = (s) => esc(s).replace(/^# (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h4>$1</h4>')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/\n\n/g, '<br>');
const { themes, scenes } = JSON.parse(fs.readFileSync(`${ROOT}/dist/${pack}/scenes.json`));
const themeVals = Object.fromEntries(themes.map((t) => [t, JSON.parse(fs.readFileSync(`${ROOT}/themes/${t}.json`))]));
// SVG встраивается в страницу; id получают префикс сцены, чтобы не конфликтовать между сценами
const inline = (id) => fs.readFileSync(`${ROOT}/dist/${pack}/vars/${id}.svg`, 'utf8')
  .replace(/id="([^"]+)"/g, `id="${id}-$1"`).replace(/(href="#|url\(#)([^")]+)/g, `$1${id}-$2`)
  // var() в атрибутах fill/stroke поддерживают не все браузеры — переносим в style
  .replace(/<([\w]+)([^>]*?)(\/?)>/g, (m, tag, a, sl) => {
    const st = [];
    a = a.replace(/\s(fill|stroke)="(var\([^"]+\))"/g, (_, k, v) => (st.push(`${k}:${v}`), ''));
    return st.length ? `<${tag}${a} style="${st.join(';')}"${sl}>` : m;
  });
const cards = scenes.map((id) => {
  const log = fs.existsSync(`${ROOT}/packs/${pack}/scenes/${id}.md`) ? fs.readFileSync(`${ROOT}/packs/${pack}/scenes/${id}.md`, 'utf8') : '';
  const hist = fs.existsSync(`${ROOT}/dist/${pack}/history/${id}`) ? fs.readdirSync(`${ROOT}/dist/${pack}/history/${id}`).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))) : [];
  return `<section><div class="scene">${inline(id)}</div>
  <details><summary>Журнал доработки (${(log.match(/^## Проход/gm) || []).length} проходов)</summary><div class="log">${md(log)}</div></details>
  <details><summary>История версий (${hist.length})</summary><div class="hist">${hist.map((h) => `<figure><img src="${pack}/history/${id}/${h}"><figcaption>${h.replace('.png', '')}</figcaption></figure>`).join('')}</div></details></section>`;
}).join('\n');
fs.writeFileSync(`${ROOT}/dist/index.html`, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Кот-талисман: сцены</title>
<style>body{font:15px/1.5 system-ui;margin:24px;background:#f6f6f8;color:#222;max-width:1400px}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:20px}section{background:#fff;border-radius:16px;padding:10px}
img{width:100%;display:block;border-radius:10px}.hist{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}figure{margin:0}figcaption{font-size:12px;color:#777}
.row{display:flex;gap:8px;margin:12px 0}button{font:inherit;padding:6px 14px;border-radius:20px;border:1px solid #ccc;background:#fff;cursor:pointer}button.on{background:#222;color:#fff}
.scene svg{width:100%;height:auto;display:block;border-radius:10px}.log h3{margin:6px 0}.log h4{margin:10px 0 2px}.log li{margin-left:16px}summary{cursor:pointer;margin-top:8px;color:#555}</style>
<h1>Пак «Кот-талисман»: сцены</h1>
<p>Каждая сцена прошла до 5 проходов доработки по протоколу: идея и композиция → масштаб → поза и эмоция → чистота линий → цвет.</p>
<div class="row" id="t"></div><div class="g">${cards}</div>
<details style="margin-top:30px"><summary>Кот и брелки</summary><img src="parts/cat-sheet-cyan.svg"><img src="parts/charms.svg"></details>
<script>const V=${JSON.stringify(themeVals)},t=document.getElementById('t');
// меняем только CSS-переменные цветов: картинки не перезагружаются
function show(th){for(const [k,v] of Object.entries(V[th]))document.body.style.setProperty('--'+k,v);[...t.children].forEach(b=>b.className=b.textContent==th?'on':'')}
Object.keys(V).forEach(n=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>show(n);t.append(b)});show('cyan');</script>`);
console.log('dist/index.html');
