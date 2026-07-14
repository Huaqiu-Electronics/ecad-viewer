/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Painters for drawing sheet items.
 *
 * Each item class has a corresponding Painter implementation.
 */

import { Angle, BBox, Vec2 } from "../../base/math";
import { Polygon as GraphicPolygon, Polyline, Renderer } from "../../graphics";
import type { BaseTheme } from "../../kicad";
import * as drawing_sheet from "../../kicad/drawing-sheet";
import { EDAText, StrokeFont } from "../../kicad/text";
import { DocumentPainter, ItemPainter } from "../base/painter";
import { ViewLayer, ViewLayerNames, ViewLayerSet } from "../base/view-layers";

function offset_point(
    sheet: drawing_sheet.DrawingSheet,
    point: Vec2,
    anchor: drawing_sheet.Coordinate["anchor"],
    constrain = true,
) {
    const tl = sheet.top_left;
    const tr = sheet.top_right;
    const bl = sheet.bottom_left;
    const br = sheet.bottom_right;
    const bbox = sheet.margin_bbox;

    switch (anchor) {
        case "ltcorner":
            point = tl.add(point);
            break;
        case "rbcorner":
            point = br.sub(point);
            break;
        case "lbcorner":
            point = bl.add(new Vec2(point.x, -point.y));
            break;
        case "rtcorner":
            point = tr.add(new Vec2(-point.x, point.y));
            break;
    }

    if (constrain && !bbox.contains_point(point)) {
        return;
    }

    return point;
}

function is_visible_on_page(item: drawing_sheet.DrawingSheetItem) {
    const page = Number.parseInt(item.parent.sheet_number, 10) || 1;
    if (item.option === "page1only") return page === 1;
    if (item.option === "notonpage1") return page !== 1;
    return true;
}

class LinePainter extends ItemPainter {
    classes = [drawing_sheet.Line];

    override layers_for(item: unknown): string[] {
        return [ViewLayerNames.drawing_sheet];
    }

    paint(layer: ViewLayer, l: drawing_sheet.Line) {
        if (!is_visible_on_page(l)) return;
        const sheet = l.parent;
        const [incrx, incry] = [l.incrx ?? 0, l.incry ?? 0];

        for (let i = 0; i < l.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const [start, end] = [
                offset_point(
                    sheet,
                    l.start.position.add(offset),
                    l.start.anchor,
                ),
                offset_point(sheet, l.end.position.add(offset), l.end.anchor),
            ];

            if (!start || !end) {
                return;
            }

            this.gfx.line(
                new Polyline(
                    [start, end],
                    l.linewidth || sheet.setup.linewidth,
                    layer.color,
                ),
            );
        }
    }
}

class RectPainter extends ItemPainter {
    classes = [drawing_sheet.Rect];

    override layers_for(item: unknown): string[] {
        return [ViewLayerNames.drawing_sheet];
    }

    paint(layer: ViewLayer, r: drawing_sheet.Rect) {
        if (!is_visible_on_page(r)) return;
        const sheet = r.parent;
        const [incrx, incry] = [r.incrx ?? 0, r.incry ?? 0];

        for (let i = 0; i < r.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const [start, end] = [
                offset_point(
                    sheet,
                    r.start.position.add(offset),
                    r.start.anchor,
                    i > 0,
                ),
                offset_point(
                    sheet,
                    r.end.position.add(offset),
                    r.end.anchor,
                    i > 0,
                ),
            ];

            if (!start || !end) {
                return;
            }

            const bbox = BBox.from_points([start, end]);

            this.gfx.line(
                Polyline.from_BBox(
                    bbox,
                    r.linewidth || sheet.setup.linewidth,
                    layer.color,
                ),
            );
        }
    }
}

class TbTextPainter extends ItemPainter {
    classes = [drawing_sheet.TbText];

    override layers_for(item: unknown): string[] {
        return [ViewLayerNames.drawing_sheet];
    }

