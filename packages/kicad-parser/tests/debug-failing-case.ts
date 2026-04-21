#!/usr/bin/env tsx
import { SchematicParser } from '../src/schematic_parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, 'demos', 'video', 'video.kicad_sch');
const content = fs.readFileSync(testFile, 'utf8');
const parser = new SchematicParser();

console.log('=== Parsing... ===');
try {
    const schematic = parser.parse(content);
    console.log('✅ Parse successful');

    console.log('=== Looking for BNC symbol... ===');
    const bncSymbol = schematic.lib_symbols?.find(s => s.name === 'video_schlib:BNC');
    if (bncSymbol) {
        console.log('=== BNC symbol found! Logging full object... ===');
        console.log(JSON.stringify(bncSymbol, null, 2));
    }

} catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
}
