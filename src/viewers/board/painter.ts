/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Painters for drawing board items.
 *
 * Each item class has a corresponding Painter implementation.
 */

import { Angle, Arc, BBox, Matrix3, Vec2 } from "../../base/math";
import { Circle, Color, Polygon, Polyline, Renderer } from "../../graphics";
import * as board_items from "../../kicad/board";
import { EDAText, StrokeFont } from "../../kicad/text";
import { DocumentPainter } from "../base/painter";
import {
    CopperVirtualLayerNames,
    FabVirtualLayerNames,
    LayerNames,
    LayerSet,
    ViewLayer,
    copper_layers_between,
    virtual_layer_for,
} from "./layers";
import type { BoardTheme } from "../../kicad";
import {
    BoxInteractiveItem,
    LineInteractiveItem,
    type BoardInteractiveItem,
} from "../../kicad/board_bbox_visitor";
import { FootprintPainter } from "./footprint-painter";
import { BoardItemPainter } from "./painter-base";
import { PadPainter } from "./pad-painter";
import { ZonePainter } from "./zone-painter";

class LinePainter extends BoardItemPainter {
    classes = [board_items.GrLine, board_items.FpLine];

    layers_for(item: board_items.GrLine | board_items.FpLine) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: board_items.GrLine | board_items.FpLine) {
        let color = layer.color;
        if (this.filter_net) color = Color.dark_gray;

        const points = [s.start, s.end];
        this.gfx.line(new Polyline(points, s.width, color));
    }
}

class RectPainter extends BoardItemPainter {
    classes = [board_items.GrRect, board_items.FpRect];

    layers_for(item: board_items.GrRect | board_items.FpRect) {
        return [item.layer];
    }

    paint(layer: ViewLayer, r: board_items.GrRect | board_items.FpRect) {
        let color = layer.color;
        if (this.filter_net) color = Color.dark_gray;

        const points = [
            r.start,
            new Vec2(r.start.x, r.end.y),
            r.end,
            new Vec2(r.end.x, r.start.y),
            r.start,
        ];

        this.gfx.line(new Polyline(points, r.width, color));

        if (board_items.should_fill(r)) {
            this.gfx.polygon(new Polygon(points, color));
        }
    }
}

class PolyPainter extends BoardItemPainter {
    classes = [board_items.Poly, board_items.GrPoly, board_items.FpPoly];

    layers_for(
        item: board_items.Poly | board_items.GrPoly | board_items.FpPoly,
    ) {
        return [item.layer];
    }

    paint(
        layer: ViewLayer,
        p: board_items.Poly | board_items.GrPoly | board_items.FpPoly,
    ) {
        let color = layer.color;
        if (this.filter_net) color = Color.dark_gray;

        if (p.width) {
            this.gfx.line(
                // TODO paint the arc
                new Polyline([...p.points, p.points[0]!], p.width, color),
            );
        }

        if (board_items.should_fill(p)) {
            this.gfx.polygon(new Polygon(p.points, color));
        }
    }
}

class ArcPainter extends BoardItemPainter {
    classes = [board_items.GrArc, board_items.FpArc];

    layers_for(item: board_items.GrArc | board_items.FpArc) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: board_items.GrArc | board_items.FpArc) {
        let color = layer.color;
        if (this.filter_net) color = Color.dark_gray;
        const arc = a.arc;
        const points = arc.to_polyline();
        this.gfx.line(new Polyline(points, arc.width, color));
    }
}

class CirclePainter extends BoardItemPainter {
    classes = [board_items.GrCircle, board_items.FpCircle];

    layers_for(item: board_items.GrCircle | board_items.FpCircle) {
        return [item.layer];
    }

    paint(layer: ViewLayer, c: board_items.GrCircle | board_items.FpCircle) {
        let color = layer.color;
        if (this.filter_net) color = Color.dark_gray;

        const radius = c.center.sub(c.end).magnitude;
        const arc = new Arc(
            c.center,
            radius,
            new Angle(0),
            new Angle(2 * Math.PI),
            c.width,
        );

        if (board_items.should_fill(c)) {
            this.gfx.circle(
                new Circle(arc.center, arc.radius + (c.width ?? 0), color),
            );
        } else {
            const points = arc.to_polyline();
            this.gfx.line(new Polyline(points, arc.width, color));
        }
    }
}

class TraceSegmentPainter extends BoardItemPainter {
    classes = [board_items.LineSegment];

