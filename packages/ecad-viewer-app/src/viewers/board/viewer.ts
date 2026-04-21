/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { CrossHightAble } from "../../base/cross_highlight_able";
import { Logger } from "../../base/log";
import { Vec2 } from "../../base/math";
import { Color, Renderer } from "../../graphics";
import { WebGL2Renderer } from "../../graphics/webgl";
import type { BoardTheme } from "../../kicad";
import * as board_items from "../../kicad/board";
import {
    BoardBBoxVisitor,
    type BoardInteractiveItem,
    Depth,
    type NetProperty,
} from "../../kicad/board_bbox_visitor";
import type { KCBoardLayersPanelElement } from "../../kicanvas/elements/kc-board/layers-panel";
import { DocumentViewer } from "../base/document-viewer";
import { CommentClickEvent, KiCanvasFitterMenuEvent, KiCanvasSelectEvent } from "../base/events";
import type { VisibilityType } from "../base/view-layers";
import { ViewerType } from "../base/viewer";
import { LayerNames, LayerSet, ViewLayer } from "./layers";
import { BoardPainter } from "./painter";
import { OrderedMap } from "immutable";
const log = new Logger("pcb:viewer");

export const ZONE_DEFAULT_OPACITY = 0.6;

export class BoardViewer extends DocumentViewer<
    board_items.KicadPCB,
    BoardPainter,
    LayerSet,
    BoardTheme
