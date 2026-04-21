#!/usr/bin/env tsx
import { tokenize, listify } from "../src/tokenizer";
const snippet = "(symbol \"BNC_0_1\" (circle (center (xy 0 0)) (radius 0.508) (stroke (width 0.2032) (type \"default\")) (fill)) (circle (center (xy 0 0)) (radius 1.778) (stroke (width 0.3048) (type \"default\")) (fill)))";
console.log("=== LISTIFY of snippet ===");
const tokens = Array.from(tokenize(snippet));
console.log("=== TOKENIZE result ===");
console.log(tokens);
console.log("\n=== LISTIFY ===");
const listed = listify(snippet);
console.log(listed);
console.log("\n=== LISTIFY JSON ===");
console.log(JSON.stringify(listed, null, 2));
console.log("\n=== Let's look at circle element's center ===");
console.log("listed[0] index 1:", listed[0]?.[1]); // circle
console.log("circle's first element:", listed[0]?.[1]?.[0]); // center?
