/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../base/color";
import { BBox, Vec2 } from "../base/math";
import { Paper, expand_text_vars } from "./common";
import default_sheet from "./default_drawing_sheet.kicad_wks";
import * as DS from "../parser/proto/drawing-sheet";
import { parse_drawing_sheet } from "../parser/drawing_sheet_parser";

export type DrawingSheetDocument = {
    paper?: Paper;
    resolve_text_var(name: string): string | undefined;
};

export class DrawingSheet {
    version: number;
    generator: string;
    setup: Setup = new Setup();
    drawings: DrawingSheetItem[] = [];
    document?: DrawingSheetDocument;

    constructor(data: DS.I_DrawingSheet) {
        this.version = data.version;
        this.generator = data.generator;
        this.setup = new Setup(data.setup);
        this.drawings = [];
        if (data.drawings) {
            for (const d of data.drawings) {
                if ("text" in d) {
                    this.drawings.push(new TbText(d as DS.I_TbText, this));
                } else if ("pngdata" in d) {
                    this.drawings.push(new Bitmap(d as DS.I_Bitmap, this));
                } else if ("pts" in d) {
                    this.drawings.push(new Polygon(d as DS.I_Polygon, this));
                } else if ("start" in d) {
                    // Line or Rect
                    if ("name" in d) {
                        this.drawings.push(new Rect(d as DS.I_Rect, this));
                    } else {
                        this.drawings.push(new Line(d as DS.I_Line, this));
                    }
                }
            }
        }
    }

    static default() {
        return new DrawingSheet(parse_drawing_sheet(default_sheet));
    }

    *items() {
        // Yield a rect to draw the page outline
        yield new Rect(
            {
                name: "",
                comment: "page outline",
                option: null,
                repeat: 1,
                incrx: 0,
                incry: 0,
                linewidth: this.setup.linewidth,
                start: {
                    x: -this.setup.left_margin,
                    y: -this.setup.top_margin,
                    anchor: "ltcorner",
                },
                end: {
                    x: -this.setup.right_margin,
                    y: -this.setup.bottom_margin,
                    anchor: "rbcorner",
                },
            },
            this,
        );
        yield* this.drawings;
    }

    get paper() {
        return this.document?.paper;
    }

    get width() {
        return this.paper?.width ?? 88;
    }

    get height() {
        return this.paper?.height ?? 88;
    }

    get size() {
        return new Vec2(this.width, this.height);
    }

    get top_left() {
        return new Vec2(this.setup.left_margin, this.setup.top_margin);
    }

    get top_right() {
        return new Vec2(
            this.width - this.setup.right_margin,
            this.setup?.top_margin,
        );
    }

    get bottom_right() {
        return new Vec2(
            this.width - this.setup.right_margin,
            this.height - this.setup.bottom_margin,
        );
    }

    get bottom_left() {
        return new Vec2(
            this.setup.left_margin,
            this.height - this.setup.bottom_margin,
        );
    }

    get margin_bbox() {
        return BBox.from_points([this.top_left, this.bottom_right]);
    }

    get page_bbox() {
        return BBox.from_corners(0, 0, this.width, this.height);
    }

    resolve_text_var(name: string): string | undefined {
        switch (name) {
            case "PAPER":
                return this.paper?.size || "";
            // TODO: Mock values for now, should be provided by the project
            // when that's implemented.
            case "#":
                // Sheet number
                return "1";
            case "##":
                // Sheet count
                return "1";
            case "SHEETPATH":
                // Sheet path (hierarchical path)
                return "/";
            case "KICAD_VERSION":
                // KiCAD Version
                return "Ecad Viewer inspired by KiCanvas";
        }
        return this.document?.resolve_text_var(name);
    }
}

export class Setup {
    linewidth = 0.15;
    textsize: Vec2 = new Vec2(1.5, 1.5);
    textlinewidth = 0.15;
    top_margin = 0;
    left_margin = 0;
    bottom_margin = 0;
    right_margin = 0;

