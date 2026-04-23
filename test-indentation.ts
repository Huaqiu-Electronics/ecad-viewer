import { SchematicParser } from './packages/kicad-parser/src/schematic_parser';
import fs from 'fs';
import path from 'path';

// Read the test file
const testFile = path.join(__dirname, 'packages/kicad-parser/tests/demos/video/video.kicad_sch');
const original = fs.readFileSync(testFile, 'utf8');

// Create parser and test
const parser = new SchematicParser();
const parsed = parser.parse(original);
const serialized = parser.save(parsed);

// Write the serialized output to a file
const outputFile = path.join(__dirname, 'serialized-output.kicad_sch');
fs.writeFileSync(outputFile, serialized, 'utf8');

console.log(`Serialized output written to ${outputFile}`);

// Check if the files are identical
const areIdentical = original === serialized;
console.log(`Files are identical: ${areIdentical}`);

// If not identical, show the first few differences
if (!areIdentical) {
    const originalLines = original.split('\n');
    const serializedLines = serialized.split('\n');
    
    console.log('\nFirst few differences:');
    for (let i = 0; i < Math.min(10, originalLines.length, serializedLines.length); i++) {
        if (originalLines[i] !== serializedLines[i]) {
            console.log(`Line ${i + 1}:`);
            console.log(`Original: ${JSON.stringify(originalLines[i])}`);
            console.log(`Serialized: ${JSON.stringify(serializedLines[i])}`);
            console.log('---');
        }
    }
}
