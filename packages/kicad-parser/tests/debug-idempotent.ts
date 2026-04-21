#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testIdempotence(filePath: string): boolean {
    console.log(`\nTesting ${path.basename(filePath)}...`);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parser = new SchematicParser();
        const schematic1 = parser.parse(content);
        const serialized1 = parser.save(schematic1);
        const schematic2 = parser.parse(serialized1);
        const serialized2 = parser.save(schematic2);
        if (serialized1 === serialized2) {
            console.log(`✓ PASSED: ${path.basename(filePath)}`);
            return true;
        } else {
            console.error(`✗ FAILED: ${path.basename(filePath)} - serializations differ`);
            // Write to tmp files for debug
            const tmp1 = path.join(__dirname, 'idempotent1.kicad_sch');
            const tmp2 = path.join(__dirname, 'idempotent2.kicad_sch');
            fs.writeFileSync(tmp1, serialized1, 'utf8');
            fs.writeFileSync(tmp2, serialized2, 'utf8');
            return false;
        }
    } catch (error) {
        console.error(`✗ FAILED: Error processing ${path.basename(filePath)}`);
        console.error(`  Error: ${error}`);
        return false;
    }
}

// Test all demos
const demosDir = path.join(__dirname, 'demos');

function findKicadSch(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findKicadSch(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.kicad_sch')) {
            files.push(fullPath);
        }
    }
    return files;
}

console.log('=== Idempotence Tests ===');
const allFiles = findKicadSch(demosDir);
let passedCount = 0;
let failedCount = 0;
for (const file of allFiles) {
    if (testIdempotence(file)) {
        passedCount++;
    } else {
        failedCount++;
    }
}
console.log(`\n=== Summary ===`);
console.log(`Passed: ${passedCount}, Failed: ${failedCount}`);
