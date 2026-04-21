/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Vec2 } from "../../base/math";
import { is_showing_design_block } from "../../ecad-viewer/ecad_viewer_global";
import { Color, Polygon, Polyline, Renderer } from "../../graphics";
import { Canvas2DRenderer } from "../../graphics/canvas2d";
import { NullRenderer } from "../../graphics/null-renderer";
import { type SchematicTheme } from "../../kicad";
import { HierarchicalSheetPin, KicadSch, Label } from "../../kicad/schematic";
import { DocumentViewer } from "../base/document-viewer";
import {
    HierarchicalSheetPinClickEvent,
    KiCanvasSelectEvent,
    LabelClickEvent,
    SheetChangeEvent,
    SheetLoadEvent,
    CommentClickEvent,
} from "../base/events";
import { ViewerType } from "../base/viewer";
import { LayerNames, LayerSet } from "./layers";
import { SchematicPainter } from "./painter";
import { get_symbol_transform } from "./painters/symbol";
import { StrokeFont, TextAttributes } from "../../kicad/text";
import type { PinCheckResult } from "../../proto/component_erc_result";

export function get_sch_bbox(theme: SchematicTheme, sch: KicadSch): BBox {
    const gfx = new NullRenderer();
    const layerset = new LayerSet(theme);
    const painter = new SchematicPainter(gfx, layerset, theme);

    const layer_names = [
        LayerNames.symbol_foreground,
        LayerNames.symbol_background,
        LayerNames.symbol_pin,
        LayerNames.wire,
        LayerNames.label,
        LayerNames.junction,
        LayerNames.notes,
    ];

    const bboxes = [];

    for (const layer_name of layer_names) {
        const layer = layerset.by_name(layer_name)!;
        for (const it of sch.items()) layer.items.push(it);
        painter.paint_layer(layer);
        bboxes.push(layer.bbox);
    }

    return BBox.combine(bboxes);
}

export class SchematicViewer extends DocumentViewer<
    KicadSch,
    SchematicPainter,
    LayerSet,
    SchematicTheme
