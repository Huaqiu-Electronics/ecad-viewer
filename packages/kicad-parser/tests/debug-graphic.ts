#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, 'demos', 'video', 'graphic.kicad_sch');
const originalContent = fs.readFileSync(testFile, 'utf8');

const parser = new SchematicParser();

console.log('=== Parse 1 ===');
const schematic1 = parser.parse(originalContent);
console.log('=== Serialize 1 ===');
const serialized1 = parser.save(schematic1);

console.log('=== Parse 2 ===');
const schematic2 = parser.parse(serialized1);
console.log('=== Serialize 2 ===');
const serialized2 = parser.save(schematic2);

const tmp1 = path.join(__dirname, 'ser1.kicad_sch');
const tmp2 = path.join(__dirname, 'ser2.kicad_sch');
fs.writeFileSync(tmp1, serialized1, 'utf8');
fs.writeFileSync(tmp2, serialized2, 'utf8');
console.log(`Wrote to ${tmp1} and ${tmp2}`);

try {
    console.log('\n=== git diff ===');
    const diff = execSync(`git diff --no-index "${tmp1}" "${tmp2}"`, { encoding: 'utf8' });
    console.log(diff);
} catch (e) {
    if (e.stdout) console.log(e.stdout);
}
