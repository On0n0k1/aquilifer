// Minimal static server for the e2e test page (SPEC §11) — deliberately no
// extra dependency (e.g. `serve`), since one plain HTML file doesn't need
// one. Extensions only inject into real http(s) origins, not file:// pages
// (Chrome requires an explicit user opt-in for file:// access), so a real
// local server is necessary, not just opening the HTML file directly.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, 'pages');
const port = process.env.PORT ? Number(process.env.PORT) : 4415;

const server = http.createServer((req, res) => {
  const requestPath = req.url === '/' ? '/test-page.html' : (req.url ?? '');
  const filePath = path.join(root, requestPath);

  // Never serve outside `pages/` — req.url is attacker-controlled input if
  // this server were ever reachable beyond localhost test runs.
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`E2E test server listening on http://localhost:${port}`);
});
