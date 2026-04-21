/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as B from "./proto/board";
import { P, type Parseable, T, parse_expr } from "./sexpr";
import {
    parseAt,
    parseEffects,
    parsePaper,
    parseStroke,
    parseTitleBlock,
} from "./common";
import { listify, type List } from "./tokenizer";

const is_string = (e: any): e is string => typeof e === "string";

function parseLayer(expr: Parseable): B.I_Layer {
    return parse_expr(
        expr,
        P.positional("ordinal", T.number),
        P.positional("canonical_name", T.string),
        P.positional("type", T.string),
        P.positional("user_name", T.string),
    ) as unknown as B.I_Layer;
}

function parseStackupLayer(expr: Parseable): B.I_StackupLayer {
    return parse_expr(
        expr,
        P.positional("name", T.string),
        P.pair("type", T.string),
        P.pair("color", T.string),
        P.pair("thickness", T.number),
        P.pair("material", T.string),
        P.pair("epsilon_r", T.number),
        P.pair("loss_tangent", T.number),
    ) as unknown as B.I_StackupLayer;
}

function parseStackup(expr: Parseable): B.I_Stackup {
    return parse_expr(
        expr,
        P.start("stackup"),
        P.collection("layers", "layer", T.item(parseStackupLayer)),
        P.pair("copper_finish", T.string),
        P.pair("dielectric_constraints", T.boolean),
        P.pair("edge_connector", T.string),
        P.pair("castellated_pads", T.boolean),
        P.pair("edge_plating", T.boolean),
    ) as unknown as B.I_Stackup;
}

function parsePCBPlotParams(expr: Parseable): B.I_PCBPlotParams {
    return parse_expr(
        expr,
        P.start("pcbplotparams"),
        P.pair("layerselection", T.number),
        P.pair("disableapertmacros", T.boolean),
        P.pair("usegerberextensions", T.boolean),
        P.pair("usegerberattributes", T.boolean),
        P.pair("usegerberadvancedattributes", T.boolean),
        P.pair("creategerberjobfile", T.boolean),
        P.pair("gerberprecision", T.number),
        P.pair("svguseinch", T.boolean),
        P.pair("svgprecision", T.number),
        P.pair("excludeedgelayer", T.boolean),
        P.pair("plotframeref", T.boolean),
        P.pair("viasonmask", T.boolean),
        P.pair("mode", T.number),
        P.pair("useauxorigin", T.boolean),
        P.pair("hpglpennumber", T.number),
        P.pair("hpglpenspeed", T.number),
        P.pair("hpglpendiameter", T.number),
        P.pair("dxfpolygonmode", T.boolean),
        P.pair("dxfimperialunits", T.boolean),
        P.pair("dxfusepcbnewfont", T.boolean),
        P.pair("psnegative", T.boolean),
        P.pair("psa4output", T.boolean),
        P.pair("plotreference", T.boolean),
        P.pair("plotvalue", T.boolean),
        P.pair("plotinvisibletext", T.boolean),
        P.pair("sketchpadsonfab", T.boolean),
        P.pair("subtractmaskfromsilk", T.boolean),
        P.pair("outputformat", T.number),
        P.pair("mirror", T.boolean),
        P.pair("drillshape", T.number),
        P.pair("scaleselection", T.number),
        P.pair("outputdirectory", T.string),
        P.pair("plot_on_all_layers_selection", T.number),
        P.pair("dashed_line_dash_ratio", T.number),
        P.pair("dashed_line_gap_ratio", T.number),
        P.pair("pdf_front_fp_property_popups", T.boolean),
        P.pair("pdf_back_fp_property_popups", T.boolean),
        P.pair("plotfptext", T.boolean),
    ) as unknown as B.I_PCBPlotParams;
}

