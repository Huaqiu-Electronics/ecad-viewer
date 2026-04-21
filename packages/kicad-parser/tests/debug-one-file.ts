#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();

// Pick a test file
const testFile = path.join(__dirname, 'demos/video/graphic.kicad_sch');
console.log('\nDebugging: ' + path.relative(__dirname, testFile) + '...\n');

const content = fs.readFileSync(testFile, 'utf8');

console.log('Step 1: Parsing schematic...');
const schematic = parser.parse(content);

console.log('Step 2: Serializing schematic...');
const serialized = parser.save(schematic);

console.log('Step 3: Parsing serialized schematic again...');
const reparsed = parser.parse(serialized);

console.log('Step 4: Serializing again...');
const reserialized = parser.save(reparsed);

if (reserialized === serialized) {
    console.log('✅ Success! Reserialized matches original serialized output!');
} else {
    console.log('❌ FAILED!');

    // Write to temp files and use git diff to show differences
    const tempDir = path.join(__dirname, '../.temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const file1 = path.join(tempDir, 'serialized.txt');
    const file2 = path.join(tempDir, 'reserialized.txt');
    fs.writeFileSync(file1, serialized);
    fs.writeFileSync(file2, reserialized);

    console.log('\n=== Diff between serialized vs reserialized ===');
    try {
        const diff = child_process.execSync(`git diff --no-index "${file1}" "${file2}" 2>/dev/null || true`).toString();
        if (diff) {
            console.log(diff);
        } else {
            console.log('(No differences found, but equality check failed. Whitespace differences?)');
        }
    } catch (e) {
        console.log('Error running git diff:', e);
    }

    console.log('\n=== Check for whitespace differences ===');
    console.log(`Length of serialized: ${serialized.length}`);
    console.log(`Length of reserialized: ${reserialized.length}`);

    if (serialized.length === reserialized.length) {
        for (let i = 0; i < serialized.length; i++) {
            if (serialized.charCodeAt(i) !== reserialized.charCodeAt(i)) {
                console.log(`Difference at character ${i} (0-based): ${JSON.stringify(serialized[i])} vs ${JSON.stringify(reserialized[i])}`);
                break;
            }
        }
    }
}

console.log('\n=== END ===');