    layers_for(item: board_items.LineSegment) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: board_items.LineSegment) {
        let color = layer.color;
        if (this.filter_net) {
            color = this.color_for(s.layer);

            if (s.net != this.filter_net) color = Color.light_gray;
            else color = this.color_for(s.layer);
        }

        const points = [s.start, s.end];
        this.gfx.line(new Polyline(points, s.width, color));
    }
}

class TraceArcPainter extends BoardItemPainter {
    classes = [board_items.ArcSegment];

    layers_for(item: board_items.ArcSegment) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: board_items.ArcSegment) {
        let color = layer.color;
        if (this.filter_net && a.net !== this.filter_net)
            color = Color.dark_gray;

        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        this.gfx.line(new Polyline(points, arc.width, color));
    }
}

class ViaPainter extends BoardItemPainter {
    classes = [board_items.Via];

    layers_for(v: board_items.Via): string[] {
        if (v.layers) {
            // blind/buried vias have two layers - the start and end layer,
            // and should only be drawn on the layers they're actually on.
            const layers = [];

            for (const cu_layer of copper_layers_between(
                v.layers[0]!,
                v.layers[1]!,
            )) {
                layers.push(
                    virtual_layer_for(
                        cu_layer,
                        CopperVirtualLayerNames.bb_via_holes,
                    ),
                );
                layers.push(
                    virtual_layer_for(
                        cu_layer,
                        CopperVirtualLayerNames.bb_via_hole_walls,
                    ),
                );
            }
            return layers;
        } else {
            return [LayerNames.via_holes, LayerNames.via_holewalls];
        }
    }

    paint(layer: ViewLayer, v: board_items.Via) {
        let color = layer.color;

        if (this.filter_net) {
            if (v.net !== this.filter_net) color = Color.light_gray;
            else color = Color.cyan;
        }

        if (
            layer.name.endsWith("HoleWalls") ||
            BoardItemPainter.is_interactive_layer(layer.name)
        ) {
            this.gfx.circle(new Circle(v.at.position, v.size / 2, color));
        } else if (layer.name.endsWith("Holes")) {
            this.gfx.circle(new Circle(v.at.position, v.drill / 2, color));

            // Draw start and end layer markers
            if ((v.type == "blind" || v.type == "micro") && v.layers) {
                this.gfx.arc(
                    v.at.position,
                    v.size / 2 - v.size / 8,
                    Angle.from_degrees(180 + 70),
                    Angle.from_degrees(360 - 70),
                    v.size / 4,
                    layer.layer_set.by_name(v.layers[0]!)?.color ??
                        Color.transparent_black,
                );
                this.gfx.arc(
                    v.at.position,
                    v.size / 2 - v.size / 8,
                    Angle.from_degrees(70),
                    Angle.from_degrees(180 - 70),
                    v.size / 4,
                    layer.layer_set.by_name(v.layers[1]!)?.color ??
                        Color.transparent_black,
                );
            }
        }
    }
}

class GrTextPainter extends BoardItemPainter {
    classes = [board_items.GrText];

    layers_for(t: board_items.GrText) {
        return [t.layer.name];
    }

