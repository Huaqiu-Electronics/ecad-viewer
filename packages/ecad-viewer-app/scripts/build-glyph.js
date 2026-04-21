/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import fs from "node:fs";
import { bundle } from "./bundle.js";
import { resolve } from "node:path";

export const ENTRY = resolve("src/glyph/index.ts");

let { options, context } = await bundle({
    entryPoints: [ENTRY],
    outfile: "build/glyph-full.js",
    minify: true,
    metafile: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    define: {
        DEBUG: "true",
    },
});

console.log(`Building to ${options.outfile}`);
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

fs.writeFileSync("build/glyph-full-meta.json", JSON.stringify(result.metafile));

context.dispose();
