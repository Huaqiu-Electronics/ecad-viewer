import { SchematicParser } from "../src/schematic_parser";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import type * as S from "../src/proto/schematic";
import _ from "lodash";

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

        // Round-trip test with semantic comparison instead of string comparison
        it(`[${relPath}] parse → save → parse is semantically equivalent (round-trip 1)`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed1 = parser.parse(original);
            const serialized = parser.save(parsed1);
            const parsed2 = parser.parse(serialized);
            expect(_.isEqual(parsed1, parsed2)).toBe(true);
        });

        it(`[${relPath}] parse → save → parse → save is stable (round-trip 2)`, () => {
            const original = fs.readFileSync(filePath, "utf8");
            const parsed1 = parser.parse(original);
            const serialized1 = parser.save(parsed1);
            const parsed2 = parser.parse(serialized1);
            const serialized2 = parser.save(parsed2);
            const parsed3 = parser.parse(serialized2);
            expect(_.isEqual(parsed1, parsed3)).toBe(true);
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
            const keepTemp = process.env.KEEP_KICAD_TESTS === "1";

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
                expect(_.isEqual(reparsed, rereparsed)).toBe(true);

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
