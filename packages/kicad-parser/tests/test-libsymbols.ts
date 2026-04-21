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

const content1 = fs.readFileSync(testFile, "utf8");
console.log("=== Step 1: listify content1 === ");
const schematic1 = parser.parse(content1);

console.log("\n=== Step2: Schematic1.lib_symbols length: ", schematic1.lib_symbols.length);
console.log("\n=== Step3: find first 3 lib symbols:");

for (let i=0;i<3;i++) {
    const sym = schematic1.lib_symbols[i];
    console.log(`Sym name: ${sym.name}`);
    console.log("sym.drawings?:", sym.drawings?.length || 0);
    console.log("sym.drawings:", JSON.stringify(sym.drawings, null, 2));
}

console.log("\n=== Step4: Now parse serialized1 (schematic again === ");
console.log("=== Now let's take serialized1 (schematic1):");
const serialized1 = parser.save(schematic1);
console.log("Now we have serialized1, now parse serialized1's listify: let's listify the first part of serialized1 (just the (lib_symbols)");

const libSymIdx = serialized1.indexOf("(lib_symbols");
if (libSymIdx !== -1) {
    let end = serialized1.indexOf("(symbols", libSymIdx);
    console.log("serialized1 lib_symbols snippet:", serialized1.slice(libSymIdx, libSymIdx + 3000));
    console.log("\n=== Now listify that snippet (serialized1.slice(libSymIdx, libSymIdx+4000):");
    const libSymListed = listify(serialized1.slice(libSymIdx - 1, libSymIdx + 6000)); // + 6000);
    console.log("\nlib_symbols listed:", JSON.stringify(libSymListed, null,4));
}
