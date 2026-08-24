import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const outdir = new URL("./build/", import.meta.url);
const outdirPath = fileURLToPath(outdir);
await rm(outdirPath, { recursive: true, force: true });
await mkdir(outdirPath, { recursive: true });
await build({
    entryPoints: [fileURLToPath(new URL("./main.ts", import.meta.url))],
    outfile: fileURLToPath(new URL("./main.js", outdir)),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    loader: { ".glsl": "text", ".css": "text", ".svg": "text", ".kicad_wks": "text", ".js": "ts" },
    alias: {
        "@huaqiu/ecad-renderer": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
        "@huaqiu/kicad-sexpr-parser": fileURLToPath(new URL("../../../kicad-parser/src/index.ts", import.meta.url)),
        "kicad-parser": fileURLToPath(new URL("../../../kicad-parser/src/index.ts", import.meta.url)),
    },
});
await cp(fileURLToPath(new URL("./index.html", import.meta.url)), fileURLToPath(new URL("./index.html", outdir)));
await cp(fileURLToPath(new URL("./assets", import.meta.url)), fileURLToPath(new URL("./assets", outdir)), { recursive: true });
console.log(`Mini integration built at ${outdirPath}`);
