import { SchematicParser } from "./packages/kicad-parser/src/schematic_parser";
import fs from "fs";
import path from "path";

// Test file path
const testFile = path.join(__dirname, "packages/kicad-parser/tests/demos/video/video.kicad_sch");

// Read the original file
const original = fs.readFileSync(testFile, "utf8");

// Create parser and test round-trip
const parser = new SchematicParser();

console.log("Parsing the schematic file...");
const parsed = parser.parse(original);

console.log("Serializing the parsed data...");
const serialized = parser.save(parsed);

// Compare the results
if (serialized === original) {
    console.log("✅ SUCCESS: Round-trip test passed! Serialized output matches original.");
} else {
    console.log("❌ FAILURE: Round-trip test failed! Serialized output differs from original.");
    
    // Write the serialized output to a file for comparison
    const outputFile = path.join(__dirname, "serialized_output.kicad_sch");
    fs.writeFileSync(outputFile, serialized, "utf8");
    console.log(`Serialized output written to: ${outputFile}`);
    
    // Find the first difference
    const originalLines = original.split('\n');
    const serializedLines = serialized.split('\n');
    
    for (let i = 0; i < Math.min(originalLines.length, serializedLines.length); i++) {
        if (originalLines[i] !== serializedLines[i]) {
            console.log(`First difference at line ${i + 1}:`);
            console.log(`Original: ${originalLines[i]}`);
            console.log(`Serialized: ${serializedLines[i]}`);
            break;
        }
    }
}