function parseSetup(expr: Parseable): B.I_Setup {
    return parse_expr(
        expr,
        P.start("setup"),
        P.pair("pad_to_mask_clearance", T.number),
        P.pair("solder_mask_min_width", T.number),
        P.pair("pad_to_paste_clearance", T.number),
        P.pair("pad_to_paste_clearance_ratio", T.number),
        P.vec2("aux_axis_origin"),
        P.vec2("grid_origin"),
        P.item("pcbplotparams", parsePCBPlotParams),
        P.item("stackup", parseStackup),
        P.pair("allow_soldermask_bridges_in_footprints", T.boolean),
    ) as unknown as B.I_Setup;
}

function parseNet(expr: Parseable): B.I_Net {
    return parse_expr(
        expr,
        P.start("net"),
        P.positional("number", T.number),
        P.positional("name", T.string),
    ) as unknown as B.I_Net;
}

function parseNetReference(expr: Parseable): B.I_Net {
    return parse_expr(
        expr,
        P.start("net"),
        P.positional("number", T.number),
        P.positional("name", T.string),
    ) as unknown as B.I_Net;
}

function parseLine(expr: Parseable, start: string): B.I_Line {
    return parse_expr(
        expr,
        P.start(start),
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("locked"),
        P.vec2("start"),
        P.vec2("end"),
        P.pair("width", T.number),
        P.item("stroke", parseStroke),
    ) as unknown as B.I_Line;
}

function parse_gr_Line(expr: Parseable) {
    return parseLine(expr, "gr_line");
}

function parse_fp_Line(expr: Parseable) {
    return parseLine(expr, "fp_line");
}

function parseCircle(expr: Parseable, start: string): B.I_Circle {
    return parse_expr(
        expr,
        P.start(start),
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("locked"),
        P.vec2("center"),
        P.vec2("end"),
        P.pair("width", T.number),
        P.pair("fill", T.string),
        P.item("stroke", parseStroke),
    ) as unknown as B.I_Circle;
}

function parse_gr_Circle(expr: Parseable) {
    return parseCircle(expr, "gr_circle");
}
function parse_fp_Circle(expr: Parseable): B.I_Circle {
    return parseCircle(expr, "fp_circle");
}

function parseArc(expr: Parseable, start: string): B.I_Arc {
    return parse_expr(
        expr,
        P.start(start), // Also fp_arc
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("locked"),
        P.vec2("start"),
        P.vec2("mid"),
        P.vec2("end"),
        P.pair("angle", T.number),
        P.pair("width", T.number),
        P.item("stroke", parseStroke),
    ) as unknown as B.I_Arc;
}

function parse_gr_Arc(expr: Parseable) {
    return parseArc(expr, "gr_arc");
}

function parse_fp_Arc(expr: Parseable) {
    return parseArc(expr, "fp_arc");
}

function parse_poly_Arc(expr: Parseable) {
    return parseArc(expr, "arc");
}

function parsePoly(expr: Parseable, start: string): B.I_Poly {
    return parse_expr(
        expr,
        P.start(start),
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("locked"),
        P.expr("pts", (obj, name, expr) => {
            const parsed = parse_expr(
                expr as List,
                P.start("pts"),
                P.collection("items", "xy", T.vec2),
                P.collection("items", "arc", T.item(parse_poly_Arc)),
            );
            return (parsed as { items: any[] })?.["items"];
        }),
        P.pair("width", T.number),
        P.pair("fill", T.string),
        P.atom("island"),
        P.item("stroke", parseStroke),
    ) as unknown as B.I_Poly;
}

function parse_gr_poly(expr: Parseable) {
    return parsePoly(expr, "gr_poly");
}

function parse_fp_poly(expr: Parseable) {
    return parsePoly(expr, "fp_poly");
}

function parse_polygon(expr: Parseable) {
    return parsePoly(expr, "polygon");
}

function parse_filled_polygon(expr: Parseable) {
    return parsePoly(expr, "filled_polygon");
}

