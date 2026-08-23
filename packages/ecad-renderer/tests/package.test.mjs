import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("published package exposes the four POD rendering entrypoints", async () => {
    const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
    assert.equal(manifest.name, "@huaqiu/ecad-renderer");
    for (const key of [".", "./symbol", "./footprint", "./schematic", "./pcb", "./worker"])
        assert.ok(manifest.exports[key]);
    const renderer = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
    for (const key of ["renderSymbol", "renderFootprint", "renderSchematic", "renderPcb"])
        assert.match(renderer, new RegExp(`export\\s*\\{[^}]*${key}`));
});
