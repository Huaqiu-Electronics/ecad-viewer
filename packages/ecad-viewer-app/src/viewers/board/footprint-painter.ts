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

import { Angle, Matrix3, Vec2 } from "../../base/math";
import { Polyline } from "../../graphics";
import * as board_items from "../../kicad/board";
import { ViewLayerNames } from "../base/view-layers";
import { ViewLayer } from "./layers";
import { BoardItemPainter } from "./painter-base";

export class FootprintPainter extends BoardItemPainter {
    classes = [board_items.Footprint];

    layers_for(fp: board_items.Footprint): string[] {
        const layers = new Set();
        for (const item of fp.items()) {
            const item_layers = this.view_painter.layers_for(item);
            for (const layer of item_layers) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values()) as string[];
    }

    paint(layer: ViewLayer, fp: board_items.Footprint) {
        if (layer.name === ViewLayerNames.selection_mask) {
            const bbox = fp.bbox;
            let step = 0.5;
            if (bbox.w > bbox.h) {
                step = (step * bbox.w) / bbox.h;
            }

            let count = 0;
            {
                for (let x = bbox.x; x < bbox.x + bbox.w; x += step) {
                    const y0 =
                        bbox.y + bbox.h - (count * step * bbox.h) / bbox.w;
                    const y1 =
                        bbox.y + bbox.h - (count * step * bbox.h) / bbox.w;

                    this.gfx.line(
                        new Polyline(
                            [
                                new Vec2(x, bbox.y),
                                new Vec2(bbox.x + bbox.w, y0),
                            ],
                            0.1,
                            layer.color,
                        ),
                    );

                    if (count !== 0)
                        this.gfx.line(
                            new Polyline(
                                [
                                    new Vec2(x, bbox.y + bbox.h),
                                    new Vec2(bbox.x, y1),
                                ],
                                0.1,
                                layer.color,
                            ),
                        );
                    ++count;
                }
            }
            return;
        }

        const matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y,
        ).rotate_self(Angle.deg_to_rad(fp.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(matrix);

        const its = fp.items();

        for (const item of its) {
            const item_layers = this.view_painter.layers_for(item);
            if (
                BoardItemPainter.is_interactive_layer(layer.name) ||
                item_layers.includes(layer.name)
            ) {
                this.view_painter.paint_item(layer, item);
            }
        }

        this.gfx.state.pop();
    }
}
