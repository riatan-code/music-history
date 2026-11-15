// Minimal static server. YouTube embeds refuse to play from file://, so serve over http.
// usage: node server.js  →  http://localhost:5173
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let file = path.normalize(path.join(root, urlPath === "/" ? "index.html" : urlPath));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    /* no-store: edits to js/css show up on a normal reload, without a stale browser cache */
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}).listen(port, () => console.log(`http://localhost:${port}`));
