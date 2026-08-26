import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { BoardParser, SchematicParser } from "@huaqiu/kicad-sexpr-parser";
import { loadProjectZip } from "../dist/project.js";

test("published package exposes the four POD rendering entrypoints", async () => {
    const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
    assert.equal(manifest.name, "@huaqiu/ecad-renderer");
    for (const key of [".", "./symbol", "./footprint", "./schematic", "./pcb", "./project", "./worker"])
        assert.ok(manifest.exports[key]);
    const renderer = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
    for (const key of ["renderSymbol", "renderFootprint", "renderSchematic", "renderPcb", "renderProjectFromZip", "loadProjectZip"])
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

/** Build a project zip with jszip (no filesystem, no network). */
async function buildZip(entries) {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(entries)) zip.file(name, content);
    return zip.generateAsync({ type: "uint8array" });
}

test("loadProjectZip extracts KiCad files and detects the root schematic from .kicad_pro", async () => {
    const buf = await buildZip({
        "Demo.kicad_pro": "(kicad_pro (version 20230121))",
        "Demo.kicad_sch": "(kicad_sch (version 20231120))",
        "Sub.kicad_sch": "(kicad_sch (version 20231120))",
        "notes.txt": "not kicad",
    });
    const loaded = await loadProjectZip(buf);
    // Only KiCad sources, non-KiCad entries filtered out.
    assert.deepEqual(
        loaded.files.map((f) => f.filename).sort(),
        ["Demo.kicad_sch", "Sub.kicad_sch"],
    );
    assert.equal(loaded.files[0].content, "(kicad_sch (version 20231120))");
    // Root schematic = the sheet named after the .kicad_pro project file.
    assert.equal(loaded.rootSchematic, "Demo.kicad_sch");
});

test("loadProjectZip falls back to the first sheet when there is no .kicad_pro", async () => {
    const buf = await buildZip({
        "a.kicad_sch": "(kicad_sch (version 20231120))",
        "b.kicad_sch": "(kicad_sch (version 20231120))",
    });
    const loaded = await loadProjectZip(buf);
    assert.equal(loaded.rootSchematic, "a.kicad_sch");
});

test("loadProjectZip reports an empty root when the zip has no schematic", async () => {
    const buf = await buildZip({
        "board.kicad_pcb": "(kicad_pcb (version 20240108))",
    });
    const loaded = await loadProjectZip(buf);
    assert.equal(loaded.rootSchematic, "");
    assert.deepEqual(loaded.files.map((f) => f.filename), ["board.kicad_pcb"]);
});
