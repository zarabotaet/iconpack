// node lib/contact.mjs <pack> <out.png> id… → сетка 2×N сцен (тема cyan) для быстрого обзора пачки
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { ROOT } from './compose.mjs';
const [pack, out, ...ids] = process.argv.slice(2);
const W = 480, H = 360, G = 8, cols = 2, rows = Math.ceil(ids.length / cols);
const cells = ids.map((id, i) => {
  const png = new Resvg(fs.readFileSync(`${ROOT}/dist/${pack}/cyan/${id}.svg`, 'utf8'), { fitTo: { mode: 'width', value: W } }).render().asPng();
  return `<image x="${(i % cols) * (W + G)}" y="${Math.floor(i / cols) * (H + G)}" width="${W}" height="${H}" href="data:image/png;base64,${png.toString('base64')}"/>`;
}).join('');
const w = cols * W + G, h = rows * (H + G);
fs.writeFileSync(out, new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#888"/>${cells}</svg>`).render().asPng());
console.log(out);