function parseRect(expr: Parseable, start: string): B.I_Rect {
    return parse_expr(
        expr,
        P.start(start),
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("locked"),
        P.vec2("start"),
        P.vec2("end"),
        P.pair("width", T.number),
        P.pair("fill", T.string),
        P.item("stroke", parseStroke),
    ) as unknown as B.I_Rect;
}

function parse_gr_Rect(expr: Parseable) {
    return parseRect(expr, "gr_rect");
}

function parse_fp_Rect(expr: Parseable) {
    return parseRect(expr, "fp_rect");
}

function parseTextRenderCache(expr: Parseable): B.I_TextRenderCache {
    return parse_expr(
        expr,
        P.start("render_cache"),
        P.positional("text", T.string),
        P.positional("angle", T.number),
        P.pair("uuid", T.string),
        P.collection("polygons", "polygon", T.item(parse_polygon)),
    ) as unknown as B.I_TextRenderCache;
}

function parseFpText(expr: Parseable): B.I_FpText {
    return parse_expr(
        expr,
        P.start("fp_text"),
        P.atom("locked"),
        P.positional("type", T.string), // reference, value, user
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.atom("hide"),
        P.atom("unlocked"),
        P.pair("uuid", T.string),
        P.object(
            "layer",
            {},
            P.start("layer"),
            P.positional("name", T.string),
            P.atom("knockout"),
        ),
        P.pair("tstamp", T.string),
        P.item("effects", parseEffects),
        P.item("render_cache", parseTextRenderCache),
    ) as unknown as B.I_FpText;
}

function parseGrText(expr: Parseable): B.I_GrText {
    return parse_expr(
        expr,
        P.start("gr_text"),
        P.positional("text", T.string),
        P.item("at", parseAt),
        P.object(
            "layer",
            {},
            P.start("layer"),
            P.positional("name", T.string),
            P.atom("knockout"),
        ),
        P.atom("unlocked"),
        P.atom("hide"),
        P.atom("locked"),
        P.item("effects", parseEffects),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.item("render_cache", parseTextRenderCache),
    ) as unknown as B.I_GrText;
}

function parseDimension(expr: Parseable): B.I_Dimension {
    return parse_expr(
        expr,
        P.start("dimension"),
        P.atom("locked"),
        P.positional("type", T.string), // aligned, leader, etc
        P.pair("layer", T.string),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.collection("pts", "pts", (obj, name, e) => {
            return parse_expr(e as any, P.collection("points", "xy", T.vec2))[
                "points"
            ];
        }),
        P.pair("height", T.number),
        P.pair("orientation", T.number),
        P.pair("leader_length", T.number),
        P.item("gr_text", parseGrText),
        P.object(
            "format",
            {},
            P.start("format"),
            P.pair("prefix", T.string),
            P.pair("suffix", T.string),
            P.pair("units", T.number),
            P.pair("units_format", T.number),
            P.pair("precision", T.number),
            P.pair("override_value", T.string),
            P.pair("suppress_zeroes", T.boolean),
        ),
        P.object(
            "style",
            {},
            P.start("style"),
            P.pair("thickness", T.number),
            P.pair("arrow_length", T.number),
            P.pair("text_position_mode", T.number),
            P.pair("extension_height", T.number),
            P.pair("text_frame", T.number),
            P.pair("extension_offset", T.number),
            P.pair("keep_text_aligned", T.boolean),
        ),
    ) as unknown as B.I_Dimension;
}

