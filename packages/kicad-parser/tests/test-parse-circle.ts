#!/usr/bin/env tsx
import { parseCircle } from "../src/schematic_parser";
import { listify } from "../src/tokenizer";
const snippet1 = "(circle (center (xy 0 0)) (radius 0.508) (stroke (width 0.2032) (type \"default\")) (fill))";
console.log("snippet 1:", snippet1);
const listed1 = listify(snippet1);
console.log("listed 1:", listed1);
const parsedCircle1 = parseCircle(listed1[0]);
console.log("parsedCircle1 returned:", parsedCircle1);
console.log("JSON.stringify parsedCircle1:", JSON.stringify(parsedCircle1));
console.log("typeof parsedCircle1.center.x:", typeof parsedCircle1.center.x);
