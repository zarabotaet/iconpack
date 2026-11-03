// Статика из dist/ на 0.0.0.0:8080 (https://test.bomji.org)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './compose.mjs';
const types = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, 'dist', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(d);
  });
}).listen(8080, '0.0.0.0', () => console.log('http://0.0.0.0:8080'));
