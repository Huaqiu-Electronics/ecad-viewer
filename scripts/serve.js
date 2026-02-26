/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { bundle } from "./bundle.js";
import { resolve } from "node:path";

export const ENTRY = resolve("src/index.ts");

let { context } = await bundle({
    entryPoints: {
        "ecad-viewer": ENTRY,
        "parser.worker": resolve("src/kicanvas/parser.worker.ts"),
    },
    outdir: "debug/ecad_viewer",
    sourcemap: true,
    define: {
        DEBUG: "true",
    },
});

await context.watch();

let { host, port } = await context.serve({
    servedir: "./debug",
    host: "127.0.0.1",
    port: 8080,
});

console.log(`[serve] listening at http://${host}:${port}`);
console.log(`[serve] open http://127.0.0.1:${port} for localhost preview`);