function parsePad(expr: Parseable): B.I_Pad {
    return parse_expr(
        expr,
        P.start("pad"),
        P.positional("number", T.string),
        P.positional("type", T.string),
        P.positional("shape", T.string),
        P.atom("locked"),
        P.item("at", parseAt),
        P.vec2("size"),
        P.vec2("rect_delta"),
        P.list("layers", T.string),
        P.pair("remove_unused_layers", T.boolean),
        P.pair("keep_end_layers", T.boolean),
        P.pair("roundrect_rratio", T.number),
        P.pair("chamfer_ratio", T.number),
        P.object(
            "chamfer",
            {},
            P.start("chamfer"),
            P.atom("top_left"),
            P.atom("top_right"),
            P.atom("bottom_right"),
            P.atom("bottom_left"),
        ),
        P.pair("pinfunction", T.string),
        P.pair("pintype", T.string),
        P.pair("die_length", T.number),
        P.pair("solder_mask_margin", T.number),
        P.pair("solder_paste_margin", T.number),
        P.pair("solder_paste_margin_ratio", T.number),
        P.pair("clearance", T.number),
        P.pair("thermal_width", T.number),
        P.pair("thermal_gap", T.number),
        P.pair("thermal_bridge_angle", T.number),
        P.pair("zone_connect", T.number),
        P.object(
            "drill",
            {},
            P.start("drill"),
            P.atom("oval"),
            P.positional("diameter", T.number),
            P.positional("width", T.number),
            P.vec2("offset"),
        ),
        P.item("net", parseNetReference),
        P.object(
            "options",
            {},
            P.start("options"),
            P.pair("clearance", T.string),
            P.pair("anchor", T.string),
        ),
        P.expr("primitives", (obj, name, expr) => {
            const parsed = parse_expr(
                expr as List,
                P.start("primitives"),
                P.collection("items", "gr_line", T.item(parse_gr_Line)),
                P.collection("items", "gr_circle", T.item(parse_gr_Circle)),
                P.collection("items", "gr_arc", T.item(parse_gr_Arc)),
                P.collection("items", "gr_rect", T.item(parse_gr_Rect)),
                P.collection("items", "gr_poly", T.item(parse_gr_poly)),
            );
            return (parsed as { items: any[] })?.["items"];
        }),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
    ) as unknown as B.I_Pad;
}

function parseModel(expr: Parseable): B.I_Model {
    return parse_expr(
        expr,
        P.start("model"),
        P.positional("filename", T.string),
        P.object(
            "offset",
            {},
            P.start("offset"),
            P.collection("xyz", "xyz", T.number),
        ),
        P.object(
            "scale",
            {},
            P.start("scale"),
            P.collection("xyz", "xyz", T.number),
        ),
        P.object(
            "rotate",
            {},
            P.start("rotate"),
            P.collection("xyz", "xyz", T.number),
        ),
        P.atom("hide"),
        P.pair("opacity", T.number),
    ) as unknown as B.I_Model;
}

function parsePropertyKicad8(expr: Parseable): B.I_Property_Kicad_8 {
    return parse_expr(
        expr,
        P.start("property"),
        P.positional("name", T.string),
        P.positional("value", T.string),
        P.item("at", parseAt),
        P.atom("unlocked"),
        P.object(
            "layer",
            {},
            P.start("layer"),
            P.positional("name", T.string),
            P.atom("knockout"),
        ),
        P.atom("hide"),
        P.pair("uuid", T.string),
        P.item("effects", parseEffects),
        P.item("render_cache", parseTextRenderCache),
    ) as unknown as B.I_Property_Kicad_8;
}

function parseZoneFill(expr: Parseable): B.I_ZoneFill {
    return parse_expr(
        expr,
        P.start("fill"),
        P.positional("fill", T.boolean),
        P.pair("mode", T.string),
        P.pair("thermal_gap", T.number),
        P.pair("thermal_bridge_width", T.number),
        P.object(
            "smoothing",
            {},
            P.start("smoothing"),
            P.positional("style", T.string),
            P.pair("radius", T.number),
        ),
        P.pair("radius", T.number),
        P.pair("island_removal_mode", T.number),
        P.pair("island_area_min", T.number),
        P.pair("hatch_thickness", T.number),
        P.pair("hatch_gap", T.number),
        P.pair("hatch_orientation", T.number),
        P.pair("hatch_smoothing_level", T.number),
        P.pair("hatch_smoothing_value", T.number),
        P.pair("hatch_border_algorithm", T.string),
        P.pair("hatch_min_hole_area", T.number),
        P.pair("uuid", T.string),
    ) as unknown as B.I_ZoneFill;
}

