// node lib/render-part.mjs <file.svg> [theme] → dist/parts/<name>.svg + .png (для просмотра деталей и концептов)
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ROOT, expandLimbs, applyTheme } from './compose.mjs';
const [file, theme = 'cyan'] = process.argv.slice(2);
const S = JSON.parse(fs.readFileSync(`${ROOT}/style.json`));
const th = JSON.parse(fs.readFileSync(`${ROOT}/themes/${theme}.json`));
let svg = fs.readFileSync(file, 'utf8');
svg = svg.replace(/<svg([^>]*)>/, `<svg$1 xmlns="http://www.w3.org/2000/svg"><g stroke-width="${S.stroke}" stroke-linecap="round" stroke-linejoin="round">`).replace(/<\/svg>\s*$/, '</g></svg>');
svg = applyTheme(expandLimbs(svg, S.stroke), th);
const name = path.basename(file, '.svg'), out = `${ROOT}/dist/parts`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/${name}.svg`, svg);
fs.writeFileSync(`${out}/${name}.png`, new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, background: '#ffffff' }).render().asPng());
console.log(`${out}/${name}.png`);
