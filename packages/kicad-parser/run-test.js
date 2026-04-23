
import { SchematicParser } from './src/schematic_parser.js';
import fs from 'fs';
import path from 'path';

try {
    console.log('Starting test...');
    const testFile = path.join(process.cwd(), 'tests/demos/video/video.kicad_sch');
    console.log('Reading file:', testFile);
    const content = fs.readFileSync(testFile, 'utf8');
    console.log('Read file, length:', content.length);
    const parser = new SchematicParser();
    console.log('Parsing...');
    const parsed = parser.parse(content);
    console.log('Parsed successfully');
    console.log('Saving...');
    const serialized = parser.save(parsed);
    console.log('Saved successfully');
    console.log('Serialized length:', serialized.length);

    // Save to output file
    const outputFile = path.join(process.cwd(), 'test-output.kicad_sch');
    fs.writeFileSync(outputFile, serialized, 'utf8');
    console.log('Wrote output to', outputFile);

    // Compare
    if (content === serialized) {
        console.log('✅ SUCCESS: Output matches original!');
    } else {
        console.log('❌ FAILURE: Output differs!');
        // Write both to files for diff
        fs.writeFileSync(path.join(process.cwd(), 'original.txt'), content, 'utf8');
        fs.writeFileSync(path.join(process.cwd(), 'serialized.txt'), serialized, 'utf8');
        console.log('Wrote original.txt and serialized.txt for diff');
    }
} catch (err) {
    console.error('❌ ERROR:', err);
    if (err.stack) {
        console.error('Stack trace:', err.stack);
    }
}