    paint(layer: ViewLayer, t: board_items.GrText) {
        if (this.filter_net) return;

        if (t.hide || !t.shown_text) {
            return;
        }

        if (t.render_cache) {
            for (const poly of t.render_cache.polygons) {
                this.view_painter.paint_item(layer, poly);
            }
            return;
        }

        const edatext = new EDAText(t.shown_text);

        edatext.apply_effects(t.effects);
        edatext.apply_at(t.at);

        edatext.attributes.color = layer.color;

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

class FpTextPainter extends BoardItemPainter {
    classes = [board_items.FpText, board_items.Property_Kicad_8];

    layers_for(t: board_items.FpText | board_items.Property_Kicad_8) {
        const layer_name =
            t instanceof board_items.FpText ? t.layer.name : t.layer;

        switch (t.type) {
            case "reference":
                return [
                    virtual_layer_for(layer_name, FabVirtualLayerNames.fp_ref),
                ];
            case "value":
                return [
                    virtual_layer_for(
                        layer_name,
                        FabVirtualLayerNames.fp_value,
                    ),
                ];
            case "user":
                return [
                    virtual_layer_for(
                        layer_name,
                        FabVirtualLayerNames.hidden_text,
                    ),
                ];
        }
    }

    paint(
        layer: ViewLayer,
        t: board_items.FpText | board_items.Property_Kicad_8,
    ) {
        if (this.filter_net) return;

        if (t.hide || !t.shown_text) {
            return;
        }

        if (t.render_cache) {
            this.gfx.state.push();
            this.gfx.state.matrix = Matrix3.identity();
            for (const poly of t.render_cache.polygons) {
                this.view_painter.paint_item(layer, poly);
            }
            this.gfx.state.pop();
            return;
        }

        const edatext = new EDAText(t.shown_text);

        edatext.apply_effects(t.effects);
        edatext.apply_at(t.at);

        edatext.attributes.keep_upright = !t.at.unlocked;
        edatext.attributes.color = layer.color;

        if (t.parent) {
            const rot = Angle.from_degrees(t.parent.at.rotation);
            let pos = edatext.text_pos;
            pos = rot.rotate_point(pos, new Vec2(0, 0));
            pos = pos.add(t.parent.at.position.multiply(10000));
            edatext.text_pos.set(pos);
        }

        if (edatext.attributes.keep_upright) {
            while (edatext.text_angle.degrees > 90) {
                edatext.text_angle.degrees -= 180;
            }
            while (edatext.text_angle.degrees <= -90) {
                edatext.text_angle.degrees += 180;
            }
        }

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();

        StrokeFont.default().draw(
            this.gfx,
            edatext.shown_text,
            edatext.text_pos,
            edatext.attributes,
        );
        this.gfx.state.pop();
    }
}

class DimensionPainter extends BoardItemPainter {
    classes = [board_items.Dimension];

    layers_for(d: board_items.Dimension): string[] {
        return [d.layer];
    }

    paint(layer: ViewLayer, d: board_items.Dimension) {
        switch (d.type) {
            case "orthogonal":
            case "aligned":
                this.paint_linear(layer, d);
                break;
            case "center":
                this.paint_center(layer, d);
                break;
            case "radial":
                this.paint_radial(layer, d);
                break;
            case "leader":
                this.paint_leader(layer, d);
                break;
        }
    }

    paint_center(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        let arm = d.end.sub(d.start);
        this.gfx.line(
            [d.start.sub(arm), d.start.add(arm)],
            thickness,
            layer.color,
        );

        arm = Angle.from_degrees(90).rotate_point(arm);
        this.gfx.line(
            [d.start.sub(arm), d.start.add(arm)],
            thickness,
            layer.color,
        );
    }

    paint_radial(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        const center = d.start.copy();
        let center_arm = new Vec2(0, d.style.arrow_length);

        // Cross shape
        this.gfx.line(
            [center.sub(center_arm), center.add(center_arm)],
            thickness,
            layer.color,
        );

        center_arm = Angle.from_degrees(90).rotate_point(center_arm);
        this.gfx.line(
            [center.sub(center_arm), center.add(center_arm)],
            thickness,
            layer.color,
        );

        // Line from center to text.
        let radial = d.end.sub(d.start);
        radial = radial.resize(d.leader_length);

        const text = this.make_text(layer, d);
        const text_bbox = text.get_text_box().scale(1 / 10000);

        const line_segs = [d.end, d.end.add(radial), d.gr_text.at.position];

        const textbox_pt = text_bbox.intersect_segment(
            line_segs[1]!,
            line_segs[2]!,
        );

        if (textbox_pt) {
            line_segs[2] = textbox_pt;
        }

        this.gfx.line(line_segs, thickness, layer.color);

        // Arrows
        const arrow_angle = Angle.from_degrees(27.5);
        const inv_radial_angle = radial.angle.negative();
        const arrow_seg = new Vec2(d.style.arrow_length, 0);
        const arrow_end_pos = inv_radial_angle
            .add(arrow_angle)
            .rotate_point(arrow_seg);
        const arrow_end_neg = inv_radial_angle
            .sub(arrow_angle)
            .rotate_point(arrow_seg);

        this.gfx.line(
            [d.end.add(arrow_end_neg), d.end, d.end.add(arrow_end_pos)],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(text);
    }

    paint_leader(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        // Line from center to text.
        const text = this.make_text(layer, d);
        const text_bbox = text
            .get_text_box()
            .grow(text.text_width / 2, text.get_effective_text_thickness() * 2)
            .scale(1 / 10000);

        const start = d.start.add(
            d.end.sub(d.start).resize(d.style.extension_offset),
        );
        const line_segs = [start, d.end, d.gr_text.at.position];

        const textbox_pt = text_bbox.intersect_segment(
            line_segs[1]!,
            line_segs[2]!,
        );

        if (textbox_pt) {
            line_segs[2] = textbox_pt;
        }

        this.gfx.line(line_segs, thickness, layer.color);

        // Outline
        if (d.style.text_frame == 1) {
            this.gfx.line(
                Polyline.from_BBox(text_bbox, thickness, layer.color),
            );
        }
        if (d.style.text_frame == 2) {
            const radius =
                text_bbox.w / 2 -
                text.get_effective_text_thickness() / 10000 / 2;
            this.gfx.arc(
                text_bbox.center,
                radius,
                Angle.from_degrees(0),
                Angle.from_degrees(360),
                thickness,
                layer.color,
            );
        }

        // Arrows
        const radial = d.end.sub(d.start);
        const arrow_angle = Angle.from_degrees(27.5);
        const inv_radial_angle = radial.angle.negative();
        const arrow_seg = new Vec2(d.style.arrow_length, 0);
        const arrow_end_pos = inv_radial_angle
            .add(arrow_angle)
            .rotate_point(arrow_seg);
        const arrow_end_neg = inv_radial_angle
            .sub(arrow_angle)
            .rotate_point(arrow_seg);

        this.gfx.line(
            [start.add(arrow_end_neg), start, start.add(arrow_end_pos)],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(text);
    }

    paint_linear(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        let extension = new Vec2();
        let xbar_start = new Vec2();
        let xbar_end = new Vec2();

        // See PCB_DIM_ORTHOGONAL::updateGeometry
        if (d.type == "orthogonal") {
            if (d.orientation == 0) {
                extension = new Vec2(0, d.height);
                xbar_start = d.start.add(extension);
                xbar_end = new Vec2(d.end.x, xbar_start.y);
            } else {
                extension = new Vec2(d.height, 0);
                xbar_start = d.start.add(extension);
                xbar_end = new Vec2(xbar_start.x, d.end.y);
            }
        }
        // See PCB_DIM_ALIGNED::updateGeometry
        else {
            const dimension = d.end.sub(d.start);
            if (d.height > 0) {
                extension = new Vec2(-dimension.y, dimension.x);
            } else {
                extension = new Vec2(dimension.y, -dimension.x);
            }

            const xbar_distance = extension
                .resize(d.height)
                .multiply(Math.sign(d.height));

            xbar_start = d.start.add(xbar_distance);
            xbar_end = d.end.add(xbar_distance);
        }

        // Draw extensions
        const extension_height =
            Math.abs(d.height) -
            d.style.extension_offset +
            d.style.extension_height;

        // First extension line
        let ext_start = d.start.add(extension.resize(d.style.extension_offset));
        let ext_end = ext_start.add(extension.resize(extension_height));
        this.gfx.line([ext_start, ext_end], thickness, layer.color);

        // Second extension line
        ext_start = d.end.add(extension.resize(d.style.extension_offset));
        ext_end = ext_start.add(extension.resize(extension_height));
        this.gfx.line([ext_start, ext_end], thickness, layer.color);

        // Draw crossbar
        // TODO: KiCAD checks to see if the text overlaps the crossbar and
        // conditionally splits or hides the crossbar.
        this.gfx.line([xbar_start, xbar_end], thickness, layer.color);

        // Arrows
        const xbar_angle = xbar_end.sub(xbar_start).angle.negative();
        const arrow_angle = Angle.from_degrees(27.5);
        const arrow_end_pos = xbar_angle
            .add(arrow_angle)
            .rotate_point(new Vec2(d.style.arrow_length, 0));
        const arrow_end_neg = xbar_angle
            .sub(arrow_angle)
            .rotate_point(new Vec2(d.style.arrow_length, 0));

        this.gfx.line(
            [
                xbar_start.add(arrow_end_neg),
                xbar_start,
                xbar_start.add(arrow_end_pos),
            ],
            thickness,
            layer.color,
        );
        this.gfx.line(
            [
                xbar_end.sub(arrow_end_neg),
                xbar_end,
                xbar_end.sub(arrow_end_pos),
            ],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(this.make_text(layer, d));
    }

    make_text(layer: ViewLayer, d: board_items.Dimension) {
        const pcbtext = new EDAText(d.gr_text.shown_text);
        pcbtext.apply_effects(d.gr_text.effects);
        pcbtext.apply_at(d.gr_text.at);
        pcbtext.attributes.color = layer.color;

        return pcbtext;
    }

    paint_text(text: EDAText) {
        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            text.shown_text,
            text.text_pos,
            text.attributes,
        );
        this.gfx.state.pop();
    }
}

export class BoardPainter extends DocumentPainter {
    override theme: BoardTheme;

    constructor(gfx: Renderer, layers: LayerSet, theme: BoardTheme) {
        super(gfx, layers, theme);
        this.painter_list = [
            new LinePainter(this, gfx),
            new RectPainter(this, gfx),
            new PolyPainter(this, gfx),
            new ArcPainter(this, gfx),
            new CirclePainter(this, gfx),
            new TraceSegmentPainter(this, gfx),
            new TraceArcPainter(this, gfx),
            new ViaPainter(this, gfx),
            new ZonePainter(this, gfx),
            new PadPainter(this, gfx),
            new FootprintPainter(this, gfx),
            new GrTextPainter(this, gfx),
            new FpTextPainter(this, gfx),
            new DimensionPainter(this, gfx),
        ];
    }

    // Used to filter out items by net when highlighting nets. Painters
    // should use this to determine whether to draw or skip the current item.
    #filter_net: number | null = null;

    get filter_net() {
        return this.#filter_net;
    }

    set filter_net(net: number | null) {
        this.#filter_net = net;
    }

    #net_bbox: BBox | null = null;

    get net_bbox() {
        return this.#net_bbox;
    }

    paint_footprint(fp: board_items.Footprint) {
        this.clear_interactive();

        const layer = this.layers.selection_mask;
        this.gfx.start_layer(layer.name);
        this.paint_item(layer, fp);
        layer.graphics = this.gfx.end_layer();
        layer.graphics.composite_operation = "source-over";
    }

    clear_interactive() {
        for (const layer of [
            this.layers.selection_bg,
            this.layers.selection_fg,
            this.layers.selection_mask,
        ])
            layer.clear();
    }

    paint_net(
        board: board_items.KicadPCB,
        net: number | null,
        layer_visibility: Map<string, boolean>,
    ) {
        if (this.filter_net === net) return false;

        if (!net) return false;

        this.filter_net = net;

        //SECTION - the background
        {
            const layer = this.layers.selection_bg;
            this.gfx.start_layer(layer.name);

            for (const item of board.items()) {
                switch (item.typeId) {
                    case "LineSegment": {
                        const line = item as board_items.LineSegment;
                        if (
                            layer_visibility.get(line.layer) &&
                            line.net !== net
                        ) {
                            const painter = this.painter_for(item);
                            if (!painter) continue;
                            this.paint_item(layer, item);
                        }

                        break;
                    }
                    default:
                        {
                            const painter = this.painter_for(item);

                            if (!painter) continue;

                            this.paint_item(layer, item);
                        }
                        break;
                }
            }

            layer.graphics = this.gfx.end_layer();
            layer.graphics.composite_operation = "source-over";
        }

        //SECTION - The foreground
        {
            this.#net_bbox = null;
            const layer = this.layers.selection_fg;
            this.gfx.start_layer(layer.name);

            for (const item of board.items()) {
                switch (item.typeId) {
                    case "LineSegment":
                        if ((item as board_items.LineSegment).net === net) {
                            const painter = this.painter_for(item);
                            const line = item as board_items.LineSegment;

                            if (!this.#net_bbox) this.#net_bbox = line.bbox;
                            else
                                this.#net_bbox = BBox.combine([
                                    line.bbox,
                                    this.#net_bbox,
                                ]);

                            if (!painter) continue;
                            this.paint_item(layer, item);
                        }
                        break;
                    case "Zone":
                        {
                            const painter = this.painter_for(item);

                            if (!painter) continue;

                            this.paint_item(layer, item);
                        }
                        break;

                    default:
                        break;
                }
            }

            layer.graphics = this.gfx.end_layer();
            layer.graphics.composite_operation = "source-over";
        }

        return true;
    }

    highlight(item: BoardInteractiveItem | null) {
        const layer = this.layers.overlay;
        layer.clear();
        this.gfx.start_layer(layer.name);
        if (item) {
            if (item instanceof LineInteractiveItem)
                this.gfx.line(
                    [item.line.start, item.line.end],
                    item.line.width,
                    Color.cyan,
                );
            else if (item instanceof BoxInteractiveItem)
                this.gfx.line(
                    [
                        item.bbox.top_left,
                        item.bbox.top_right,
                        item.bbox.bottom_right,
                        item.bbox.bottom_left,
                        item.bbox.top_left,
                    ],
                    0.2,
                    Color.cyan,
                );
        }
        layer.graphics = this.gfx.end_layer();
        layer.graphics.composite_operation = "source-over";
    }
}
