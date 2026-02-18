/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as DS from "./proto/drawing-sheet";
import { P, T, parse_expr } from "./sexpr";
import type { Parseable } from "./sexpr";

export function parse_drawing_sheet(expr: Parseable): DS.I_DrawingSheet {
    return parse_expr(
        expr,
        P.start("kicad_wks"),
        P.pair("version", T.number),
        P.pair("generator", T.string),
        P.item("setup", parse_setup),
        P.collection("drawings", "line", T.item(parse_line)),
        P.collection("drawings", "rect", T.item(parse_rect)),
        P.collection("drawings", "polygon", T.item(parse_polygon)),
        P.collection("drawings", "bitmap", T.item(parse_bitmap)),
        P.collection("drawings", "tbtext", T.item(parse_tbtext)),
    ) as unknown as DS.I_DrawingSheet;
}

function parse_setup(expr: Parseable): DS.I_Setup {
    return parse_expr(
        expr,
        P.start("setup"),
        P.pair("linewidth", T.number),
        P.vec2("textsize"),
        P.pair("textlinewidth", T.number),
        P.pair("top_margin", T.number),
        P.pair("left_margin", T.number),
        P.pair("bottom_margin", T.number),
        P.pair("right_margin", T.number),
    ) as unknown as DS.I_Setup;
}

function parse_coordinate(expr: Parseable): DS.I_Coordinate {
    const parsed = parse_expr(
        expr,
        P.positional("start_token"),
        P.positional("x", T.number),
        P.positional("y", T.number),
        P.positional("anchor", T.string),
    );
    return {
        x: parsed["x"],
        y: parsed["y"],
        anchor: parsed["anchor"],
    } as unknown as DS.I_Coordinate;
}

const common_defs = [
    P.pair("name", T.string),
    P.pair("comment", T.string),
    P.pair("option", T.string),
    P.pair("repeat", T.number),
    P.pair("incrx", T.number),
    P.pair("incry", T.number),
    P.pair("linewidth", T.number),
];

function parse_line(expr: Parseable): DS.I_Line {
    return parse_expr(
        expr,
        P.start("line"),
        P.item("start", parse_coordinate),
        P.item("end", parse_coordinate),
        ...common_defs,
    ) as unknown as DS.I_Line;
}

function parse_rect(expr: Parseable): DS.I_Rect {
    return parse_expr(
        expr,
        P.start("rect"),
        P.item("start", parse_coordinate),
        P.item("end", parse_coordinate),
        ...common_defs,
    ) as unknown as DS.I_Rect;
}

function parse_polygon(expr: Parseable): DS.I_Polygon {
    return parse_expr(
        expr,
        P.start("polygon"),
        P.item("pos", parse_coordinate),
        P.pair("rotate", T.number),
        P.list("pts", T.vec2),
        ...common_defs,
    ) as unknown as DS.I_Polygon;
}

function parse_bitmap(expr: Parseable): DS.I_Bitmap {
    return parse_expr(
        expr,
        P.start("bitmap"),
        P.item("pos", parse_coordinate),
        P.pair("scale", T.number),
        P.pair("pngdata", T.string),
        ...common_defs,
    ) as unknown as DS.I_Bitmap;
}

function parse_tbtext(expr: Parseable): DS.I_TbText {
    return parse_expr(
        expr,
        P.start("tbtext"),
        P.positional("text"),
        P.item("pos", parse_coordinate),
        P.pair("incrlabel", T.number),
        P.pair("maxlen", T.number),
        P.pair("maxheight", T.number),
        P.item("font", parse_font),
        P.pair("rotate", T.number),
        P.pair("justify", T.string),
        ...common_defs,
    ) as unknown as DS.I_TbText;
}

function parse_font(expr: Parseable): DS.I_Font {
    return parse_expr(
        expr,
        P.start("font"),
        P.pair("face", T.string),
        P.atom("bold"),
        P.atom("italic"),
        P.vec2("size"),
        P.pair("linewidth", T.number),
        P.color("color"),
    ) as unknown as DS.I_Font;
}
