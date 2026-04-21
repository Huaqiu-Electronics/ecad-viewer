#!/usr/bin/env tsx
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file1 = path.join(__dirname, "../.temp/serialized.txt");
const file2 = path.join(__dirname, "../.temp/reserialized.txt");
const str1 = fs.readFileSync(file1, "utf-8");
const str2 = fs.readFileSync(file2, "utf-8");
const minLen = Math.min(str1.length, str2.length);

for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) {
        console.log(`Found first difference at index ${i}:`);
        console.log(`str1[${i}] = "${str1[i]}" (char code ${str1.charCodeAt(i)})`);
        console.log(`str2[${i}] = "${str2[i]}" (char code ${str2.charCodeAt(i)})`);
        const start = Math.max(0, i - 200);
        const end = Math.min(str1.length, i + 200);
        console.log("\nContext around difference:");
        console.log("\nstr1 (serialized):");
        console.log(str1.substring(start, end));
        console.log("\nstr2 (reserialized):");
        console.log(str2.substring(start, end));
        break;
    }
}
