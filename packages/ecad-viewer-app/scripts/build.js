/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import fs from "node:fs";
import { bundle } from "./bundle.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "..");
const ROOT_DIR = resolve(APP_DIR, "../..");
export const ENTRY = resolve(APP_DIR, "src/index.ts");

let { options, context } = await bundle({
    entryPoints: {
        "ecad-viewer": ENTRY,
        "parser.worker": resolve(APP_DIR, "src/kicanvas/parser.worker.ts"),
    },
    outdir: resolve(APP_DIR, "build"),
    minify: true,
    metafile: true,
    resolveExtensions: [".ts", ".js"],
    alias: {
        "kicad-parser": resolve(ROOT_DIR, "packages/kicad-parser/src"),
    },
});

console.log(`Building to ${options.outdir}`);
let result = await context.rebuild();

console.log(`Build complete!`);
console.log(`${result.warnings.length} warnings`);
for (const msg of result.warnings) {
    console.log("- ", msg);
}
console.log(`${result.errors.length} errors`);
for (const msg of result.errors) {
    console.log("- ", msg);
}

fs.writeFileSync(
    resolve(APP_DIR, "build/ecad-viewer-esbuild-meta.json"),
    JSON.stringify(result.metafile),
);

context.dispose();
