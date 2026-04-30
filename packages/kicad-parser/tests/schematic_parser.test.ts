import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';

const parser = new SchematicParser();

// Test all kicad_sch files in the demos directory
const demosDir = path.resolve(__dirname, 'demos');

function testSchematicFile(filePath: string) {
    test(`Parse and serialize ${path.relative(demosDir, filePath)}`, () => {
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
        expect(reserialized).toBe(serialized);
    });
}

// Recursively find all kicad_sch files in demos directory
function findSchematicFiles(dir: string) {
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
const schematicFiles = findSchematicFiles(demosDir);
schematicFiles.forEach(testSchematicFile);