> {
    static InterActiveBBoxLineWidth = 0.265;

    public override commentModeEnabled = false;

    #focus_net_item?: string;

    get sch_name() {
        return this.document.filename;
    }

    set focus_net_item(ref: string | undefined) {
        this.#focus_net_item = ref;
    }

    override async load(src: KicadSch) {
        this.schematic_renderer.reset_scene_bbox();
        await super.load(src);
        this.dispatchEvent(new SheetLoadEvent(src.filename));
    }

    find_item(pos: Vec2) {
        let selected: BBox | null = null;
        const items = this.layers.query_point_in_order(pos);
        for (const it of items) {
            if (it.bbox.context) {
                selected = it.bbox;
                return {
                    item: it.bbox.context,
                    bbox: selected,
                };
            }
        }

        return {
            item: null,
            bbox: null,
        };
    }

    override on_click(pos: Vec2): void {
        const ct = this.find_item(pos);

        if (this.commentModeEnabled) {
            // Dispatch comment click event
            this.dispatchEvent(
                new CommentClickEvent({
                    worldX: pos.x,
                    worldY: pos.y,
                    screenX: 0, // Viewer doesn't easily know screen coords here without viewport transform, but visualizer uses world anyway.
                    // Actually we can get screen coords if needed, but let's stick to world for now or calc it.
                    // Visualizer.tsx calculation:
                    //   setPendingLocation({ x: detail.worldX, y: detail.worldY, layer: detail.layer || "F.Cu" });
                    // It uses worldX/Y.

                    screenY: 0,
                    layer: "Schematic",
                    context: "SCH",
                    element: ct.item,
                    elementType: ct.item?.constructor.name,
                })
            );
            return;
        }

        if (ct.item) {
            const it = ct.item;
            this.dispatchEvent(
                new KiCanvasSelectEvent({
                    item: it,
                    previous: null,
                }),
            );

            if (it instanceof Label) {
                if (it.uuid) {
                    const index = {
                        name: it.text,
                        uuid: it.uuid,
                    };

                    if (it instanceof HierarchicalSheetPin) {
                        this.dispatchEvent(
                            new HierarchicalSheetPinClickEvent(index),
                        );
                    } else {
                        this.dispatchEvent(new LabelClickEvent(index));
                    }
                }
            }
        }
        this.paint_selected(ct.bbox);
    }
    override on_dblclick(pos: Vec2): void {
        if (this.document.sheets)
            for (const item of this.document.sheets) {
                if (item.bbox.contains_point(pos) && item.sheetfile) {
                    this.dispatchEvent(new SheetChangeEvent(item.sheetfile));
                    break;
                }
            }
    }

    protected override resolve_loaded(value: boolean) {
        super.resolve_loaded(value);

        if (value && this.#focus_net_item) {
            this.zoom_fit_item(this.#focus_net_item);
        }

        this.#focus_net_item = undefined;
    }

    override on_hover(pos: Vec2): void {
        const it = this.find_item(pos);
        const layer = this.layers.overlay;

        layer.clear();

        if (it.bbox) {
            const color = Color.cyan;
            this.renderer.start_layer(layer.name);

            this.renderer.line(
                Polyline.from_BBox(
                    it.bbox,
                    SchematicViewer.InterActiveBBoxLineWidth,
                    color,
                ),
            );

            layer.graphics = this.renderer.end_layer();

            layer.graphics.composite_operation = "source-over";
        }

        this.draw();
    }
    override type: ViewerType = ViewerType.SCHEMATIC;

    get schematic(): KicadSch {
        return this.document;
    }

    get schematic_renderer() {
        return this.renderer as Canvas2DRenderer;
    }

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new Canvas2DRenderer(canvas);
        renderer.state.fill = this.theme.note;
        renderer.state.stroke = this.theme.note;
        renderer.state.stroke_width = 0.1524;
        renderer.background_color = Color.gray;
        return renderer;
    }
    public override zoom_fit_top_item() {
        if (!this.document.is_converted_from_ad)
            this.viewport.camera.bbox = get_sch_bbox(
                this.theme,
                this.document,
            ).grow(10);
        else if (is_showing_design_block()) {
            this.viewport.camera.bbox =
                this.schematic_renderer.scene_bbox.grow(10);
        } else {
            this.viewport.camera.bbox =
                this.schematic_renderer.scene_bbox.grow(10);
        }
        this.draw();
    }

    public zoom_fit_item(uuid: string) {
        const bbox = this.schematic_renderer.get_item_bbox(uuid);
        if (bbox) {
            this.viewport.camera.bbox = bbox.grow(20);
            this.draw();
            this.paint_selected(bbox);
        }
    }

    protected override create_painter() {
        return new SchematicPainter(this.renderer, this.layers, this.theme);
    }

    protected override create_layer_set() {
        return new LayerSet(this.theme);
    }

    protected paint_selected(selected: BBox | null) {
        const layer = this.layers.selection_bg;

        layer.clear();

        if (selected) {
            const color = new Color(0.1, 0.2, 1, 0.2);
            this.renderer.start_layer(layer.name);

            this.renderer.line(
                Polyline.from_BBox(
                    selected,
                    SchematicViewer.InterActiveBBoxLineWidth,
                    color,
                ),
            );

            this.renderer.polygon(Polygon.from_BBox(selected, color));

            layer.graphics = this.renderer.end_layer();

            layer.graphics.composite_operation = "source-over";
        }

        this.paint_erc();

        this.draw();
    }

    #erc_data?: { uuid: string; pins: PinCheckResult[] };

    public show_erc(uuid: string, pins: PinCheckResult[]) {
        this.#erc_data = { uuid, pins };
        this.zoom_fit_item(uuid);
        // zoom_fit_item calls paint_selected, which now calls paint_erc
    }

    protected paint_erc() {
        const layer = this.layers.by_name(LayerNames.erc)!;
        layer.clear();

        if (!this.#erc_data) {
            return;
        }

        const { uuid, pins } = this.#erc_data;
        // Verify the item is still in the document
        const symbol = this.document.find_symbol(uuid);
        if (!symbol) {
            return;
        }

        const transform = get_symbol_transform(symbol);
        const matrix = transform.matrix;
        const symbol_pos = symbol.at.position;

        this.renderer.start_layer(layer.name);

        const font = StrokeFont.default();

        for (const pin_err of pins) {
            // Find pin in symbol
            // symbol.pins contains PinInstance
            const pin_inst = symbol.pins.find(
                (p) => p.number == pin_err.pin_num,
            );
            if (!pin_inst) continue;

            // pin_inst.definition returns PinDefinition directly (from LibSymbol.pin_by_number)
            const pin_def = pin_inst.definition;
            const pin_pos = symbol_pos.add(
                matrix.transform(pin_def.at.position),
            );

            const severity_color =
                pin_err.severity == "error"
                    ? (this.theme.erc_error ?? new Color(1, 0, 0))
                    : (this.theme.erc_warning ?? new Color(1, 0.6, 0));

            // Draw marker polygon (KiCad's distinctive arrow-like shape)
            // Shape coordinates from KiCad's marker_base.cpp MarkerShapeCorners
            // Scaled to fit schematic units
            const markerScale = 0.2;
            const markerShapeCorners = [
                new Vec2(0, 0),
                new Vec2(8, 1),
                new Vec2(4, 3),
                new Vec2(13, 8),
                new Vec2(9, 9),
                new Vec2(8, 13),
                new Vec2(3, 4),
                new Vec2(1, 8),
                new Vec2(0, 0),
            ];
            
            // Scale and translate the marker shape to pin position
            const markerPoints = markerShapeCorners.map((corner) =>
                pin_pos.add(corner.mul(markerScale))
            );
            
            this.renderer.polygon(new Polygon(markerPoints, severity_color));

            if (pin_err.message) {
                // Draw text
                this.renderer.state.push();
                // Position text slightly offset from pin
                const text_pos = pin_pos.add(new Vec2(1, -1));

                const attrs = new TextAttributes();
                // KiCad StrokeFont expects units in 10000 scale (1mm = 10000IU approx for these internal calcs)
                // StrokeFont.draw applies a 0.0001 scale transform.
                // So 1.27mm should be passed as 12700.
                attrs.size = new Vec2(1.27 * 10000, 1.27 * 10000);
                attrs.stroke_width = 0.15 * 10000;
                attrs.color = severity_color;
                attrs.h_align = "left";
                attrs.v_align = "bottom";

                font.draw(
                    this.renderer,
                    pin_err.message,
                    new Vec2(text_pos.x * 10000, text_pos.y * 10000),
                    attrs,
                );
                this.renderer.state.pop();
            }
        }

        layer.graphics = this.renderer.end_layer();
        layer.graphics.composite_operation = "source-over";
    }
}