    constructor(data?: DS.I_Setup) {
        if (data) {
            this.linewidth = data.linewidth ?? 0.15;
            this.textsize = new Vec2(
                data.textsize?.x ?? 1.5,
                data.textsize?.y ?? 1.5,
            );
            this.textlinewidth = data.textlinewidth ?? 0.15;
            this.top_margin = data.top_margin ?? 0;
            this.left_margin = data.left_margin ?? 0;
            this.bottom_margin = data.bottom_margin ?? 0;
            this.right_margin = data.right_margin ?? 0;
        }
    }
}

export class Coordinate {
    position: Vec2 = new Vec2(0, 0);
    anchor: "ltcorner" | "lbcorner" | "rbcorner" | "rtcorner" = "rbcorner";

    constructor(data?: DS.I_Coordinate) {
        if (data) {
            this.position.x = data.x ?? 0;
            this.position.y = data.y ?? 0;
            this.anchor = data.anchor ?? this.anchor;
        }
    }
}

export class DrawingSheetItem {
    parent: DrawingSheet;
    name: string;
    comment: string;
    option: "page1only" | "notonpage1" | null;
    repeat = 1;
    incry = 0;
    incrx = 0;
    linewidth: number;

    constructor(parent: DrawingSheet, data: DS.I_DrawingSheetItem) {
        this.parent = parent;
        this.name = data.name ?? "";
        this.comment = data.comment ?? "";
        this.option = data.option ?? null;
        this.repeat = data.repeat ?? 1;
        this.incrx = data.incrx ?? 0;
        this.incry = data.incry ?? 0;
        this.linewidth = data.linewidth ?? 0.15;
    }
}

export class Line extends DrawingSheetItem {
    start: Coordinate;
    end: Coordinate;

    constructor(data: DS.I_Line, parent: DrawingSheet) {
        super(parent, data);
        this.start = new Coordinate(data.start);
        this.end = new Coordinate(data.end);
    }
}

export class Rect extends DrawingSheetItem {
    start: Coordinate;
    end: Coordinate;

    constructor(data: DS.I_Rect, parent: DrawingSheet) {
        super(parent, data);
        this.start = new Coordinate(data.start);
        this.end = new Coordinate(data.end);
    }
}

export class Polygon extends DrawingSheetItem {
    rotate: number;
    pos: Coordinate;
    pts: Vec2[];

    constructor(data: DS.I_Polygon, parent: DrawingSheet) {
        super(parent, data);
        this.rotate = data.rotate ?? 0;
        this.pos = new Coordinate(data.pos);
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
    }
}

export class Bitmap extends DrawingSheetItem {
    scale: number;
    pos: Coordinate;
    pngdata: string;

    constructor(data: DS.I_Bitmap, parent: DrawingSheet) {
        super(parent, data);
        this.scale = data.scale ?? 1;
        this.pos = new Coordinate(data.pos);
        this.pngdata = data.pngdata ?? "";
    }
}

export class TbText extends DrawingSheetItem {
    text: string;
    incrlabel = 1;
    pos: Coordinate;
    maxlen: number;
    maxheight: number;
    font: Font;
    justify: "center" | "left" | "right" | "top" | "bottom";
    rotate = 0;

    constructor(data: DS.I_TbText, parent: DrawingSheet) {
        super(parent, data);
        this.text = data.text;
        this.incrlabel = data.incrlabel ?? 1;
        this.pos = new Coordinate(data.pos);
        this.maxlen = data.maxlen ?? 0;
        this.maxheight = data.maxheight ?? 0;
        this.font = new Font(data.font);
        this.rotate = data.rotate ?? 0;
        this.justify = data.justify ?? "left";
    }

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }
}

export class Font {
    color: Color = Color.transparent_black;
    face: string;
    bold: boolean;
    italic: boolean;
    size: Vec2 = new Vec2(1.27, 1.27);
    linewidth: number;

    constructor(data?: DS.I_Font) {
        if (data) {
            this.face = data.face ?? "";
            this.bold = data.bold ?? false;
            this.italic = data.italic ?? false;
            this.size = new Vec2(data.size?.x ?? 1.27, data.size?.y ?? 1.27);
            this.linewidth = data.linewidth ?? 0.15;
            if (data.color) {
                this.color = new Color(
                    data.color.r,
                    data.color.g,
                    data.color.b,
                    data.color.a,
                );
            }
        } else {
            this.face = "";
            this.bold = false;
            this.italic = false;
            this.linewidth = 0.15;
        }
    }
}
