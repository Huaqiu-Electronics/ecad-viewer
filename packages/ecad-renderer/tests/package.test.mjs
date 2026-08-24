import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BoardParser, SchematicParser } from "@huaqiu/kicad-sexpr-parser";

test("published package exposes the four POD rendering entrypoints", async () => {
    const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
    assert.equal(manifest.name, "@huaqiu/ecad-renderer");
    for (const key of [".", "./symbol", "./footprint", "./schematic", "./pcb", "./worker"])
        assert.ok(manifest.exports[key]);
    const renderer = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
    for (const key of ["renderSymbol", "renderFootprint", "renderSchematic", "renderPcb"])
        assert.match(renderer, new RegExp(`export\\s*\\{[^}]*${key}`));
});

test("mini integration fixtures parse into symbol and footprint PODs", async () => {
    const assets = new URL("./assets/", import.meta.url);
    const [symbolSource, footprintSource] = await Promise.all([
        readFile(new URL("LMV761MAX_NOPB.kicad_sym", assets), "utf8"),
        readFile(new URL("LMV761MAX_NOPB.kicad_mod", assets), "utf8"),
    ]);
    assert.ok(new SchematicParser().parseLibSymbols(symbolSource)[0]);
    const board = new BoardParser().parse(`(kicad_pcb (version 20240108) (generator "test") ${footprintSource})`);
    assert.ok(board.footprints[0]);
});
