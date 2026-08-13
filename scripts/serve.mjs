import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const publicFiles = new Set([
  'index.html',
  'controls.html',
  'developers.html',
  'maps.html',
  'ranking.html',
  'serverinfo.html',
  'wiki.html',
  'manifest.json',
  'sw.js',
]);
const publicDirectories = new Set([
  'asset',
  'controls',
  'developer',
  'map',
  'screenshot',
  'wiki',
]);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const relative = normalize(pathname).replace(/^([/\\])+/, '') || 'index.html';
  const segments = relative.split(/[/\\]+/);
  if (segments.some(segment => segment.startsWith('.'))) return null;
  if (!publicFiles.has(relative) && !publicDirectories.has(segments[0])) return null;
  const absolute = resolve(join(root, relative));
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) return null;
  return absolute;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    let file = resolveRequestPath(request.url || '/');
    if (!file) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');

    const body = await readFile(file);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Min. At. Zero dev server: http://${host}:${port}`);
});
