import { SchematicParser } from "../src/schematic_parser";
import fs from "fs";
import path from "path";

const symbolDir = path.join(__dirname, "kicad_symbol");

/**
 * Recursively collect every *.kicad_sym path under a directory.
 */
function findSymbolFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findSymbolFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".kicad_sym")) {
            results.push(fullPath);
        }
    }
    return results;
}

const symbolFiles = findSymbolFiles(symbolDir);

describe("KiCad LibSymbol Parser", () => {
    let parser: SchematicParser;

    beforeAll(() => {
        parser = new SchematicParser();
    });

    if (symbolFiles.length === 0) {
        it("should find at least one .kicad_sym file in kicad_symbol/", () => {
            expect(symbolFiles.length).toBeGreaterThan(0);
        });
    }

    describe.each(symbolFiles)("%s", (filePath) => {
        const relPath = path.relative(symbolDir, filePath);

        it(`[${relPath}] parseLibSymbols → saveLibSymbols is stable (round-trip)`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed = parser.parseLibSymbols(original);
            const serialized = parser.saveLibSymbols(parsed);
            const reparsed = parser.parseLibSymbols(serialized);
            const reserialized = parser.saveLibSymbols(reparsed);
            expect(reserialized).toEqual(serialized);
        });

        it(`[${relPath}] parseLibSymbols should return valid symbols`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed = parser.parseLibSymbols(original);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThan(0);
            parsed.forEach((symbol) => {
                expect(typeof symbol).toBe("object");
                expect(typeof symbol.name).toBe("string");
            });
        });
    });
});