function parseZoneKeepout(expr: Parseable): B.I_ZoneKeepout {
    return parse_expr(
        expr,
        P.start("keepout"),
        P.pair("tracks", T.string),
        P.pair("vias", T.string),
        P.pair("pads", T.string),
        P.pair("copperpour", T.string),
        P.pair("footprints", T.string),
        P.pair("uuid", T.string),
    ) as unknown as B.I_ZoneKeepout;
}

function parseZone(expr: Parseable): B.I_Zone {
    return parse_expr(
        expr,
        P.start("zone"),
        P.atom("locked"),
        P.pair("net", T.number),
        P.pair("net_name", T.string),
        P.pair("name", T.string),
        P.pair("layer", T.string),
        P.list("layers", T.string),
        P.object(
            "hatch",
            {},
            P.start("hatch"),
            P.positional("style", T.string),
            P.positional("pitch", T.number),
        ),
        P.pair("priority", T.number),
        P.object(
            "connect_pads",
            {},
            P.start("connect_pads"),
            P.positional("type", T.string),
            P.pair("clearance", T.number),
        ),
        P.pair("min_thickness", T.number),
        P.pair("filled_areas_thickness", T.boolean),
        P.item("keepout", parseZoneKeepout),
        P.item("fill", parseZoneFill),
        P.collection("polygons", "polygon", T.item(parse_polygon)),
        P.collection(
            "filled_polygons",
            "filled_polygon",
            T.item(parse_filled_polygon),
        ),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
    ) as unknown as B.I_Zone;
}

function parseFootprint(expr: Parseable): B.I_Footprint {
    return parse_expr(
        expr,
        P.start("footprint"),
        P.positional("library_link", T.string),
        P.pair("version", T.number),
        P.pair("embedded_fonts", T.boolean),
        P.pair("generator", T.string),
        P.atom("locked"),
        P.atom("placed"),
        P.pair("layer", T.string),
        P.pair("tedit", T.string),
        P.pair("tstamp", T.string),
        P.item("at", parseAt),
        P.pair("uuid", T.string),
        P.pair("descr", T.string),
        P.pair("tags", T.string),
        P.pair("sheetname", T.string),
        P.pair("sheetfile", T.string),
        P.pair("path", T.string),
        P.pair("autoplace_cost90", T.number),
        P.pair("autoplace_cost180", T.number),
        P.pair("solder_mask_margin", T.number),
        P.pair("solder_paste_margin", T.number),
        P.pair("solder_paste_ratio", T.number),
        P.pair("clearance", T.number),
        P.pair("zone_connect", T.number),
        P.pair("thermal_width", T.number),
        P.pair("thermal_gap", T.number),
        P.object(
            "attr",
            {},
            P.start("attr"),
            P.atom("through_hole"),
            P.atom("smd"),
            P.atom("virtual"),
            P.atom("board_only"),
            P.atom("exclude_from_pos_files"),
            P.atom("exclude_from_bom"),
            P.atom("allow_solder_mask_bridges"),
            P.atom("allow_missing_courtyard"),
        ),
        P.dict("properties", "property", T.string),
        P.collection(
            "properties_kicad_8",
            "property",
            T.item(parsePropertyKicad8),
        ),
        P.collection("drawings", "fp_line", T.item(parse_fp_Line)),
        P.collection("drawings", "fp_circle", T.item(parse_fp_Circle)),
        P.collection("drawings", "fp_arc", T.item(parse_fp_Arc)),
        P.collection("drawings", "fp_poly", T.item(parse_fp_poly)),
        P.collection("drawings", "fp_rect", T.item(parse_fp_Rect)),
        P.collection("fp_texts", "fp_text", T.item(parseFpText)),
        P.collection("zones", "zone", T.item(parseZone)),
        P.collection("models", "model", T.item(parseModel)),
        P.collection("pads", "pad", T.item(parsePad)),
    ) as unknown as B.I_Footprint;
}

