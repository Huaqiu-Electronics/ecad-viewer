#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();

const testFile = path.join(__dirname, 'demos/video/graphic.kicad_sch');
const content = fs.readFileSync(testFile, 'utf8');
const schematic = parser.parse(content);
const serialized = parser.save(schematic);
const reparsed = parser.parse(serialized);
const reserialized = parser.save(reparsed);

const s1 = path.join(__dirname, 'debug-s1.kicad_sch');
const s2 = path.join(__dirname, 'debug-s2.kicad_sch');

fs.writeFileSync(s1, serialized);
fs.writeFileSync(s2, reserialized);

console.log('Wrote serialized (1) to', s1);
console.log('Wrote reserialized (2) to', s2);
console.log('\nDiff between s1 and s2:');
try {
    const diff = child_process.execSync(`git diff --no-index --stat "${s1}" "${s2}" 2>&1 || true`).toString();
    console.log(diff);
} catch (e) {
    console.log('Error running git diff:', e);
}

console.log('\nLengths:');
console.log('s1 (serialized):', serialized.length);
console.log('s2 (reserialized):', reserialized.length);

console.log('\nChecking char by char:');
const minLen = Math.min(serialized.length, reserialized.length);
for (let i = 0; i < minLen; i++) {
    if (serialized.charCodeAt(i) !== reserialized.charCodeAt(i)) {
        console.log(`First difference at index ${i}`);
        console.log(`s1: ${JSON.stringify(serialized[i])}`);
        console.log(`s2: ${JSON.stringify(reserialized[i])}`);
        console.log('\ns1 context:');
        console.log(serialized.slice(Math.max(0, i - 50), i + 50));
        console.log('\ns2 context:');
        console.log(reserialized.slice(Math.max(0, i - 50), i + 50));
        break;
    }
}
if (serialized.length !== reserialized.length) {
    console.log(`\nLength differs at index ${minLen}`);
    if (serialized.length > reserialized.length) {
        console.log(`s1 extra chars: ${JSON.stringify(serialized.slice(minLen))}`);
    } else {
        console.log(`s2 extra chars: ${JSON.stringify(reserialized.slice(minLen))}`);
    }
}
