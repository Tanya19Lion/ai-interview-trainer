const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/public') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('public');
    return;
  }
  if (req.url === '/private') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('private');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
