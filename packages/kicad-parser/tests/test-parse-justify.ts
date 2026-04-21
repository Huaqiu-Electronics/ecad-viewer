#!/usr/bin/env tsx
import { parseEffects } from "../src/common";
import { listify, tokenize } from "../src/tokenizer";
import { parse_expr, P, T } from "../src/sexpr";

const testSnippets = ["(justify left center)", "(justify right bottom)", "(justify left center mirror)"];
console.log("=== Test parseEffects ===");
for (const s of testSnippets) {
    console.log("\n=== Parsing snippet:", s);
    const listed = listify(s);
    console.log("listify gives:", listed);
    console.log("listify first element:", listed[0]);
    const parsedEffects = parseEffects(listed[0]);
    console.log("parseEffects returns:", parsedEffects);
}
console.log("\n=== Now what does parse_expr do when you call parseEffects on a justify expression ===");
const s = "(justify left center)";
const listed = listify(s);
console.log("=== listify of (justify left center):", listed);
const tryParseJustify = parse_expr(listed[0], 
    P.start("justify"),
    P.atom("horiz", ["left", "right"]),
    P.atom("vert", ["top", "bottom"]),
    P.atom("mirror"),
);
console.log("=== tryParseJustify:", tryParseJustify);
