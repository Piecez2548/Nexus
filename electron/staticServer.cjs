const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// A tiny local-only static server for the packaged build. Electron's
// file:// protocol can't support react-router's BrowserRouter (client-side
// paths like /transactions have no matching file on disk), so we serve the
// built app over http://localhost instead, with an index.html fallback for
// any path that doesn't match a real file — the same SPA-hosting behavior
// `vite preview` or any production static host provides.
function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    const requestedPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const resolved = path.join(rootDir, requestedPath);

    const filePath = resolved.startsWith(rootDir) ? resolved : path.join(rootDir, "index.html");

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(rootDir, "index.html"), (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            res.writeHead(500);
            res.end("Failed to load app");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(fallbackData);
        });
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = createStaticServer(rootDir);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { startStaticServer };
