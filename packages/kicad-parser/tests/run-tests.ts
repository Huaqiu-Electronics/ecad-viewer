#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new SchematicParser();

// Test all kicad_sch files in the demos directory
const demosDir = path.join(__dirname, 'demos');

function testSchematicFile(filePath: string): boolean {
    console.log(`\nTesting ${path.relative(demosDir, filePath)}...`);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse the schematic
        const schematic = parser.parse(content);
        
        // Serialize it back
        const serialized = parser.save(schematic);
        
        // Parse the serialized content again to ensure it's valid
        const reparsed = parser.parse(serialized);
        
        // Serialize again to compare
        const reserialized = parser.save(reparsed);
        
        // The reserialized content should match the first serialized content
        if (reserialized === serialized) {
            console.log(`✓ PASSED: ${path.relative(demosDir, filePath)}`);
            return true;
        } else {
            console.error(`✗ FAILED: Serialized output differs for ${path.relative(demosDir, filePath)}`);
            // Find the first difference
            let firstDiffIndex = -1;
            for (let i = 0; i < Math.min(serialized.length, reserialized.length); i++) {
                if (serialized[i] !== reserialized[i]) {
                    firstDiffIndex = i;
                    break;
                }
            }
            
            if (firstDiffIndex !== -1) {
                // Print context around the first difference
                const start = Math.max(0, firstDiffIndex - 100);
                const end = Math.min(Math.max(serialized.length, reserialized.length), firstDiffIndex + 100);
                console.error('Difference found at position', firstDiffIndex);
                console.error('Context from first serialized:');
                console.error(serialized.substring(start, end));
                console.error('Context from reserialized:');
                console.error(reserialized.substring(start, end));
            } else {
                // One is longer than the other
                console.error('One output is longer than the other');
                console.error('First serialized length:', serialized.length);
                console.error('Reserialized length:', reserialized.length);
            }
            return false;
        }
    } catch (error) {
        console.error(`✗ FAILED: Error processing ${path.relative(demosDir, filePath)}`);
        console.error(`  Error: ${error}`);
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
const schematicFiles = findSchematicFiles(demosDir);
let passed = 0;
let failed = 0;

const failedFiles: string[] = [];

schematicFiles.forEach(filePath => {
    if (testSchematicFile(filePath)) {
        passed++;
    } else {
        failed++;
        failedFiles.push(filePath);
    }
});

console.log(`\nTest summary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    console.log('\nFailed files:');
    failedFiles.forEach(file => {
        console.log(`- ${file}`);
    });
}

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
