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

// Test file
const testFile = path.join(__dirname, 'demos/complex_hierarchy/complex_hierarchy.kicad_sch');

// Read and parse the file
const content = fs.readFileSync(testFile, 'utf8');
const schematic = parser.parse(content);
const serialized = parser.save(schematic);

// Format the serialized content with proper indentation
function formatSExpression(sexpr: string): string {
    let result = '';
    let indentLevel = 0;
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < sexpr.length; i++) {
        const char = sexpr[i];
        
        if (escape) {
            result += char;
            escape = false;
            continue;
        }
        
        if (char === '\\') {
            result += char;
            escape = true;
            continue;
        }
        
        if (char === '"') {
            result += char;
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '(') {
                result += '\n' + '\t'.repeat(indentLevel) + '(';
                indentLevel++;
            } else if (char === ')') {
                indentLevel--;
                result += '\n' + '\t'.repeat(indentLevel) + ')';
            } else if (char === ' ') {
                // Skip spaces outside strings
                continue;
            } else {
                result += char;
            }
        } else {
            result += char;
        }
    }
    
    return result.trim() + '\n';
}

// Format the serialized content
const formatted = formatSExpression(serialized);

// Save to debug file
const debugDir = path.join(__dirname, 'debug');
if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
}
const debugFile = path.join(debugDir, 'formatted_reserialized.kicad_sch');
fs.writeFileSync(debugFile, formatted, 'utf8');
console.log(`Saved formatted reserialized file to ${debugFile}`);

// Test with KiCad CLI
const kicadCliPath = 'kicad-cli';
try {
    const { stdout, stderr } = execSync(`${kicadCliPath} sch erc ${debugFile}`, { encoding: 'utf8' });
    console.log(`✓ KiCad CLI could load the formatted file`);
    console.log(`Stdout: ${stdout}`);
} catch (error: any) {
    console.error(`✗ KiCad CLI failed to load the formatted file:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stderr: ${error.stderr}`);
}

// Also test with the original file for comparison
console.log('\nTesting with original file:');
try {
    const { stdout, stderr } = execSync(`${kicadCliPath} sch erc ${testFile}`, { encoding: 'utf8' });
    console.log(`✓ KiCad CLI could load the original file`);
    console.log(`Stdout: ${stdout}`);
} catch (error: any) {
    console.error(`✗ KiCad CLI failed to load the original file:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stderr: ${error.stderr}`);
}
