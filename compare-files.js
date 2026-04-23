import fs from 'fs';
import path from 'path';

// Read the original and serialized files
const originalFile = path.join(process.cwd(), 'packages/kicad-parser/tests/demos/video/video.kicad_sch');
const serializedFile = path.join(process.cwd(), 'serialized-output.kicad_sch');

const original = fs.readFileSync(originalFile, 'utf8');
const serialized = fs.readFileSync(serializedFile, 'utf8');

// Split into lines
const originalLines = original.split('\n');
const serializedLines = serialized.split('\n');

// Compare line by line
console.log('Comparing files...');
for (let i = 0; i < Math.max(originalLines.length, serializedLines.length); i++) {
    const originalLine = originalLines[i] || '';
    const serializedLine = serializedLines[i] || '';
    
    if (originalLine !== serializedLine) {
        console.log(`Line ${i + 1} differs:`);
        console.log(`Original: ${JSON.stringify(originalLine)}`);
        console.log(`Serialized: ${JSON.stringify(serializedLine)}`);
        console.log('---');
    }
}

console.log('Comparison complete.');
