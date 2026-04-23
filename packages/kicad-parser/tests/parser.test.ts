import { SchematicParser } from '../src/schematic_parser';
import fs from 'fs';
import path from 'path';

const demosDir = path.join(__dirname, 'demos');

/**
 * Recursively collect every *.kicad_sch path under a directory.
 */
function findSchematicFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findSchematicFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.kicad_sch')) {
            results.push(fullPath);
        }
    }
    return results;
}

const schematicFiles = findSchematicFiles(demosDir);

describe('KiCad Schematic Parser', () => {
    let parser: SchematicParser;

    beforeAll(() => {
        parser = new SchematicParser();
    });

    if (schematicFiles.length === 0) {
        it('should find at least one .kicad_sch file in demos/', () => {
            expect(schematicFiles.length).toBeGreaterThan(0);
        });
    }

    describe.each(schematicFiles)('%s', (filePath) => {
        const relPath = path.relative(demosDir, filePath);

        it(`[${relPath}] parse → save is idempotent (round-trip 1)`, () => {
            const original = fs.readFileSync(filePath, 'utf8');
            const parsed = parser.parse(original);
            const serialized = parser.save(parsed);
            expect(serialized).toEqual(original);
        });

        it(`[${relPath}] parse → save → parse → save is stable (round-trip 2)`, () => {
            const original = fs.readFileSync(filePath, 'utf8');
            const parsed1 = parser.parse(original);
            const serialized1 = parser.save(parsed1);
            const parsed2 = parser.parse(serialized1);
            const serialized2 = parser.save(parsed2);
            expect(serialized2).toEqual(serialized1);
        });
    });
});
