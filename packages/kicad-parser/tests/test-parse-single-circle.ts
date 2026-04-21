#!/usr/bin/env tsx
import { parseCircle } from "../src/schematic_parser";
import { listify } from "../src/tokenizer";
const snippet = "(circle (center (xy 0 0)) (radius 0.508) (stroke (width 0.2032) (type \"default\")) (fill))";
const listed = listify(snippet);
console.log("listed:", JSON.stringify(listed, null, 2));
const parsedCircle = parseCircle(listed[0]);
console.log("parsedCircle:", parsedCircle);
console.log("parsedCircle.center:", parsedCircle.center);
console.log("parsedCircle.center.x:", parsedCircle.center?.x);
console.log("parsedCircle.center.y:", parsedCircle.center?.y);
