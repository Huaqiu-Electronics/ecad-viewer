import { SchematicParser } from "../src/schematic_parser";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import _ from "lodash";
import { diff } from "jest-diff";

const demosDir = path.join(__dirname, "demos");



/**
 * Recursively collect every *.kicad_sch path under a directory.
 */
function findSchematicFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findSchematicFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".kicad_sch")) {
            results.push(fullPath);
        }
    }
    return results;
}

const schematicFiles = findSchematicFiles(demosDir);

describe("KiCad Schematic Parser", () => {
    let parser: SchematicParser;

    beforeAll(() => {
        parser = new SchematicParser();
    });

    if (schematicFiles.length === 0) {
        it("should find at least one .kicad_sch file in demos/", () => {
            expect(schematicFiles.length).toBeGreaterThan(0);
        });
    }

    describe.each(schematicFiles)("%s", (filePath) => {
        const relPath = path.relative(demosDir, filePath);

        // Memoization map for stable sort comparator
        const sortKeyMemo = new WeakMap<object, string>();
        
        // Helper to normalize a value for sort key generation
        function normalizeForSort(value: unknown): unknown {
            if (typeof value === 'number') {
                return parseFloat(value.toFixed(6));
            } else if (Array.isArray(value)) {
                    return value.map(normalizeForSort);
            } else if (typeof value === 'object' && value !== null) {
                // Remove ppi field from images
                let processed = value as Record<string, unknown>;
                if (processed['data'] && typeof processed['data'] === 'string' && processed.hasOwnProperty('ppi')) {
                    const { ppi, ...rest } = processed;
                    processed = rest;
                }
                
                return Object.fromEntries(
                    Object.entries(processed)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => [k, normalizeForSort(v)])
                );
            }
            return value;
        }
        
        // Helper to get a stable sort key for any value
        function getSortKey(value: unknown): string {
            if (typeof value === 'object' && value !== null) {
                // Check memo first
                if (sortKeyMemo.has(value)) {
                    return sortKeyMemo.get(value)!;
                }
                
                // If it has a uuid, use that
                const obj = value as Record<string, unknown>;
                if (obj['uuid']) {
                    const key = `uuid:${obj['uuid']}`;
                    sortKeyMemo.set(value, key);
                    return key;
                }
                
                // Otherwise, stringify normalized and sorted
                const normalized = normalizeForSort(value);
                const key = `obj:${JSON.stringify(normalized)}`;
                sortKeyMemo.set(value, key);
                return key;
            }
            
            // For primitive values, normalize and stringify
            if (typeof value === 'number') {
                return `num:${parseFloat(value.toFixed(6))}`;
            }
            return `prim:${String(value)}`;
        }

        // Stable comparator for sorting arrays
        function stableSortComparator(a: unknown, b: unknown): number {
            const keyA = getSortKey(a);
            const keyB = getSortKey(b);
            return keyA.localeCompare(keyB);
        }

        // Custom comparator for semantic equality
        function semanticComparator(obj1: unknown, obj2: unknown): boolean | undefined {
            // Check for number equality with 6 decimal places
            if (typeof obj1 === 'number' && typeof obj2 === 'number') {
                return parseFloat(obj1.toFixed(6)) === parseFloat(obj2.toFixed(6));
            }
            
            // Check for array equality
            if (Array.isArray(obj1) && Array.isArray(obj2)) {
                // Check if this is a points array (any element has x and y)
                const isPointsArray1 = obj1.length > 0 && obj1.some(item => 
                    typeof item === 'object' && item !== null && 
                    (item as Record<string, unknown>)['x'] !== undefined && (item as Record<string, unknown>)['y'] !== undefined
                );
                const isPointsArray2 = obj2.length > 0 && obj2.some(item => 
                    typeof item === 'object' && item !== null && 
                    (item as Record<string, unknown>)['x'] !== undefined && (item as Record<string, unknown>)['y'] !== undefined
                );
                
                if (isPointsArray1 || isPointsArray2) {
                    // Points arrays must be equal in order
                    if (obj1.length !== obj2.length) return false;
                    for (let i = 0; i < obj1.length; i++) {
                        if (!_.isEqualWith(obj1[i], obj2[i], semanticComparator)) return false;
                    }
                    return true;
                }
                
                // Regular arrays - sort them first
                if (obj1.length !== obj2.length) return false;
                
                const sorted1 = [...obj1].sort(stableSortComparator);
                const sorted2 = [...obj2].sort(stableSortComparator);
                
                for (let i = 0; i < sorted1.length; i++) {
                    if (!_.isEqualWith(sorted1[i], sorted2[i], semanticComparator)) return false;
                }
                return true;
            }
            
            // Check for object equality
            if (typeof obj1 === 'object' && obj1 !== null && typeof obj2 === 'object' && obj2 !== null) {
                // Remove ppi field from images for comparison
                let processed1 = obj1 as Record<string, unknown>;
                let processed2 = obj2 as Record<string, unknown>;
                if (processed1['data'] && typeof processed1['data'] === 'string' && processed1.hasOwnProperty('ppi')) {
                    const { ppi, ...rest } = processed1;
                    processed1 = rest;
                }
                if (processed2['data'] && typeof processed2['data'] === 'string' && processed2.hasOwnProperty('ppi')) {
                    const { ppi, ...rest } = processed2;
                    processed2 = rest;
                }

                if (processed1['generator_version'] === '') {
                    const { generator_version, ...rest } = processed1;
                    processed1 = rest;
                }
                if (processed2['generator_version'] === '') {
                    const { generator_version, ...rest } = processed2;
                    processed2 = rest;
                }
                
                // Get all unique keys from both objects
                const allKeys = new Set([...Object.keys(processed1), ...Object.keys(processed2)]);
                
                for (const key of allKeys) {
                    const val1 = processed1[key];
                    const val2 = processed2[key];
                    
                    // Skip if one is undefined and the other is empty string
                    if ((val1 === undefined && val2 === "") || (val2 === undefined && val1 === "")) continue;
                    // Skip if one is undefined and the other is color: undefined
                    if (key === "color" && (val1 === undefined || val2 === undefined)) continue;
                    // Skip if both are undefined
                    if (val1 === undefined && val2 === undefined) continue;
                    // If one is undefined and the other is not, return false
                    if (val1 === undefined || val2 === undefined) return false;
                    
                    if (!_.isEqualWith(val1, val2, semanticComparator)) return false;
                }
                
                return true;
            }
            
            // Otherwise, let lodash handle it
            return undefined;
        }

        // Round-trip test with semantic comparison instead of string comparison
        it(`[${relPath}] parse → save → parse is semantically equivalent (round-trip 1)`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed1 = parser.parse(original);
            const serialized = parser.save(parsed1);
            const parsed2 = parser.parse(serialized);
            
            if (!_.isEqualWith(parsed1, parsed2, semanticComparator)) {
                console.log(diff(parsed1, parsed2));
            }
            expect(_.isEqualWith(parsed1, parsed2, semanticComparator)).toBe(true);
        });

        it(`[${relPath}] parse → save → parse → save is stable (round-trip 2)`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed1 = parser.parse(original);
            const serialized1 = parser.save(parsed1);
            const parsed2 = parser.parse(serialized1);
            const serialized2 = parser.save(parsed2);
            const parsed3 = parser.parse(serialized2);
            
            expect(_.isEqualWith(parsed1, parsed3, semanticComparator)).toBe(true);
        });

        it(`[${relPath}] passes KiCad CLI ERC after serialization`, () => {
            const original = fs.readFileSync(filePath, "utf8");

            const parsed = parser.parse(original);
            const serialized = parser.save(parsed);

            const baseName = path.basename(filePath);
            const dirName = path.dirname(filePath);

            const tempDir = fs.mkdtempSync(
                path.join(os.tmpdir(), "kicad-test-"),
            );
            const keepTemp = process.env["KEEP_KICAD_TESTS"] === "1";

            try {
                // Copy full project context
                const entries = fs.readdirSync(dirName, {
                    withFileTypes: true,
                });
                for (const entry of entries) {
                    const src = path.join(dirName, entry.name);
                    const dest = path.join(tempDir, entry.name);

                    if (entry.isDirectory()) {
                        fs.cpSync(src, dest, { recursive: true });
                    } else {
                        fs.copyFileSync(src, dest);
                    }
                }

                const serFile = path.join(tempDir, baseName);
                fs.writeFileSync(serFile, serialized, "utf8");

                // Round-trip stability check using semantic comparison
                const reparsed = parser.parse(serialized);
                const reserialized = parser.save(reparsed);
                const rereparsed = parser.parse(reserialized);
                
                expect(_.isEqualWith(reparsed, rereparsed, semanticComparator)).toBe(true);

                // --- ERC EXECUTION ---
                try {
                    execSync(`kicad-cli sch erc "${serFile}"`, {
                        stdio: "pipe",
                        encoding: "utf8",
                    });
                } catch (err: any) {
                    console.error(
                        "\n================ ERC FAILURE ================",
                    );
                    console.error(`File: ${relPath}`);
                    console.error(`Temp Dir: ${tempDir}`);
                    console.error(
                        `Repro command: kicad-cli sch erc "${serFile}"`,
                    );

                    if (err.stdout) {
                        console.error("\n--- STDOUT ---");
                        console.error(err.stdout.toString());
                    }

                    if (err.stderr) {
                        console.error("\n--- STDERR ---");
                        console.error(err.stderr.toString());
                    }

                    console.error(
                        "=============================================\n",
                    );

                    // Keep temp dir for debugging
                    if (!keepTemp) {
                        console.error(
                            `(Set KEEP_KICAD_TESTS=1 to preserve temp dirs)`,
                        );
                    }

                    throw err; // fail test
                } finally {
                    // Remove any *.rpt files generated by ERC
                    const rptFiles = fs.readdirSync(tempDir).filter(file => file.endsWith('.rpt'));
                    for (const rptFile of rptFiles) {
                        fs.unlinkSync(path.join(tempDir, rptFile));
                    }
                }
            } finally {
                if (!keepTemp) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } else {
                    console.log(`⚠️  Preserved temp dir: ${tempDir}`);
                }
            }
        });
    });
});
