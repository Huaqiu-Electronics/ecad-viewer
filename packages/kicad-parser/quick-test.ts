#!/usr/bin/env tsx
import { SchematicParser } from "./src/schematic_parser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, "tests/demos/complex_hierarchy/ampli_ht.kicad_sch");
console.log(`Testing ${testFile}...`);

const content = fs.readFileSync(testFile, "utf8");
const parser = new SchematicParser();
const schematic = parser.parse(content);
const serialized = parser.save(schematic);

const outputFile = path.join(__dirname, "test-output.kicad_sch");
fs.writeFileSync(outputFile, serialized, "utf8");

console.log(`Serialized output written to ${outputFile}`);
console.log();
console.log("Diff:");
console.log("-----");

try {
    execSync(`diff -u "${testFile}" "${outputFile}"`, {
        stdio: "inherit"
    });
} catch (e) {
    // Expected, since they might be different
}
