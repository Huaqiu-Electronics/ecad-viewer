
import { SchematicParser } from './src/schematic_parser';
import fs from 'fs';
import path from 'path';

const testFile = path.join(__dirname, 'tests/demos/video/video.kicad_sch');
const content = fs.readFileSync(testFile, 'utf8');
const parser = new SchematicParser();
const parsed = parser.parse(content);
const serialized = parser.save(parsed);
console.log('Serialized length:', serialized.length);
console.log('First 200 chars:', serialized.substring(0, 200));

// Save to a file to compare
fs.writeFileSync(path.join(__dirname, 'test-output.kicad_sch'), serialized);
console.log('Wrote test-output.kicad_sch');
