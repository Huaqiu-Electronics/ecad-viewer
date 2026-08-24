import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "build");
const port = process.env.PORT ?? 8770;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".kicad_sch": "text/plain; charset=utf-8",
    ".kicad_pcb": "text/plain; charset=utf-8",
    ".kicad_mod": "text/plain; charset=utf-8",
    ".kicad_sym": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
    try {
        let urlPath = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);
        if (urlPath === "/") urlPath = "/index.html";
        const filePath = normalize(join(root, urlPath));
        if (!filePath.startsWith(root)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }
        const data = await readFile(filePath);
        const mime = MIME[extname(filePath)] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(port, () => {
    console.log(`Mini integration served at http://localhost:${port}/`);
});
