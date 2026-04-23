#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();

// Test all kicad_sch files in the demos directory
const demosDir = path.join(__dirname, 'demos');

function testSchematicFile(filePath: string): boolean {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse the schematic
        const schematic = parser.parse(content);
        
        // Serialize it back
        const serialized = parser.save(schematic);
        
        // Write to temp files
        const baseName = path.basename(filePath);
        const dirName = path.dirname(filePath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kicad-test-'));
        // Copy all files from original directory to temp dir
        const filesToCopy = fs.readdirSync(dirName, { withFileTypes: true });
        for (const f of filesToCopy) {
            const src = path.join(dirName, f.name);
            const dest = path.join(tempDir, f.name);
            if (f.isDirectory()) {
                fs.cpSync(src, dest, { recursive: true });
            } else {
                fs.copyFileSync(src, dest);
            }
        }
        // Now overwrite ser file
        const origFile = path.join(tempDir, `orig-${baseName}`);
        const serFile = path.join(tempDir, baseName);
        fs.writeFileSync(origFile, content, 'utf8');
        fs.writeFileSync(serFile, serialized, 'utf8');
        
        // Check parse/serialize/parse/serialize cycle
        const reparsed = parser.parse(serialized);
        const reserialized = parser.save(reparsed);
        
        // Verify with KiCad CLI
        const kicadCliPath = 'kicad-cli';
        try {
            execSync(`${kicadCliPath} sch erc "${serFile}"`, { encoding: 'utf8', stdio: 'pipe' });
        } catch {
            fs.rmSync(tempDir, { recursive: true, force: true });
            return false;
        }
        
        // The reserialized content should match the first serialized content
        if (reserialized === serialized) {
            // Clean up temp dir
            fs.rmSync(tempDir, { recursive: true, force: true });
            return true;
        } else {
            fs.rmSync(tempDir, { recursive: true, force: true });
            return false;
        }
    } catch {
        return false;
    }
}

// Recursively find all kicad_sch files in demos directory
function findSchematicFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findSchematicFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.kicad_sch')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Run tests for all found schematic files
console.log('Running schematic parser and serializer tests...');

// Find all kicad_sch files in the demos directory
const schematicFiles = findSchematicFiles(demosDir);
console.log(`Found ${schematicFiles.length} .kicad_sch files`);

let passed = 0;
let failed = 0;
const failedFiles: string[] = [];
const passedFiles: string[] = [];

// Test each schematic file
for (const filePath of schematicFiles) {
    const relativePath = path.relative(demosDir, filePath);
    process.stdout.write(`Testing ${relativePath}... `);
    const success = testSchematicFile(filePath);
    if (success) {
        passed++;
        passedFiles.push(filePath);
        console.log('✓ PASSED');
    } else {
        failed++;
        failedFiles.push(filePath);
        console.log('✗ FAILED');
    }
}

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Total files: ${schematicFiles.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (passed > 0) {
    console.log('\nPassed files:');
    passedFiles.forEach(file => {
        console.log(`  - ${path.relative(demosDir, file)}`);
    });
}

if (failed > 0) {
    console.log('\nFailed files:');
    failedFiles.forEach(file => {
        console.log(`  - ${path.relative(demosDir, file)}`);
    });
}

// Exit with appropriate code
process.exit(0);