    paint(layer: ViewLayer, t: drawing_sheet.TbText) {
        if (!is_visible_on_page(t)) return;
        const edatext = new EDAText(t.shown_text);

        edatext.h_align = "left";
        edatext.v_align = "center";
        edatext.text_angle = Angle.from_degrees(t.rotate);

        switch (t.justify) {
            case "center":
                edatext.h_align = "center";
                edatext.v_align = "center";
                break;
            case "left":
                edatext.h_align = "left";
                break;
            case "right":
                edatext.h_align = "right";
                break;
            case "top":
                edatext.v_align = "top";
                break;
            case "bottom":
                edatext.v_align = "bottom";
                break;
        }

        edatext.attributes.bold = t.font?.bold ?? false;
        edatext.attributes.italic = t.font?.italic ?? false;
        edatext.attributes.color = t.font?.color?.is_transparent_black
            ? layer.color
            : (t.font?.color ?? layer.color);
        edatext.attributes.size = (
            t.font?.size ?? t.parent.setup.textsize
        ).multiply(10000);
        const configured_stroke =
            (t.font?.linewidth ?? t.parent.setup.textlinewidth) * 10000;
        // KiCad's stroke font expresses bold by increasing pen width. The
        // generic font renderer deliberately does not synthesize bold glyphs.
        edatext.attributes.stroke_width = t.font?.bold
            ? Math.max(configured_stroke, edatext.attributes.size.x * 0.2)
            : configured_stroke;

        const [incrx, incry] = [t.incrx ?? 0, t.incry ?? 0];

        for (let i = 0; i < t.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const pos = offset_point(
                t.parent,
                t.pos.position.add(offset),
                t.pos.anchor,
            );

            if (!pos) {
                return;
            }

            if (t.incrlabel && t.text.length == 1) {
                const incr = t.incrlabel * i;
                const chrcode = t.text.charCodeAt(0);

                if (
                    chrcode >= "0".charCodeAt(0) &&
                    chrcode <= "9".charCodeAt(0)
                ) {
                    edatext.text = `${incr + chrcode - "0".charCodeAt(0)}`;
                } else {
                    edatext.text = String.fromCharCode(chrcode + incr);
                }
            }

            edatext.text_pos = pos?.multiply(10000);

            this.gfx.state.push();
            StrokeFont.default().draw(
                this.gfx,
                edatext.shown_text,
                edatext.text_pos,
                edatext.attributes,
            );
            this.gfx.state.pop();
        }
    }
}

class PolygonPainter extends ItemPainter {
    classes = [drawing_sheet.Polygon];

    override layers_for(item: unknown): string[] {
        return [ViewLayerNames.drawing_sheet];
    }

    paint(layer: ViewLayer, polygon: drawing_sheet.Polygon) {
        if (!is_visible_on_page(polygon)) return;
        const angle = Angle.from_degrees(polygon.rotate);
        for (let i = 0; i < polygon.repeat; i++) {
            const offset = new Vec2(polygon.incrx * i, polygon.incry * i);
            const origin = offset_point(
                polygon.parent,
                polygon.pos.position.add(offset),
                polygon.pos.anchor,
                i > 0,
            );
            if (!origin) break;
            for (const contour of polygon.contours) {
                const points = contour.map((point) =>
                    origin.add(point.rotate(angle)),
                );
                if (points.length >= 3) {
                    this.gfx.polygon(new GraphicPolygon(points, layer.color));
                }
            }
        }
    }
}

export class DrawingSheetPainter extends DocumentPainter {
    constructor(gfx: Renderer, layers: ViewLayerSet, theme: BaseTheme) {
        super(gfx, layers, theme);
        this.painter_list = [
            new LinePainter(this, gfx),
            new RectPainter(this, gfx),
            new PolygonPainter(this, gfx),
            new TbTextPainter(this, gfx),
        ];
    }

    override *paintable_layers(): Generator<ViewLayer, void, unknown> {
        yield this.layers.by_name(ViewLayerNames.drawing_sheet)!;
    }
}
