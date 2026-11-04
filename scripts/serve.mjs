import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.md': 'text/plain; charset=utf-8' };
const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);
        let path = resolve(root, `.${pathname}`);
        const local = relative(root, path);
        if (local.startsWith(`..${sep}`) || local === '..' || local.split(sep).some((part) => part.startsWith('.'))) {
            response.writeHead(403).end('Forbidden');
            return;
        }
        if ((await stat(path)).isDirectory()) {
            if (!url.pathname.endsWith('/')) {
                response.writeHead(302, { Location: `${url.pathname}/${url.search}` }).end();
                return;
            }
            path = resolve(path, 'index.html');
        }
        const content = await readFile(path);
        response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        response.end(content);
    } catch {
        response.writeHead(404).end('Not found');
    }
});
server.listen(4173, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:4173/latex-to-pdf/'));
