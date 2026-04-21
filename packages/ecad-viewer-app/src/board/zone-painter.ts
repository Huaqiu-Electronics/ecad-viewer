import { Color, Polygon } from "@ecad-viewer/base";
import { Kicad } from "kicad-parser";
import {
    CopperVirtualLayerNames,
    CopperLayerNames,
    ViewLayer,
    virtual_layer_for,
} from "./layers";
import { BoardItemPainter } from "./painter-base";

export class ZonePainter extends BoardItemPainter {
    classes = [Kicad.Zone];
    color_cache: Color | null = null;

    layers_for(z: any): string[] {
        const layers = z.layers ?? [z.layer];

        if (layers.length && layers[0] == "F&B.Cu") {
            layers.shift();
            layers.push("F.Cu", "B.Cu");
        }

        return layers.map((l: string) => {
            if (CopperLayerNames.includes(l)) {
                return virtual_layer_for(l, CopperVirtualLayerNames.zones);
            } else {
                return l;
            }
        });
    }

    paint(layer: ViewLayer, z: any) {
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












