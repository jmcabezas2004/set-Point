#!/usr/bin/env node
/* Servidor local y gratuito para el Extractor de ADN de marca.
   - Sirve la app (y el resto del repo) en http://localhost:8080/adn/
   - /api/fetch?url=… descarga una web desde tu ordenador, para que el
     navegador pueda leerla sin bloqueos CORS ni servicios externos.
   Uso:  node adn/server.js   (Node 18 o superior, sin dependencias) */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

async function proxy(req, res, target) {
  let u;
  try { u = new URL(target); } catch { return send(res, 400, "URL no válida"); }
  if (!/^https?:$/.test(u.protocol)) return send(res, 400, "Solo http/https");
  try {
    const r = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,text/css,image/*,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return send(res, 413, "Recurso demasiado grande");
    res.writeHead(r.status, {
      "Content-Type": r.headers.get("content-type") || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    res.end(buf);
  } catch (e) {
    send(res, 502, "No se pudo descargar: " + e.message);
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/ping") return send(res, 200, JSON.stringify({ ok: true }), "application/json");
  if (url.pathname === "/api/fetch") return proxy(req, res, url.searchParams.get("url") || "");

  let p = decodeURIComponent(url.pathname);
  if (p === "/") { res.writeHead(302, { Location: "/adn/" }); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const file = path.resolve(ROOT, "." + p);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, "Prohibido");
  fs.readFile(file, (err, data) => {
    if (err) {
      if (!path.extname(file)) { res.writeHead(302, { Location: p + "/" }); return res.end(); }
      return send(res, 404, "No encontrado");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Extractor de ADN de marca listo en  http://localhost:${PORT}/adn/\n  (Ctrl+C para parar)\n`);
});
