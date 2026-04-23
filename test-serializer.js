const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import the parser
const parser = require('./packages/kicad-parser/dist/index.js');

// Read the test file
const testFile = path.join(process.cwd(), 'packages/kicad-parser/tests/demos/video/video.kicad_sch');
const original = fs.readFileSync(testFile, 'utf8');

// Parse and serialize
const parsed = parser.parse(original);
const serialized = parser.save(parsed);

// Write the serialized result to a file
const outputFile = path.join(process.cwd(), 'serialized-output.kicad_sch');
fs.writeFileSync(outputFile, serialized, 'utf8');

console.log(`Serialized output written to ${outputFile}`);
console.log('\nDiff between original and serialized:');

try {
    const diff = execSync(`diff -u ${testFile} ${outputFile}`, { encoding: 'utf8' });
    console.log(diff);
} catch (e) {
    console.log('No diff output (exit code indicates difference)');
    console.log(e.stdout);
}
