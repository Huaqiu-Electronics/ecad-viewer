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
import { serializeSchematic } from "./schematic_serializer";

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
    const wire = parse_expr(
        expr,
        P.start("wire"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Wire;
    return { ...wire, type: "wire" };
}

function parseBus(expr: Parseable): S.I_Bus {
    const bus = parse_expr(
        expr,
        P.start("bus"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.pair("uuid", T.string),
    ) as unknown as S.I_Bus;
    return { ...bus, type: "bus" };
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
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    
    // If we have inline stroke properties, create a stroke object
    if (parsed.width !== undefined || parsed.type !== undefined) {
        parsed.stroke = {
            width: parsed.width,
            type: parsed.type,
            color: parsed.color,
        };
        delete parsed.width;
        delete parsed.type;
        delete parsed.color;
    }
    
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
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    
    // If we have inline stroke properties, create a stroke object
    if (parsed.width !== undefined || parsed.type !== undefined) {
        parsed.stroke = {
            width: parsed.width,
            type: parsed.type,
            color: parsed.color,
        };
        delete parsed.width;
        delete parsed.type;
        delete parsed.color;
    }
    
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
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    
    // If we have inline stroke properties, create a stroke object
    if (parsed.width !== undefined) {
        parsed.stroke = {
            width: parsed.width,
            type: parsed.type || "default",
            color: parsed.color,
        };
        delete parsed.width;
        delete parsed.type;
        delete parsed.color;
    }
    
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
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    
    // If we have inline stroke properties, create a stroke object
    if (parsed.width !== undefined || parsed.type !== undefined) {
        parsed.stroke = {
            width: parsed.width,
            type: parsed.type,
            color: parsed.color,
        };
        delete parsed.width;
        delete parsed.type;
        delete parsed.color;
    }
    
    return { ...parsed, type: "arc" };
}

function parseBezier(expr: Parseable): S.I_Bezier {
    const parsed = parse_expr(
        expr,
        P.start("bezier"),
        P.list("pts", T.vec2),
        P.item("stroke", parseStroke),
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.item("fill", parseFill),
        P.pair("uuid", T.string),
    ) as any;
    
    // If we have inline stroke properties, create a stroke object
    if (parsed.width !== undefined || parsed.type !== undefined) {
        parsed.stroke = {
            width: parsed.width,
            type: parsed.type,
            color: parsed.color,
        };
        delete parsed.width;
        delete parsed.type;
        delete parsed.color;
    }
    
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
    const parsed = parse_expr(
        expr,
        P.start("property"),
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
        id: parsed.id || 0,
        at: parsed.at,
        show_name: parsed.show_name || false,
        do_not_autoplace: parsed.do_not_autoplace || false,
        hide: parsed.hide || false,
        effects: parsed.effects,
    } as S.I_Property;
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
        // Custom parsing to preserve order
        const expr = listify(text);
        const root = expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;
        
        const schematic: any = {
            version: 20250114,
            generator: "eeschema",
            generator_version: "",
            uuid: "",
            title_block: {},
            lib_symbols: [],
            elements: [],
            sheet_instances: [],
            symbol_instances: [],
        };
        
        // Parse top-level properties
        for (const element of root.slice(1)) {
            if (!Array.isArray(element)) continue;
            
            const [type, ...rest] = element;
            
            switch (type) {
                case "version":
                    schematic.version = rest[0];
                    break;
                case "generator":
                    schematic.generator = rest[0];
                    break;
                case "generator_version":
                    schematic.generator_version = rest[0];
                    break;
                case "uuid":
                    schematic.uuid = rest[0];
                    break;
                case "paper":
                    schematic.paper = parsePaper(element);
                    break;
                case "title_block":
                    schematic.title_block = parseTitleBlock(element);
                    break;
                case "lib_symbols":
                    const libSymbolsParsed = parse_expr(
                        element,
                        P.start("lib_symbols"),
                        P.collection("symbols", "symbol", T.item(parseLibSymbol)),
                    ) as any;
                    schematic.lib_symbols = libSymbolsParsed["symbols"] ?? [];
                    break;
                case "junction":
                    schematic.elements.push({ type: "junction", data: parseJunction(element) });
                    break;
                case "wire":
                    schematic.elements.push({ type: "wire", data: parseWire(element) });
                    break;
                case "bus":
                    schematic.elements.push({ type: "bus", data: parseBus(element) });
                    break;
                case "bus_entry":
                    schematic.elements.push({ type: "bus_entry", data: parseBusEntry(element) });
                    break;
                case "bus_alias":
                    schematic.elements.push({ type: "bus_alias", data: parseBusAlias(element) });
                    break;
                case "no_connect":
                    schematic.elements.push({ type: "no_connect", data: parseNoConnect(element) });
                    break;
                case "label":
                    schematic.elements.push({ type: "label", data: parseNetLabel(element) });
                    break;
                case "global_label":
                    schematic.elements.push({ type: "global_label", data: parseGlobalLabel(element) });
                    break;
                case "hierarchical_label":
                    schematic.elements.push({ type: "hierarchical_label", data: parseHierarchicalLabel(element) });
                    break;
                case "symbol":
                    schematic.elements.push({ type: "symbol", data: parseSchematicSymbol(element) });
                    break;
                case "polyline":
                    schematic.elements.push({ type: "polyline", data: parsePolyline(element) });
                    break;
                case "rectangle":
                    schematic.elements.push({ type: "rectangle", data: parseRectangle(element) });
                    break;
                case "arc":
                    schematic.elements.push({ type: "arc", data: parseArc(element) });
                    break;
                case "text":
                    schematic.elements.push({ type: "text", data: parseText(element) });
                    break;
                case "bezier":
                    schematic.elements.push({ type: "bezier", data: parseBezier(element) });
                    break;
                case "text_box":
                    schematic.elements.push({ type: "text_box", data: parseTextBox(element) });
                    break;
                case "circle":
                    schematic.elements.push({ type: "circle", data: parseCircle(element) });
                    break;
                case "image":
                    schematic.elements.push({ type: "image", data: parseImage(element) });
                    break;
                case "sheet_instances":
                    schematic.sheet_instances = parseSheetInstances(element);
                    break;
                case "symbol_instances":
                    schematic.symbol_instances = parseSymbolInstances(element);
                    break;
                case "sheet":
                    schematic.elements.push({ type: "sheet", data: parseSchematicSheet(element) });
                    break;
                case "embedded_fonts":
                    if (Array.isArray(element) && element.length > 1) {
                        schematic.embedded_fonts = element[1] === "yes";
                    }
                    break;
            }
        }
        
        return schematic as S.I_KicadSch;
    }

    public save(schematic: S.I_KicadSch): string {
        return serializeSchematic(schematic);
    }
}
