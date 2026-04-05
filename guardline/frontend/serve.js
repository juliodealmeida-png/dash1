const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const dir = __dirname;
const PORT = 8091;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  // Strip query string and hash
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname || '/');

  // Default to guardline dashboard
  if (pathname === '/' || pathname === '') {
    pathname = '/guardline.html';
  }
  // Julio widget shortcut
  if (pathname === '/julio' || pathname === '/widget') {
    pathname = '/julio-chat-widget.html';
  }

  const filePath = path.join(dir, pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Julio widget server running at http://localhost:' + PORT);
});
