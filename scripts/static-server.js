const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split('?')[0]);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(data);
  });
});

let port = 8765;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 8785) {
    console.log(`Port ${port} is in use. Trying the next port...`);
    port++;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error(`Server could not start: ${error.message}`);
  process.exitCode = 1;
});
server.on('listening', () => {
  console.log(`Local preview: http://127.0.0.1:${port}/`);
  console.log('Press Ctrl+C in this terminal to stop the server.');
});
server.listen(port, '127.0.0.1');
