const { SchematicParser } = require('./dist/index.js');
const fs = require('fs');

const parser = new SchematicParser();
const original = fs.readFileSync('./tests/demos/video/video.kicad_sch', 'utf8');
const parsed = parser.parse(original);
const serialized = parser.save(parsed);

console.log('Original length:', original.length);
console.log('Serialized length:', serialized.length);
console.log('Last 10 characters of original:', JSON.stringify(original.slice(-10)));
console.log('Last 10 characters of serialized:', JSON.stringify(serialized.slice(-10)));

// Write serialized to a file for comparison
fs.writeFileSync('./test_output.kicad_sch', serialized);
console.log('Serialized output written to test_output.kicad_sch');
