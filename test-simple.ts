import { SchematicParser } from "./packages/kicad-parser/src/schematic_parser";
import fs from "fs";
import path from "path";

// Test file path
const testFile = path.join(__dirname, "packages/kicad-parser/tests/demos/video/video.kicad_sch");

// Read the original file
const original = fs.readFileSync(testFile, "utf8");

// Create parser
const parser = new SchematicParser();

// Test parsing
console.log("Parsing...");
const parsed = parser.parse(original);

// Test serialization
console.log("Serializing...");
const serialized = parser.save(parsed);

// Check if embedded_fonts is present in serialized output
if (serialized.includes('embedded_fonts')) {
    console.log("✅ SUCCESS: embedded_fonts is present in serialized output");
} else {
    console.log("❌ FAILURE: embedded_fonts is missing from serialized output");
}

// Check section order
const hasCorrectOrder = serialized.includes('sheet_instances') && 
                       serialized.includes('embedded_fonts') && 
                       serialized.includes('symbol_instances') &&
                       serialized.indexOf('sheet_instances') < serialized.indexOf('embedded_fonts') &&
                       serialized.indexOf('embedded_fonts') < serialized.indexOf('symbol_instances');

if (hasCorrectOrder) {
    console.log("✅ SUCCESS: Sections are in correct order");
} else {
    console.log("❌ FAILURE: Sections are in incorrect order");
}

// Check indentation
const hasTabs = /^\t/.test(serialized.split('\n')[1]);
if (hasTabs) {
    console.log("✅ SUCCESS: Using tabs for indentation");
} else {
    console.log("❌ FAILURE: Not using tabs for indentation");
}
