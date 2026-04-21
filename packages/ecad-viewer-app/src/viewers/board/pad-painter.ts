import { Angle, Matrix3, Vec2 } from "../../base/math";
import * as log from "../../base/log";
import { Circle, Color, Polygon, Polyline } from "../../graphics";
import * as board_items from "../../kicad/board";
import {
    CopperVirtualLayerNames,
    LayerNames,
    ViewLayer,
    virtual_layer_for,
} from "./layers";
import { BoardItemPainter } from "./painter-base";

export class PadPainter extends BoardItemPainter {
    classes = [board_items.Pad];

    color_cache: Color | null = null;

    layers_for(pad: board_items.Pad): string[] {
        // TODO: Port KiCAD's logic over.
        const layers: string[] = [];

        for (const layer of pad.layers) {
            if (layer == "*.Mask") {
                layers.push(LayerNames.f_mask);
                layers.push(LayerNames.b_mask);
            } else if (layer == "*.Paste") {
                layers.push(LayerNames.f_paste);
                layers.push(LayerNames.b_paste);
            } else {
                layers.push(
                    virtual_layer_for(layer, CopperVirtualLayerNames.pads),
                );
            }
        }

        switch (pad.type) {
            case "thru_hole":
                layers.push(LayerNames.pad_holewalls);
                layers.push(LayerNames.pad_holes);
                break;
            case "np_thru_hole":
                layers.push(LayerNames.non_plated_holes);
                break;
            case "smd":
            case "connect":
                break;
            default:
                log.warn(`Unhandled pad type "${pad.type}"`);
                break;
        }

        return layers;
    }

    paint(layer: ViewLayer, pad: board_items.Pad) {
        let color = layer.color;
        if (!this.color_cache) this.color_cache = color;

        if (this.filter_net) {
            if (pad.net?.number === this.filter_net) color = this.color_cache;
            else color = this.color_cache.grayscale;
        }

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y,
        );
        position_mat.rotate_self(-Angle.deg_to_rad(pad.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(pad.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(position_mat);

        const center = new Vec2(0, 0);

        const is_hole_layer =
            layer.name == LayerNames.pad_holes ||
            layer.name == LayerNames.non_plated_holes;

        if (is_hole_layer && pad.drill != null) {
            if (!pad.drill.oval) {
                const drill_pos = center.add(pad.drill.offset);
                this.gfx.circle(
                    new Circle(drill_pos, pad.drill.diameter / 2, color),
                );
            } else {
                const half_size = new Vec2(
                    pad.drill.diameter / 2,
                    (pad.drill.width ?? 0) / 2,
                );

                const half_width = Math.min(half_size.x, half_size.y);

                const half_len = new Vec2(
                    half_size.x - half_width,
                    half_size.y - half_width,
                );

                const drill_pos = center.add(pad.drill.offset);
                const drill_start = drill_pos.sub(half_len);
                const drill_end = drill_pos.add(half_len);

                this.gfx.line(
                    new Polyline(
                        [drill_start, drill_end],
                        half_width * 2,
                        color,
                    ),
                );
            }
        } else {
            let shape = pad.shape;
            if (shape == "custom" && pad.options?.anchor) {
                shape = pad.options.anchor;
            }

            if (pad.drill?.offset) {
                this.gfx.state.matrix.translate_self(
                    pad.drill.offset.x,
                    pad.drill.offset.y,
                );
            }

            switch (shape) {
                case "circle":
                    this.gfx.circle(new Circle(center, pad.size.x / 2, color));
                    break;
                case "rect":
                    {
                        const rect_points = [
                            new Vec2(-pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, pad.size.y / 2),
                            new Vec2(-pad.size.x / 2, pad.size.y / 2),
                        ];
                        this.gfx.polygon(new Polygon(rect_points, color));
                    }
                    break;
                case "roundrect":
                case "trapezoid":
                    // KiCAD approximates rounded rectangle using four line segments
                    // with their width set to the round radius. Clever bastards.
                    // Since our polylines aren't filled, we'll add both a polygon
                    // and a polyline.
                    {
                        const rounding =
                            Math.min(pad.size.x, pad.size.y) *
                            (pad.roundrect_rratio ?? 0);
                        let half_size = new Vec2(
                            pad.size.x / 2,
                            pad.size.y / 2,
                        );
                        half_size = half_size.sub(new Vec2(rounding, rounding));

                        let trap_delta = pad.rect_delta
                            ? pad.rect_delta.copy()
                            : new Vec2(0, 0);
                        trap_delta = trap_delta.multiply(0.5);

                        const rect_points = [
                            new Vec2(
                                -half_size.x - trap_delta.y,
                                half_size.y + trap_delta.x,
                            ),
                            new Vec2(
                                half_size.x + trap_delta.y,
                                half_size.y - trap_delta.x,
                            ),
                            new Vec2(
                                half_size.x - trap_delta.y,
                                -half_size.y + trap_delta.x,
                            ),
                            new Vec2(
                                -half_size.x + trap_delta.y,
                                -half_size.y - trap_delta.x,
                            ),
                        ];

                        // this.gfx.push_transform(offset_mat);
                        this.gfx.polygon(new Polygon(rect_points, color));
                        this.gfx.line(
                            new Polyline(
                                [...rect_points, rect_points[0]!],
                                rounding * 2,
                                color,
                            ),
                        );
                        // this.gfx.pop_transform();
                    }
                    break;

                case "oval":
                    {
                        const half_size = new Vec2(
                            pad.size.x / 2,
                            pad.size.y / 2,
                        );
                        const half_width = Math.min(half_size.x, half_size.y);
                        const half_len = new Vec2(
                            half_size.x - half_width,
                            half_size.y - half_width,
                        );

                        const pad_pos = center.add(
                            pad.drill?.offset || new Vec2(0, 0),
                        );
                        const pad_start = pad_pos.sub(half_len);
                        const pad_end = pad_pos.add(half_len);

                        if (pad_start.equals(pad_end)) {
                            this.gfx.circle(
                                new Circle(pad_pos, half_width, color),
                            );
                        } else {
                            this.gfx.line(
                                new Polyline(
                                    [pad_start, pad_end],
                                    half_width * 2,
                                    color,
                                ),
                            );
                        }
                    }
                    break;

                default:
                    log.warn(`Unknown pad shape "${pad.shape}"`);
                    break;
            }

            if (pad.shape == "custom" && pad.primitives) {
                for (const prim of pad.primitives) {
                    this.view_painter.paint_item(layer, prim);
                }
            }
        }

        this.gfx.state.pop();
    }
}
