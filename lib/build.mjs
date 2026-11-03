// node lib/build.mjs [pack] [sceneId…]  → dist/<pack>/{vars,<theme>}/*.svg + png/<theme>/*.png
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ROOT, compose, applyTheme } from './compose.mjs';

export function build(pack = 'demo', only = [], { png = true } = {}) {
  const themes = Object.fromEntries(fs.readdirSync(`${ROOT}/themes`).map((t) => [t.replace('.json', ''), JSON.parse(fs.readFileSync(`${ROOT}/themes/${t}`))]));
  const ids = only.length ? only : fs.readdirSync(`${ROOT}/packs/${pack}/scenes`).filter((s) => s.endsWith('.yaml')).map((s) => s.replace('.yaml', ''));
  const out = `${ROOT}/dist/${pack}`, def = Object.keys(themes)[0];
  const errors = [];
  for (const id of ids) {
    let svg;
    try { svg = compose(pack, id); } catch (e) { errors.push(`${id}: ${e.message}`); continue; }
    fs.mkdirSync(`${out}/vars`, { recursive: true });
    fs.writeFileSync(`${out}/vars/${id}.svg`, applyTheme(svg, themes[def], 'vars'));
    for (const [t, th] of Object.entries(themes)) {
      const hex = applyTheme(svg, th);
      fs.mkdirSync(`${out}/${t}`, { recursive: true });
      fs.writeFileSync(`${out}/${t}/${id}.svg`, hex);
      if (png) {
        fs.mkdirSync(`${out}/png/${t}`, { recursive: true });
        fs.writeFileSync(`${out}/png/${t}/${id}.png`, new Resvg(hex, { fitTo: { mode: 'width', value: 880 }, background: '#3a3a3a' }).render().asPng());
      }
    }
  }
  fs.writeFileSync(`${out}/manifest.json`, JSON.stringify({ themes, scenes: fs.readdirSync(`${out}/vars`).map((s) => s.replace('.svg', '')) }));
  return { ids, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [pack, ...ids] = process.argv.slice(2);
  const r = build(pack, ids);
  console.log(`built ${r.ids.length - r.errors.length}/${r.ids.length}`, r.errors.join('\n'));
}
