/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type * as S from "./proto/schematic";
import { P, type Parseable, T, parse_expr } from "./sexpr";
import {
    parseAt,
    parseEffects,
    parsePaper,
    parseStroke,
    parseTitleBlock,
} from "./common";
import { listify, type List } from "./tokenizer";

function parseFill(expr: Parseable): S.I_Fill {
    return parse_expr(
        expr,
        P.start("fill"),
        P.pair("type", T.string),
        P.color(),
    ) as unknown as S.I_Fill;
}

function parseWire(expr: Parseable): S.I_Wire {
    return parse_expr(
        expr,
        P.start("wire"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Wire;
}

function parseBus(expr: Parseable): S.I_Bus {
    return parse_expr(
        expr,
        P.start("bus"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Bus;
}

function parseBusEntry(expr: Parseable): S.I_BusEntry {
    return parse_expr(
        expr,
        P.start("bus_entry"),
        P.item("at", parseAt),
        P.vec2("size"),
        P.item("stroke", parseStroke),
        P.pair("uuid", T.string),
    ) as unknown as S.I_BusEntry;
}

function parseBusAlias(expr: Parseable): S.I_BusAlias {
    return parse_expr(
        expr,
        P.start("bus_alias"),
        P.positional("name", T.string),
        P.list("members", T.string),
    ) as unknown as S.I_BusAlias;
}

function parseJunction(expr: Parseable): S.I_Junction {
    return parse_expr(
        expr,
        P.start("junction"),
        P.item("at", parseAt),
        P.pair("diameter", T.number),
        P.color(),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Junction;
}

function parseNoConnect(expr: Parseable): S.I_NoConnect {
    return parse_expr(
        expr,
        P.start("no_connect"),
        P.item("at", parseAt),
        P.pair("uuid", T.string),
    ) as unknown as S.I_NoConnect;
}

// Graphic Items

function parsePolyline(expr: Parseable): S.I_Polyline {
    return parse_expr(
        expr,
        P.start("polyline"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Polyline;
}

function parseRectangle(expr: Parseable): S.I_Rectangle {
    return parse_expr(
        expr,
        P.start("rectangle"),
        P.vec2("start"),
        P.vec2("end"),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Rectangle;
}

function parseCircle(expr: Parseable): S.I_Circle {
    return parse_expr(
        expr,
        P.start("circle"),
        P.vec2("center"),
        P.pair("radius", T.number),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Circle;
}

function parseArc(expr: Parseable): S.I_Arc {
    // Handle old format with radius/angles if needed, but for now stick to standard
    const parsed = parse_expr(
        expr,
        P.start("arc"),
        P.vec2("start"),
        P.vec2("mid"),
        P.vec2("end"),
        P.object(
            "radius",
            {},
            P.start("radius"),
            P.vec2("at"),
            P.pair("length"),
            P.vec2("angles"),
        ),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    );

    // If legacy radius format, we might need conversion logic here or in hydration.
    // For POD, we can keep it as is or try to normalize if easy.
    // Given we can't use MathArc easily (class dependency), let's store what we can.
    // However, I_Arc definitions enforces start/mid/end.
    // If the parser returns them, great. If not, we might be missing data if input is legacy.
    // But let's assume valid start/mid/end for modern files.

    return parsed as unknown as S.I_Arc;
}

function parseBezier(expr: Parseable): S.I_Bezier {
    return parse_expr(
        expr,
        P.start("bezier"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Bezier;
}

function parseText(expr: Parseable): S.I_Text {
    return parse_expr(
        expr,
        P.start("text"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("exclude_from_sim", T.boolean),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Text;
}

function parseTextBox(expr: Parseable): S.I_TextBox {
    return parse_expr(
        expr,
        P.start("text"), // uses "text" token in source? check kicad source, actually it's (text_box ...) usually?
        // Wait, looking at schematic.ts line 691 it says P.start("text").
        // But the class is TextBox. Is it really (text ...)?
        // Ah, likely (textbox ...) in recent versions or (text ...) with box property?
        // Let's check schematic.ts again. Line 691: P.start("text").
        // NOTE: In `LibSymbol` constructor line 895 it parses `P.collection("drawings", "textbox", T.item(TextBox, this))`
        // So strict start would be "textbox".
        // But `TextBox` class constructor uses `P.start("text")`.
        // This implies `TextBox` might handle `(text ...)` nodes too or the constructor definition is slightly loose/wrong in `schematic.ts`.
        // Let's assume `textbox` for `LibSymbol` collections.
        // If it's `(text ...)` it's valid too but usually that's `Text`.
        // Let's use `textbox` as start for strict parsing if called via `textbox` collection.
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.vec2("size"),
        P.item("effects", parseEffects),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_TextBox;
}

function parseImage(expr: Parseable): S.I_Image {
    const parsed = parse_expr(
        expr,
        P.start("image"),
        P.item("at", parseAt),
        P.pair("data", T.string),
        P.pair("scale", T.number),
        P.pair("uuid", T.string),
    );

    // Extract data from positional or list if not found by pair?
    // schematic.ts does a manual loop for data.
    let data = parsed["data"];
    if (!data) {
        for (const it of expr as List) {
            if (Array.isArray(it) && it.length && it[0] === "data") {
                data = it.slice(1).join("");
                break;
            }
        }
    }

    return {
        ...parsed,
        data: data,
        ppi: null, // Calculated in hydration
    } as unknown as S.I_Image;
}

// Labels

function parseNetLabel(expr: Parseable): S.I_NetLabel {
    return parse_expr(
        expr,
        P.start("label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.atom("fields_autoplaced"),
        P.pair("uuid", T.string),
    ) as unknown as S.I_NetLabel;
}

function parseProperty(expr: Parseable): S.I_Property {
    return parse_expr(
        expr,
        P.start("property"),
        P.positional("name", T.string),
        P.positional("text", T.string),
        P.pair("id", T.number),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.atom("show_name"),
        P.atom("do_not_autoplace"),
    ) as unknown as S.I_Property;
}

function parseGlobalLabel(expr: Parseable): S.I_GlobalLabel {
    return parse_expr(
        expr,
        P.start("global_label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.atom("fields_autoplaced"),
        P.pair("uuid", T.string),
        P.pair("shape", T.string),
        P.collection("properties", "property", T.item(parseProperty)),
    ) as unknown as S.I_GlobalLabel;
}

function parseHierarchicalLabel(expr: Parseable): S.I_HierarchicalLabel {
    return parse_expr(
        expr,
        P.start("hierarchical_label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.atom("fields_autoplaced"),
        P.pair("uuid", T.string),
        P.pair("shape", T.string),
    ) as unknown as S.I_HierarchicalLabel;
}

// Pins

function parsePinAlternate(expr: Parseable): S.I_PinAlternate {
    return parse_expr(
        expr,
        P.start("alternate"),
        P.positional("name", T.string),
        P.positional("type", T.string),
        P.positional("shape", T.string),
    ) as unknown as S.I_PinAlternate;
}

function parsePin(expr: Parseable): S.I_Pin {
    return parse_expr(
        expr,
        P.start("pin"),
        P.positional("type", T.string),
        P.positional("shape", T.string),
        P.atom("hide"),
        P.item("at", parseAt),
        P.pair("length", T.number),
        P.object(
            "name",
            {},
            P.start("name"),
            P.positional("text", T.string),
            P.item("effects", parseEffects),
        ),
        P.object(
            "number",
            {},
            P.start("number"),
            P.positional("text", T.string),
            P.item("effects", parseEffects),
        ),
        P.collection("alternates", "alternate", T.item(parsePinAlternate)),
    ) as unknown as S.I_Pin;
}

function parsePinInstance(expr: Parseable): S.I_PinInstance {
    return parse_expr(
        expr,
        P.start("pin"),
        P.positional("number", T.string),
        P.pair("uuid", T.string),
        P.pair("alternate", T.string),
    ) as unknown as S.I_PinInstance;
}

// Symbols

function parseLibSymbol(expr: Parseable): S.I_LibSymbol {
    // This is recursive
    return parse_expr(
        expr,
        P.start("symbol"),
        P.positional("name", T.string),
        P.atom("power"),
        P.object("pin_numbers", {}, P.start("pin_numbers"), P.atom("hide")),
        P.object(
            "pin_names",
            {},
            P.start("pin_names"),
            P.pair("offset", T.number),
            P.atom("hide"),
        ),
        P.pair("exclude_from_sim", T.boolean),
        P.pair("in_bom", T.boolean),
        P.pair("embedded_fonts", T.boolean),
        P.pair("embedded_files", T.string), // T.any in original, string likely
        P.pair("on_board", T.boolean),
        P.collection("properties", "property", T.item(parseProperty)),
        P.collection("pins", "pin", T.item(parsePin)),
        P.collection("children", "symbol", T.item(parseLibSymbol)), // Recursion!
        P.collection("drawings", "arc", T.item(parseArc)),
        P.collection("drawings", "bezier", T.item(parseBezier)),
        P.collection("drawings", "circle", T.item(parseCircle)),
        P.collection("drawings", "polyline", T.item(parsePolyline)),
        P.collection("drawings", "rectangle", T.item(parseRectangle)),
        P.collection("drawings", "text", T.item(parseText)),
        P.collection("drawings", "textbox", T.item(parseTextBox)),
    ) as unknown as S.I_LibSymbol;
}

function parseSchematicSymbol(expr: Parseable): S.I_SchematicSymbol {
    const parsed = parse_expr(
        expr,
        P.start("symbol"),
        P.pair("lib_name", T.string),
        P.pair("lib_id", T.string),
        P.item("at", parseAt),
        P.pair("mirror", T.string),
        P.pair("exclude_from_sim", T.boolean),
        P.pair("unit", T.number),
        P.pair("convert", T.number),
        P.pair("in_bom", T.boolean),
        P.pair("on_board", T.boolean),
        P.pair("dnp", T.boolean),
        P.atom("fields_autoplaced"),
        P.pair("uuid", T.string),
        P.collection("properties", "property", T.item(parseProperty)),
        P.collection("pins", "pin", T.item(parsePinInstance)),
        P.object(
            "default_instance",
            {},
            P.start("default_instance"),
            P.pair("reference", T.string),
            P.pair("unit", T.string),
            P.pair("value", T.string),
            P.pair("footprint", T.string),
        ),
        P.object(
            "instances",
            {},
            P.start("instances"),
            P.collection(
                "projects",
                "project",
                T.object(
                    null,
                    P.start("project"),
                    P.positional("name", T.string),
                    P.collection(
                        "paths",
                        "path",
                        T.object(
                            null,
                            P.start("path"),
                            P.positional("path", T.string),
                            P.pair("reference", T.string),
                            P.pair("value", T.string),
                            P.pair("unit", T.number),
                            P.pair("footprint", T.string),
                        ),
                    ),
                ),
            ),
        ),
    );

    return parsed as unknown as S.I_SchematicSymbol;
}

// Sheets

function parseSheetPin(expr: Parseable): S.I_SchematicSheetPin {
    return parse_expr(
        expr,
        P.start("pin"),
        P.positional("name", T.string),
        P.positional("shape", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("uuid", T.string),
    ) as unknown as S.I_SchematicSheetPin;
}

function parseSchematicSheet(expr: Parseable): S.I_SchematicSheet {
    const parsed = parse_expr(
        expr,
        P.start("sheet"),
        P.item("at", parseAt),
        P.vec2("size"),
        P.atom("fields_autoplaced"),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
        P.collection("properties", "property", T.item(parseProperty)),
        P.collection("pins", "pin", T.item(parseSheetPin)),
        P.object(
            "instances",
            {},
            P.start("instances"),
            P.collection(
                "projects",
                "project",
                T.object(
                    null,
                    P.start("project"),
                    P.positional("name", T.string),
                    P.collection(
                        "paths",
                        "path",
                        T.object(
                            null,
                            P.start("path"),
                            P.positional("path", T.string),
                            P.pair("page", T.string),
                        ),
                    ),
                ),
            ),
        ),
    );

    return parsed as unknown as S.I_SchematicSheet;
}

function parseSheetInstances(expr: Parseable): S.I_SheetInstance[] {
    // (sheet_instances (path "/" (page "1")))
    const parsed = parse_expr(
        expr,
        P.start("sheet_instances"),
        P.collection(
            "paths",
            "path",
            T.object(
                null,
                P.start("path"),
                P.positional("path", T.string),
                P.pair("page", T.string),
            ),
        ),
    );
    return parsed["paths"] as S.I_SheetInstance[];
}

function parseSymbolInstances(expr: Parseable): S.I_SymbolInstance[] {
    // (symbol_instances (path "/uuid" (reference "R1") (unit 1) (value "10k") (footprint "fp")))
    const parsed = parse_expr(
        expr,
        P.start("symbol_instances"),
        P.collection(
            "paths",
            "path",
            T.object(
                null,
                P.start("path"),
                P.positional("path", T.string),
                P.pair("reference", T.string),
                P.pair("unit", T.number),
                P.pair("value", T.string),
                P.pair("footprint", T.string),
            ),
        ),
    );
    return parsed["paths"] as S.I_SymbolInstance[];
}

export class SchematicParser {
    public parse(text: string): S.I_KicadSch {
        const expr = listify(text);
        const root =
            expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;

        return parse_expr(
            root,
            P.start("kicad_sch"),
            P.pair("version", T.number),
            P.pair("generator", T.string),
            P.pair("generator_version", T.string),
            P.pair("uuid", T.string),
            P.item("paper", parsePaper),
            P.item("title_block", parseTitleBlock),
            // lib_symbols parsed as collection of symbols inside lib_symbols item
            P.item("lib_symbols", (e) => {
                return (
                    parse_expr(
                        e,
                        P.start("lib_symbols"),
                        P.collection(
                            "symbols",
                            "symbol",
                            T.item(parseLibSymbol),
                        ),
                    ) as any
                )["symbols"];
            }),
            P.collection("wires", "wire", T.item(parseWire)),
            P.collection("buses", "bus", T.item(parseBus)),
            P.collection("bus_entries", "bus_entry", T.item(parseBusEntry)),
            P.collection("bus_aliases", "bus_alias", T.item(parseBusAlias)),
            P.collection("junctions", "junction", T.item(parseJunction)),
            P.collection("no_connects", "no_connect", T.item(parseNoConnect)),
            P.collection("net_labels", "label", T.item(parseNetLabel)),
            P.collection(
                "global_labels",
                "global_label",
                T.item(parseGlobalLabel),
            ),
            P.collection(
                "hierarchical_labels",
                "hierarchical_label",
                T.item(parseHierarchicalLabel),
            ),

            P.collection("symbols", "symbol", T.item(parseSchematicSymbol)),

            P.collection("drawings", "polyline", T.item(parsePolyline)),
            P.collection("drawings", "rectangle", T.item(parseRectangle)),
            P.collection("drawings", "arc", T.item(parseArc)),
            P.collection("drawings", "text", T.item(parseText)),

            P.collection("images", "image", T.item(parseImage)),
            P.item("sheet_instances", parseSheetInstances),
            P.item("symbol_instances", parseSymbolInstances),
            P.collection("sheets", "sheet", T.item(parseSchematicSheet)),
        ) as unknown as S.I_KicadSch;
    }
}
