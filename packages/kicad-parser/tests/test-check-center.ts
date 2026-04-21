#!/usr/bin/env tsx
import { SchematicParser } from "../src/schematic_parser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { listify } from "../src/tokenizer";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();
const testFile = path.join(__dirname, "demos/video/video.kicad_sch");

console.log("=== Step 1: parse content1 ===");
const content1 = fs.readFileSync(testFile, "utf-8");
const schematic1 = parser.parse(content1);

console.log("=== Step 2: Find first lib symbol with drawings and circles! ===");
let foundCircle = false;

for (let sym of schematic1.lib_symbols) {
    if (sym.drawings) {
        for (let drawing of sym.drawings) {
            if (drawing.center) {
                foundCircle = true;
                console.log("=== Found circle! ===");
                console.log("sym.name:", sym.name);
                console.log("drawing:", drawing);
                console.log("drawing.center:", drawing.center);
                console.log("drawing.center.x:", drawing.center.x, "typeof:", typeof drawing.center.x);
                console.log("drawing.center.y:", drawing.center.y, "typeof:", typeof drawing.center.y);
                console.log("=== Now serialize and parse again to make schematic2 ===");
                const ser1 = parser.save(schematic1);
                console.log("=== Now parse ser1 ===");
                const schematic2 = parser.parse(ser1);

                console.log("=== look at schematic2's first lib symbol circle's center ===");
                const sym2 = schematic2.lib_symbols.find((s)=> s.name === sym.name);
                console.log("sym2.drawings length:", sym2.drawings.length);
                const drawing2 = sym2.drawings[sym.drawings.indexOf(drawing)];
                console.log("drawing2.center:", drawing2.center);
                console.log("drawing2.center.x:", drawing2.center.x, "typeof:", typeof drawing2.center.x);
                console.log("drawing2.center.y:", drawing2.center.y, "typeof:", typeof drawing2.center.y);
                console.log("=== now save schematic2 to ser2 ===");
                const ser2 = parser.save(schematic2);
                console.log("=== now look at ser2's part with that circle! ===");
                const symIdx = ser2.indexOf(sym.name);
                if (symIdx !== -1) {
                    console.log("ser2 snippet:", ser2.slice(symIdx - 10, symIdx + 500));
                }
                process.exit(0);
            }
        }
    }
}
if (!foundCircle) {
    console.log("No circle found in lib symbols!");
}
