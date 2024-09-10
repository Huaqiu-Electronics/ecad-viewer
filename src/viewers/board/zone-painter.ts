import { Color, Polygon } from "../../graphics";
import * as board_items from "../../kicad/board";
import {
    CopperVirtualLayerNames,
    CopperLayerNames,
    LayerNames,
    ViewLayer,
    virtual_layer_for,
} from "./layers";
import { BoardItemPainter } from "./painter-base";

export class ZonePainter extends BoardItemPainter {
    classes = [board_items.Zone];
    color_cache: Color | null = null;

    layers_for(z: board_items.Zone): string[] {
        const layers = z.layers ?? [z.layer];

        if (layers.length && layers[0] == "F&B.Cu") {
            layers.shift();
            layers.push("F.Cu", "B.Cu");
        }

        return layers.map((l) => {
            if (CopperLayerNames.includes(l as LayerNames)) {
                return virtual_layer_for(l, CopperVirtualLayerNames.zones);
            } else {
                return l;
            }
        });
    }

    paint(layer: ViewLayer, z: board_items.Zone) {
        if (!z.filled_polygons) {
            return;
        }

        let color = layer.color;

        if (!this.color_cache) this.color_cache = color;

        if (this.filter_net) {
            if (z.net != this.filter_net) return;
            else color = this.color_cache;
        }

        for (const p of z.filled_polygons) {
            if (
                !layer.name.includes(p.layer) &&
                !BoardItemPainter.is_interactive_layer(layer.name)
            ) {
                continue;
            }

            // FIXME paint the arc in the polygon
            this.gfx.polygon(new Polygon(p.points, color));
        }
    }
}
