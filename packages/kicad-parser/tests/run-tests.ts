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
        
        // Write reserialized content to temporary file for KiCad verification
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kicad-test-'));
        const tempFile = path.join(tempDir, `${path.basename(filePath)}`);
        fs.writeFileSync(tempFile, reserialized, 'utf8');
        
        // Verify with KiCad CLI
        const kicadCliPath = '/Users/admin/code/kicad-mac-builder/build/kicad-dest/KiCad.app/Contents/MacOS/kicad-cli';
        try {
            const { stdout, stderr } = execSync(`${kicadCliPath} sch erc ${tempFile}`, { encoding: 'utf8' });
            console.log(`✓ KiCad CLI could load the file`);
        } catch (error: any) {
            console.error(`✗ KiCad CLI failed to load the file:`);
            console.error(`  Error: ${error.message}`);
            console.error(`  Stderr: ${error.stderr}`);
            // Clean up temp files
            fs.rmSync(tempDir, { recursive: true, force: true });
            return false;
        }
        
        // Clean up temp files
        fs.rmSync(tempDir, { recursive: true, force: true });
        
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
// For debugging, run only on a specific file
const testFile = path.join(demosDir, 'complex_hierarchy/complex_hierarchy.kicad_sch');
let passed = 0;
let failed = 0;

const failedFiles: string[] = [];

// Save the reserialized file for inspection
const content = fs.readFileSync(testFile, 'utf8');
const schematic = parser.parse(content);
const serialized = parser.save(schematic);
const reparsed = parser.parse(serialized);
const reserialized = parser.save(reparsed);

// Check the first few and last few characters of the reserialized string
console.log('First 100 characters of reserialized content:');
console.log(reserialized.slice(0, 100));
console.log('Last 20 characters of reserialized content:');
console.log(reserialized.slice(-20));
console.log('Length:', reserialized.length);

// Save to a permanent location for inspection
const debugDir = path.join(__dirname, 'debug');
if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
}
const debugFile = path.join(debugDir, 'reserialized.kicad_sch');
fs.writeFileSync(debugFile, reserialized, 'utf8');
console.log(`Saved reserialized file to ${debugFile}`);

// Test with KiCad CLI
const kicadCliPath = '/Users/admin/code/kicad-mac-builder/build/kicad-dest/KiCad.app/Contents/MacOS/kicad-cli';
try {
    const { stdout, stderr } = execSync(`${kicadCliPath} sch erc ${debugFile}`, { encoding: 'utf8' });
    console.log(`✓ KiCad CLI could load the file`);
} catch (error: any) {
    console.error(`✗ KiCad CLI failed to load the file:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stderr: ${error.stderr}`);
}

// Also test with the original file for comparison
console.log('\nTesting with original file:');
try {
    const { stdout, stderr } = execSync(`${kicadCliPath} sch erc ${testFile}`, { encoding: 'utf8' });
    console.log(`✓ KiCad CLI could load the original file`);
} catch (error: any) {
    console.error(`✗ KiCad CLI failed to load the original file:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stderr: ${error.stderr}`);
}

// Exit with appropriate code
process.exit(0);
