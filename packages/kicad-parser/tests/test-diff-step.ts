#!/usr/bin/env tsx
import { SchematicParser } from "../src/schematic_parser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();
const testFile = path.join(__dirname, "demos/video/video.kicad_sch");

console.log("=== Step 1: Original ====");
const content1 = fs.readFileSync(testFile, "utf8");
console.log("=== Step 2: Parse original schematic");
const schematic1 = parser.parse(content1);
console.log("=== Step3: Serialize ====");
const serialized1 = parser.save(schematic1);

console.log("\n=== Step4: Find BNC lib symbol in schematic1 ====");
const bncSym = schematic1.lib_symbols.find((s:any) => s.name === "BNC_0_1");
console.log("Found BNC_0_1? ", !!bncSym);
if (bncSym && bncSym.drawings) {
    console.log("BNC_0_1 has drawings! len:", bncSym.drawings.length);
    console.log("BNC_0_1 first drawing:", bncSym.drawings[0]);
    console.log("BNC_0_1 first drawing's center:", (bncSym.drawings[0] as any)?.center);
}
console.log("\n=== Step5: Parse serialized1 ====");
const schematic2 = parser.parse(serialized1);
console.log("\n=== Step6: Serialize again ====");
const serialized2 = parser.save(schematic2);
console.log("\n=== Step7: Find BNC in schematic2 ====");
const bncSym2 = schematic2.lib_symbols.find((s:any) => s.name === "BNC_0_1");
console.log("BNC_0_1 in schematic2 len:", bncSym2?.drawings.length);
if (bncSym2?.drawings[0]) {
    console.log("schematic2's BNC_0_1 first drawing:", bncSym2.drawings[0]);
    console.log("schematic2 BNC_0_1 first drawing's center:", (bncSym2.drawings[0] as any)?.center);
}

console.log("\n=== Step8: Find where is xy,0,0 in serialized1 ====");
const bncInSerialized1 = serialized1.indexOf("(symbol \"BNC_0_1\"");
if (bncInSerialized1 !== -1) {
    let snippet = serialized1.slice(bncInSerialized1, bncInSerialized1 + 500);
    console.log("BNC_0_1 in serialized1 snippet:", snippet);
}
console.log("=== Step9: Find bnc in serialized2 ====");
const bncInSerialized2 = serialized2.indexOf("(symbol \"BNC_0_1\"");
if (bncInSerialized2 !== -1) {
    let snippet = serialized2.slice(bncInSerialized2, bncInSerialized2 + 500);
    console.log("BNC_0_1 in serialized2 snippet:", snippet);
}

console.log("\n=== Step 10: Lengths serialized1 vs serialized2 are equal? ", serialized1 === serialized2);

console.log("\n=== Step 11: Writing both to temp/ to compare ====");
const tempDir = path.join(__dirname, "..", ".temp");
fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(path.join(tempDir, "serialized1.sch"), serialized1);
fs.writeFileSync(path.join(tempDir, "serialized2.sch"), serialized2);