function parseLineSegment(expr: Parseable): B.I_LineSegment {
    return parse_expr(
        expr,
        P.start("segment"),
        P.vec2("start"),
        P.vec2("end"),
        P.pair("width", T.number),
        P.pair("layer", T.string),
        P.pair("net", T.number),
        P.atom("locked"),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
    ) as unknown as B.I_LineSegment;
}

function parseArcSegment(expr: Parseable): B.I_ArcSegment {
    return parse_expr(
        expr,
        P.start("arc"),
        P.vec2("start"),
        P.vec2("mid"),
        P.vec2("end"),
        P.pair("width", T.number),
        P.pair("layer", T.string),
        P.pair("net", T.number),
        P.atom("locked"),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
    ) as unknown as B.I_ArcSegment;
}

function parseVia(expr: Parseable): B.I_Via {
    return parse_expr(
        expr,
        P.start("via"),
        P.item("at", parseAt),
        P.pair("size", T.number),
        P.pair("drill", T.number),
        P.list("layers", T.string),
        P.atom("remove_unused_layers"),
        P.atom("keep_end_layers"),
        P.atom("locked"),
        P.atom("free"),
        P.pair("net", T.number),
        P.pair("tstamp", T.string),
        P.pair("uuid", T.string),
        P.atom("type", ["blind", "micro", "through-hole"]),
    ) as unknown as B.I_Via;
}

function parseGroup(expr: Parseable): B.I_Group {
    return parse_expr(
        expr,
        P.start("group"),
        P.positional("name", T.string),
        P.pair("id", T.string),
        P.atom("locked"),
        P.collection("members", "members", T.string),
    ) as unknown as B.I_Group;
}

export class BoardParser {
    public parse(text: string): B.I_KicadPCB {
        const expr = listify(text); // Tokenize and listify here
        // Need to handle if listify returns a list of expressions or a single root expression.
        // Typically kicad_pcb is the single root.
        const root =
            expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;

        return parse_expr(
            root,
            P.start("kicad_pcb"),
            P.pair("version", T.number),
            P.pair("generator", T.string),
            P.pair("embedded_fonts", T.boolean),
            P.pair("generator_version", T.string),
            P.object(
                "general",
                {},
                P.start("general"),
                P.pair("thickness", T.number),
                P.atom("legacy_teardrops"),
            ),
            P.item("paper", parsePaper),
            P.item("title_block", parseTitleBlock),
            P.item("setup", parseSetup),
            P.dict("properties", "property", (obj, name, e) => {
                const el = e as [string, string, string];
                return { name: el[1], value: el[2] };
            }),
            P.list("layers", T.item(parseLayer)),
            P.collection("nets", "net", T.item(parseNet)),
            P.collection("footprints", "footprint", T.item(parseFootprint)),
            P.collection("footprints", "module", T.item(parseFootprint)), // Support legacy module
            P.collection("zones", "zone", T.item(parseZone)),
            P.collection("segments", "segment", T.item(parseLineSegment)),
            P.collection("segments", "arc", T.item(parseArcSegment)),
            P.collection("vias", "via", T.item(parseVia)),
            P.collection("drawings", "gr_line", T.item(parse_gr_Line)),
            P.collection("drawings", "gr_circle", T.item(parse_gr_Circle)),
            P.collection("drawings", "gr_arc", T.item(parse_gr_Arc)),
            P.collection("drawings", "gr_poly", T.item(parse_gr_poly)),
            P.collection("drawings", "gr_rect", T.item(parse_gr_Rect)),
            P.collection("drawings", "gr_text", T.item(parseGrText)),
            P.collection("drawings", "dimension", T.item(parseDimension)),
            P.collection("groups", "group", T.item(parseGroup)),
        ) as unknown as B.I_KicadPCB;
    }
}
