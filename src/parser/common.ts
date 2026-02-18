/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type {
    I_At,
    I_Effects,
    I_Stroke,
    I_TitleBlock,
    I_Paper,
} from "./proto/common";
import { P, type Parseable, T, parse_expr } from "./sexpr";

export function parseAt(expr: Parseable): I_At {
    const parsed = parse_expr(
        expr,
        P.start("at"),
        P.vec2("position"),
        P.positional("x", T.number),
        P.positional("y", T.number),
        P.positional("rotation", T.number),
        P.atom("unlocked"),
    ) as any;

    return {
        position: {
            x: parsed.position?.x ?? parsed.x ?? 0,
            y: parsed.position?.y ?? parsed.y ?? 0,
        },
        rotation: parsed.rotation ?? 0,
        unlocked: parsed.unlocked ?? false,
    };
}

export function parseStroke(expr: Parseable): I_Stroke {
    return parse_expr(
        expr,
        P.start("stroke"),
        P.pair("width", T.number),
        P.pair("type", T.string),
        P.color(),
    ) as unknown as I_Stroke;
}

export function parseEffects(expr: Parseable): I_Effects {
    return parse_expr(
        expr,
        P.start("effects"),
        P.object(
            "font",
            {},
            P.start("font"),
            P.pair("face", T.string),
            P.vec2("size"),
            P.pair("thickness", T.number),
            P.atom("bold"),
            P.atom("italic"),
            P.pair("line_spacing", T.number),
        ),
        P.object(
            "justify",
            { horiz: "center", vert: "center", mirror: false },
            P.start("justify"),
            P.atom("horiz", ["left", "right"]),
            P.atom("vert", ["top", "bottom"]),
            P.atom("mirror"),
        ),
        P.atom("hide"),
        P.pair("href", T.string),
    ) as unknown as I_Effects;
}

export function parseTitleBlock(expr: Parseable): I_TitleBlock {
    return parse_expr(
        expr,
        P.start("title_block"),
        P.pair("title", T.string),
        P.pair("date", T.string),
        P.pair("rev", T.string),
        P.pair("company", T.string),
        P.dict("comment", "comment", T.string),
    ) as unknown as I_TitleBlock;
}

export function parsePaper(expr: Parseable): I_Paper {
    const raw = parse_expr(
        expr,
        P.start("paper"),
        P.positional("size", T.string),
        P.positional("width", T.number),
        P.positional("height", T.number),
        P.atom("portrait"),
    );
    // Logic to handle size strings vs dimensions if needed, but for POD we just pass what we parsed.
    // The converter can handle the details.
    return raw as unknown as I_Paper;
}