> {
    #should_restore_visibility = false;
    #zones_visibility = new Map<string, VisibilityType>();
    #layer_visibility_ctrl: KCBoardLayersPanelElement;

    set layer_visibility_ctrl(ctr: KCBoardLayersPanelElement) {
        this.#layer_visibility_ctrl = ctr;
    }
    public highlight_net(num: number | null) {
        this.#layer_visibility_ctrl.clear_highlight();
        if (this.painter.paint_net(this.board, num, this.layer_visibility)) {
            this.#should_restore_visibility = false;
            if (num) {
                this.#should_restore_visibility = true;
                for (const layer of this.layers.in_ui_order()) {
                    layer.visible = false;
                }
            }
            this.draw();
        }
        if (num) {
            this.dispatchEvent(
                new KiCanvasSelectEvent({
                    item: {
                        net: this.board.getNetName(num),
                        ...this.#net_info.get(num),
                    },
                    previous: null,
                }),
            );
        }
    }
    protected override on_document_clicked(): void {
        if (this.#should_restore_visibility) {
            const visibilities = this.layer_visibility;
            for (const layer of this.layers.in_ui_order()) {
                layer.visible = visibilities.get(layer.name)!;
            }
            this.#should_restore_visibility = false;
            this.painter.clear_interactive();
            this.draw();
        }

        if (this.#zones_visibility.size) {
            this.painter.clear_interactive();
            for (const layer of this.layers.zone_layers()) {
                layer.visible = this.#zones_visibility.get(layer.name)!;
            }
            this.#zones_visibility.clear();
            this.draw();
        }
    }

    public highlight_fp(fp: board_items.Footprint) {
        if (!this.#zones_visibility.size)
            for (const layer of this.layers.zone_layers()) {
                this.#zones_visibility.set(layer.name, layer.visibility);
                layer.visible = false;
            }
        this.painter.paint_footprint(fp);
        this.draw();
    }

    public focus_net(num: number | null) {
        this.highlight_net(num);
        const net_bbox = this.painter.net_bbox;
        if (net_bbox) {
            this.viewport.camera.bbox = net_bbox.grow(
                net_bbox.w * 0.5,
                net_bbox.h * 0.5,
            );
        }
    }

    override on_click(pos: Vec2, event?: MouseEvent): void {
        const items = this.find_items_under_pos(pos);

        // In comment mode, dispatch CommentClickEvent with element info
        if (this.commentModeEnabled && event) {
            // Only dispatch if we found an element
            if (items.length > 0) {
                const it = items[0]!;
                const item = it.item as any;

                // const rect = this.canvas.getBoundingClientRect();
                this.dispatchEvent(
                    new CommentClickEvent({
                        worldX: pos.x,
                        worldY: pos.y,
                        screenX: event.clientX,
                        screenY: event.clientY,
                        layer: it.is_on_layer?.("F.Cu") ? "F.Cu" : "B.Cu",
                        context: "PCB",
                        elementType: item?.typeId || "Unknown",
                        elementId: item?.uuid || "",
                        elementRef: item?.reference || item?.designator || "",
                        element: item,
                    }),
                );
            }
            // Don't dispatch select event in comment mode
            return;
        }

        // Normal mode - dispatch selection events
        if (items.length > 0) {
            if (items.length == 1) {
                const it = items[0];
                if (it) {
                    this.dispatchEvent(
                        new KiCanvasSelectEvent({
                            item: it.item,
                            previous: null,
                        }),
                    );
                    this.dispatchEvent(
                        new KiCanvasFitterMenuEvent({
                            items: [],
                        }),
                    );
                }
            } else {
                this.dispatchEvent(
                    new KiCanvasSelectEvent({
                        item: null,
                        previous: null,
                    }),
                );
                this.dispatchEvent(
                    new KiCanvasFitterMenuEvent({
                        items: items,
                    }),
                );
            }
        }
    }

    get layer_visibility() {
        return this.#layer_visibility_ctrl?.visibilities ?? null;
    }

    find_items_under_pos(pos: Vec2) {
        const items: BoardInteractiveItem[] = [];

        if (!this.#layer_visibility_ctrl) return items;

        const visible_layers: Set<string> = new Set();
        for (const [k, v] of this.layer_visibility)
            if (v) visible_layers.add(k);

        const is_item_visible = (item: BoardInteractiveItem) => {
            for (const layer of visible_layers)
                if (item.is_on_layer(layer)) return true;

            return false;
        };

        const check_depth = (depth: Depth) => {
            const layer_items = this.#interactive.get(depth) ?? [];
            if (layer_items.length)
                for (const i of layer_items) {
                    if (i.contains(pos) && is_item_visible(i)) {
                        items.push(i);
                    }
                }
        };

        for (const [depth] of this.#interactive) {
            switch (depth) {
                case Depth.GRAPHICS:
                    break;
                case Depth.VIA:
                case Depth.PAD:
                case Depth.LINE_SEGMENTS:
                    check_depth(depth);
                    break;
                case Depth.FOOT_PRINT:
                case Depth.ZONE:
                    break;
            }
        }

        // look up the footprints then
        if (!items.length) check_depth(Depth.FOOT_PRINT);

        // look up the zones finally
        if (!items.length) check_depth(Depth.ZONE);

        return items;
    }

    override on_dblclick(pos: Vec2): void {
        const items = this.find_items_under_pos(pos);

        if (items.length > 0) {
            {
                const it = items[0]!;
                if (it.net) {
                    this.highlight_net(it.net);
                } else if (it.item?.typeId === "Footprint") {
                    this.painter.filter_net = null;
                    this.highlight_fp(it.item as board_items.Footprint);
                }
            }
        }
    }
    override type: ViewerType = ViewerType.PCB;

    #interactive: OrderedMap<Depth, BoardInteractiveItem[]> = OrderedMap();

    #net_info: Map<number, NetProperty>;

    #last_hover: BoardInteractiveItem | null = null;

    #highlighted_track = true;

    set_highlighted_track(val: boolean) {
        this.#highlighted_track = val;
    }

    get board(): board_items.KicadPCB {
        return this.document;
    }

    override async load(src: board_items.KicadPCB) {
        try {
            const visitor = new BoardBBoxVisitor();
            visitor.visit(src);

            for (let k = Depth.START; k < Depth.END; k++)
                this.#interactive = this.#interactive.set(k, []);

            for (const e of visitor.interactive_items)
                this.#interactive.get(e.depth)?.push(e);
            this.#net_info = visitor.net_info;
        } catch (e) {
            log.warn(`BoardBBoxVisitor error :${e}`);
        }
        await super.load(src);
    }

    protected override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new WebGL2Renderer(canvas);
        renderer.background_color = Color.gray;
        return renderer;
    }

    protected override create_painter() {
        return new BoardPainter(this.renderer, this.layers, this.theme);
    }

    protected override create_layer_set() {
        const layers = new LayerSet(this.board, this.theme);

        for (const zone of layers.zone_layers())
            zone.opacity = ZONE_DEFAULT_OPACITY;

        for (const it of layers.hidden_txt_layers()) {
            it.opacity = 0;
        }

        return layers;
    }

    protected override get grid_origin() {
        return new Vec2(0, 0);
    }

    private set_layers_opacity(layers: Generator<ViewLayer>, opacity: number) {
        for (const layer of layers) {
            layer.opacity = opacity;
        }
        this.draw();
    }

    set track_opacity(value: number) {
        this.set_layers_opacity(
            (this.layers as LayerSet).copper_layers(),
            value,
        );
    }

    set via_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).via_layers(), value);
    }

    set zone_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).zone_layers(), value);
    }

    set pad_opacity(value: number) {
        const st = this.layers as LayerSet;

        for (const it of [st.pad_layers(), st.pad_hole_layers()])
            this.set_layers_opacity(it, value);
    }

    set grid_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).grid_layers(), value);
    }

    set page_opacity(value: number) {
        this.layers.by_name(LayerNames.drawing_sheet)!.opacity = value;
        this.draw();
    }

    zoom_to_board() {
        const edge_cuts = this.layers.by_name(LayerNames.edge_cuts)!;
        const board_bbox = edge_cuts.bbox;
        this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }

    findHighlightItem(pos: Vec2): CrossHightAble | null {
        return null;
    }

    findInteractive(pos: Vec2) {
        if (!this.#layer_visibility_ctrl) return null;

        const visible_layers: Set<string> = new Set();
        for (const [k, v] of this.layer_visibility)
            if (v) visible_layers.add(k);

        const is_item_visible = (item: BoardInteractiveItem) => {
            for (const layer of visible_layers)
                if (item.is_on_layer(layer)) return true;

            return false;
        };

        for (const [, v] of this.#interactive) {
            for (const e of v) {
                if (e.contains(pos) && is_item_visible(e)) {
                    return e;
                }
            }
        }
        return null;
    }

    override on_hover(_pos: Vec2) {
        const hover_item = this.findInteractive(_pos);

        if (hover_item === this.#last_hover) return;

        this.#last_hover = hover_item;

        if (
            !this.#highlighted_track &&
            hover_item?.depth === Depth.LINE_SEGMENTS
        )
            return;

        this.painter.highlight(hover_item);
        this.draw();
    }
}
