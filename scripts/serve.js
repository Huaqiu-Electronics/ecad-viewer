/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { bundle } from "./bundle.js";

let { context } = await bundle({
    outfile: "debug/ecad_viewer/ecad-viewer.js",
    sourcemap: true,
    define: {
        DEBUG: "true",
    },
});

await context.watch();

let { host, port } = await context.serve({
    servedir: "./debug",
    port: 8080,
});

console.log(`[serve] listening at http://${host}:${port}`);
