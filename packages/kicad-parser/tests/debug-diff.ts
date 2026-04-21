#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, 'demos', 'video', 'video.kicad_sch');
const originalContent = fs.readFileSync(testFile, 'utf8').trim();
const parser = new SchematicParser();

console.log('=== Parsing... ===');
const schematic = parser.parse(originalContent);

console.log('=== Serializing... ===');
const serialized = parser.save(schematic).trim();

console.log('\n=== Comparing... ===');
if (originalContent !== serialized) {
    console.log('✗ NOT equal! Writing tmp files for git diff...');

    const origTmpPath = path.join(__dirname, 'debug-original.kicad_sch');
    const serialTmpPath = path.join(__dirname, 'debug-serialized.kicad_sch');
    fs.writeFileSync(origTmpPath, originalContent, 'utf8');
    fs.writeFileSync(serialTmpPath, serialized, 'utf8');
    console.log(`Wrote original to ${origTmpPath}`);
    console.log(`Wrote serialized to ${serialTmpPath}`);

    console.log('\n=== Running git diff... ===');
    try {
        const diffOutput = execSync(`git diff --no-index --word-diff "${origTmpPath}" "${serialTmpPath}"`, { encoding: 'utf8' });
        console.log(diffOutput);
    } catch (error) {
        // git diff returns 1 when differences exist, which is expected
        if (error.stdout) {
            console.log(error.stdout);
        }
        if (error.stderr && !error.stderr.includes('exit status 1')) {
            console.error(error.stderr);
        }
    }
} else {
    console.log('✓ Equal!');
}
