import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const outdir = new URL("./build/", import.meta.url);
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
    entryPoints: [new URL("./main.ts", import.meta.url).pathname],
    outfile: new URL("./main.js", outdir).pathname,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    loader: { ".glsl": "text", ".css": "text", ".svg": "text", ".kicad_wks": "text", ".js": "ts" },
    alias: {
        "@huaqiu/ecad-renderer": new URL("../../src/index.ts", import.meta.url).pathname,
        "@huaqiu/kicad-sexpr-parser": new URL("../../../kicad-parser/src/index.ts", import.meta.url).pathname,
        "kicad-parser": new URL("../../../kicad-parser/src/index.ts", import.meta.url).pathname,
    },
});
await cp(new URL("./index.html", import.meta.url), new URL("./index.html", outdir));
await cp(new URL("./assets", import.meta.url), new URL("./assets", outdir), { recursive: true });
console.log(`Mini integration built at ${outdir.pathname}`);
