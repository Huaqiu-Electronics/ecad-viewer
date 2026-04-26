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
import { serializeSchematic, serializeLibSymbol } from "./schematic_serializer";

function parseFill(expr: Parseable): S.I_Fill {
    const parsed = parse_expr(
        expr,
        P.start("fill"),
        P.color(),
        P.pair("type", T.string),
    ) as any;
    return {
        type: parsed.type || "none",
        color: parsed.color,
    } as S.I_Fill;
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
        P.item("members", (e) => {
            // Directly process the members list without calling parse_expr
            // e is the (members "member1" "member2" ...) list
            if (Array.isArray(e) && e.length > 1) {
                return e.slice(1).map((member) => {
                    if (typeof member === "string") {
                        return member;
                    }
                    return "";
                });
            }
            return [];
        }),
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
    const parsed = parse_expr(
        expr,
        P.start("polyline"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Polyline;
    return { ...parsed, type: "polyline" };
}

function parseCenterOrStartOrEnd(
    expr: Parseable,
    name: string,
): { x: number; y: number } {
    // Check if the expression has an inner (xy x y) or just x y as arguments
    if (Array.isArray(expr)) {
        // First check if the second element is another array starting with "xy"
        if (expr.length >= 2 && Array.isArray(expr[1]) && expr[1][0] === "xy") {
            // Case: (name (xy x y))
            return parse_expr(expr, P.start(name), P.vec2("xy"))["xy"];
        } else if (
            expr.length >= 3 &&
            typeof expr[1] === "number" &&
            typeof expr[2] === "number"
        ) {
            // Case: (name x y)
            return { x: expr[1], y: expr[2] };
        }
    }
    // Fallback
    return { x: 0, y: 0 };
}

function parseRectangle(expr: Parseable): S.I_Rectangle {
    const parsed = parse_expr(
        expr,
        P.start("rectangle"),
        P.item("start", (e) => parseCenterOrStartOrEnd(e, "start")),
        P.item("end", (e) => parseCenterOrStartOrEnd(e, "end")),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Rectangle;
    return { ...parsed, type: "rectangle" };
}

function parseCircle(expr: Parseable): S.I_Circle {
    // Parse circle, handling (center (xy x y)) or (center x y)
    const parsed = parse_expr(
        expr,
        P.start("circle"),
        P.item("center", (e) => parseCenterOrStartOrEnd(e, "center")),
        P.pair("radius", T.number),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    return { ...parsed, type: "circle" };
}

function parseArc(expr: Parseable): S.I_Arc {
    const parsed = parse_expr(
        expr,
        P.start("arc"),
        P.item("start", (e) => parseCenterOrStartOrEnd(e, "start")),
        P.item("mid", (e) => parseCenterOrStartOrEnd(e, "mid")),
        P.item("end", (e) => parseCenterOrStartOrEnd(e, "end")),
        P.object(
            "radius",
            {},
            P.start("radius"),
            P.item("at", (e) => parseCenterOrStartOrEnd(e, "at")),
            P.pair("length"),
            P.item("angles", (e) => parseCenterOrStartOrEnd(e, "angles")),
        ),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Arc;
    return { ...parsed, type: "arc" };
}

function parseBezier(expr: Parseable): S.I_Bezier {
    const parsed = parse_expr(
        expr,
        P.start("bezier"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Bezier;
    return { ...parsed, type: "bezier" };
}

function parseText(expr: Parseable): S.I_Text {
    const parsed = parse_expr(
        expr,
        P.start("text"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("exclude_from_sim", T.boolean),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Text;
    return { ...parsed, type: "text" };
}

function parseTextBox(expr: Parseable): S.I_TextBox {
    const parsed = parse_expr(
        expr,
        P.start("text_box"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.vec2("size"),
        P.item("effects", parseEffects),
        P.item("stroke", parseStroke),
        P.item("fill", parseFill),
        P.pair("exclude_from_sim", T.boolean),
        P.vec4("margins"),
        P.pair("uuid", T.string),
    ) as unknown as S.I_TextBox;
    return { ...parsed, type: "text_box" };
}

function parseImage(expr: Parseable): S.I_Image {
    let data = "";
    for (const it of expr as List) {
        if (Array.isArray(it) && it.length && it[0] === "data") {
            data = it.slice(1).join("");
            break;
        }
    }
    const parsed = parse_expr(
        expr,
        P.start("image"),
        P.item("at", parseAt),
        P.pair("scale", T.number),
        P.pair("uuid", T.string),
    );

    return {
        ...parsed,
        data: data,
        ppi: null,
        scale: typeof parsed["scale"] === "number" ? parsed["scale"] : 1,
    } as unknown as S.I_Image;
}

// Labels

function parseNetLabel(expr: Parseable): S.I_NetLabel {
    const parsed = parse_expr(
        expr,
        P.start("label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("fields_autoplaced", T.boolean),
        P.pair("uuid", T.string),
    );

    return {
        text: parsed["text"],
        at: parsed["at"],
        effects: parsed["effects"],
        fields_autoplaced: parsed["fields_autoplaced"] || false,
        uuid: parsed["uuid"],
    } as unknown as S.I_NetLabel;
}

function parseProperty(expr: Parseable): S.I_Property {
    const parsed = parse_expr(
        expr,
        P.start("property"),
        P.atom("private"),
        P.positional("name", T.string),
        P.positional("text", T.string),
        P.pair("id", T.number),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.atom("show_name"),
        P.atom("do_not_autoplace"),
        P.atom("hide"),
    ) as any;
    return {
        name: parsed.name,
        text: parsed.text,
        id: parsed.id ?? 0,
        at: parsed.at,
        show_name: parsed.show_name || false,
        do_not_autoplace: parsed.do_not_autoplace || false,
        hide: parsed.hide || false,
        effects: parsed.effects,
        private: parsed.private || false,
    } as S.I_Property;
}

function parseGlobalLabel(expr: Parseable): S.I_GlobalLabel {
    const parsed = parse_expr(
        expr,
        P.start("global_label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("fields_autoplaced", T.boolean),
        P.pair("uuid", T.string),
        P.pair("shape", T.string),
        P.collection("properties", "property", T.item(parseProperty)),
    );

    return {
        text: parsed["text"],
        at: parsed["at"],
        effects: parsed["effects"],
        fields_autoplaced: parsed["fields_autoplaced"] || false,
        uuid: parsed["uuid"],
        shape: parsed["shape"],
        properties: parsed["properties"] || [],
    } as unknown as S.I_GlobalLabel;
}

function parseHierarchicalLabel(expr: Parseable): S.I_HierarchicalLabel {
    const parsed = parse_expr(
        expr,
        P.start("hierarchical_label"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.item("effects", parseEffects),
        P.pair("fields_autoplaced", T.boolean),
        P.pair("uuid", T.string),
        P.pair("shape", T.string),
    );

    return {
        text: parsed["text"],
        at: parsed["at"],
        effects: parsed["effects"],
        fields_autoplaced: parsed["fields_autoplaced"] || false,
        uuid: parsed["uuid"],
        shape: parsed["shape"],
    } as unknown as S.I_HierarchicalLabel;
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
        P.pair("fields_autoplaced", T.boolean),
        P.pair("uuid", T.string),
        P.collection("properties", "property", T.item(parseProperty)),
        P.collection("pins", "pin", T.item(parsePinInstance)),
        P.object(
            "default_instance",
            {},
            P.start("default_instance"),
            P.pair("reference", T.string),
            P.pair("unit", T.number),
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

    return {
        lib_name: parsed["lib_name"],
        lib_id: parsed["lib_id"],
        at: parsed["at"],
        mirror: parsed["mirror"],
        exclude_from_sim: parsed["exclude_from_sim"] || false,
        unit: parsed["unit"] || 0,
        convert: parsed["convert"] || 0,
        in_bom: parsed["in_bom"] || false,
        on_board: parsed["on_board"] || false,
        dnp: parsed["dnp"] || false,
        fields_autoplaced: parsed["fields_autoplaced"] || false,
        uuid: parsed["uuid"],
        properties: parsed["properties"] || [],
        pins: parsed["pins"] || [],
        default_instance: parsed["default_instance"] || {},
        instances: parsed["instances"] || { projects: [] },
    } as unknown as S.I_SchematicSymbol;
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
        P.pair("fields_autoplaced", T.boolean),
        P.pair("exclude_from_sim", T.boolean),
        P.pair("in_bom", T.boolean),
        P.pair("on_board", T.boolean),
        P.pair("dnp", T.boolean),
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

    return {
        at: parsed["at"],
        size: parsed["size"],
        fields_autoplaced: parsed["fields_autoplaced"] || false,
        exclude_from_sim: parsed["exclude_from_sim"] || false,
        in_bom: parsed["in_bom"] || false,
        on_board: parsed["on_board"] || false,
        dnp: parsed["dnp"] || false,
        stroke: parsed["stroke"],
        fill: parsed["fill"],
        properties: parsed["properties"] || [],
        pins: parsed["pins"] || [],
        uuid: parsed["uuid"],
        instances: parsed["instances"] || { projects: [] },
    } as unknown as S.I_SchematicSheet;
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

export {
    parseLibSymbol,
    parseCircle,
    parseArc,
    parseBezier,
    parseRectangle,
    parsePolyline,
    parseText,
    parseTextBox,
};
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
            P.pair("embedded_fonts", T.boolean),
            P.item("title_block", parseTitleBlock),
            // lib_symbols parsed as collection of symbols inside lib_symbols item
            P.item("lib_symbols", (e) => {
        const parsed = parse_expr(
            e,
            P.start("lib_symbols"),
            P.collection(
                "symbols",
                "symbol",
                T.item(parseLibSymbol),
            ),
        ) as any;
        return parsed["symbols"] ?? [];
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
            P.collection("drawings", "bezier", T.item(parseBezier)),
            P.collection("drawings", "text_box", T.item(parseTextBox)),
            P.collection("drawings", "circle", T.item(parseCircle)),

            P.collection("images", "image", T.item(parseImage)),
            P.item("sheet_instances", parseSheetInstances),
            P.item("symbol_instances", parseSymbolInstances),
            P.collection("sheets", "sheet", T.item(parseSchematicSheet)),
        ) as unknown as S.I_KicadSch;
    }

    public save(schematic: S.I_KicadSch): string {
        return serializeSchematic(schematic);
    }

    public parseLibSymbols(text: string): S.I_LibSymbol[] { 
        const expr = listify(text);
        const root = expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;

        const parsed = parse_expr(
            root,
            P.start("kicad_symbol_lib"),
            P.pair("version", T.number),
            P.pair("generator", T.string),
            P.pair("generator_version", T.string),
            P.collection("symbols", "symbol", T.item(parseLibSymbol)),
        ) as any;

        return parsed["symbols"] ?? [];
    }
    public saveLibSymbols(libSymbols: S.I_LibSymbol[]): string { 
        let result = "(kicad_symbol_lib\n";
        const indent = 1;
        
        result += `${"\t".repeat(indent)}(version 20251024)\n`;
        result += `${"\t".repeat(indent)}(generator "kicad_symbol_editor")\n`;
        result += `${"\t".repeat(indent)}(generator_version "10.0")\n`;
        
        for (const symbol of libSymbols) {
            result += serializeLibSymbol(symbol, indent);
        }
        
        result += `)\n`;
        return result;
    }
}
