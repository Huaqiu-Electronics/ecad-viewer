/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { bundle } from "./bundle.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const APP_DIR = resolve(ROOT_DIR, "packages/ecad-viewer-app");
export const ENTRY = resolve(APP_DIR, "src/index.ts");

let { context } = await bundle({
    entryPoints: {
        "ecad-viewer": ENTRY,
        "parser.worker": resolve(APP_DIR, "src/kicanvas/parser.worker.ts"),
    },
    outdir: resolve(APP_DIR, "static/ecad_viewer"),
    sourcemap: true,
    define: {
        DEBUG: "true",
    },
    resolveExtensions: [".ts", ".js"],
    alias: {
        "kicad-parser": resolve(ROOT_DIR, "packages/kicad-parser/src"),
    },
});

await context.watch();

let { host, port } = await context.serve({
    servedir: resolve(APP_DIR, "static"),
    host: "127.0.0.1",
    port: 8081,
});

console.log(`[serve] listening at http://${host}:${port}`);
console.log(`[serve] open http://127.0.0.1:${port} for localhost preview`);
