import { build } from "esbuild";
import { cp, rm } from "node:fs/promises";

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
await build({
    entryPoints: ["src/index.ts", "src/symbol.ts", "src/footprint.ts", "src/schematic.ts", "src/pcb.ts", "src/worker.ts", "src/renderer.worker.ts"],
    outdir: "dist",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: true,
    loader: { ".glsl": "text", ".css": "text", ".svg": "text", ".kicad_wks": "text", ".js": "ts" },
    // The renderer uses the parser's POD interfaces at its public boundary.
    external: ["@huaqiu/kicad-sexpr-parser"],
    alias: { "kicad-parser": "@huaqiu/kicad-sexpr-parser" }
});
for (const name of ["index", "symbol", "footprint", "schematic", "pcb", "worker"]) {
    await cp("src/public.d.ts", `dist/${name}.d.ts`);
}
