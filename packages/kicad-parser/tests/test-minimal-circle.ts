#!/usr/bin/env tsx
import { parseLibSymbol } from "../src/schematic_parser";
import { serializeLibSymbol } from "../src/schematic_serializer";
import { listify } from "../src/tokenizer";
const snippet = "(symbol \"BNC_0_1\" (circle (center (xy 0 0)) (radius 0.508) (stroke (width 0.2032) (type \"default\")) (fill)) (circle (center (xy 0 0)) (radius 1.778) (stroke (width 0.3048) (type \"default\")) (fill)))";
const listed = listify(snippet);
console.log("listed:", JSON.stringify(listed, null, 2));
const libSym = parseLibSymbol(listed[0]);
console.log("libSym.drawings:", libSym.drawings?.map((d, i) => `[${i}] type: ${Object.keys(d)}, center: ${JSON.stringify(d.center)}`));
const serialized = serializeLibSymbol(libSym);
console.log("serialized:", serialized);
