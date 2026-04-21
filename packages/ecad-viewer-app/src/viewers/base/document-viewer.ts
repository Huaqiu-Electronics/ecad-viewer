/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Vec2 } from "@ecad-viewer/base/src/math";
import {
    DrawingSheet,
    type DrawingSheetDocument,
    type BaseTheme,
} from "kicad-parser/src/kicad";
import { Grid } from "./grid";
import type { DocumentPainter, PaintableDocument } from "./painter";
import { ViewLayerNames, type ViewLayerSet } from "./view-layers";
import { Viewer } from "./viewer";
import { later } from "@ecad-viewer/base/src/async";
import { DrawingSheetPainter } from "../../drawing-sheet/painter";
import { is_showing_design_block } from "../../ecad-viewer/ecad_viewer_global";
import { Color } from "@ecad-viewer/base";

type ViewableDocument = DrawingSheetDocument &
    PaintableDocument & {
        filename: string;
        bbox: BBox;
        is_converted_from_ad?: boolean;
    };
const zoom_speed = 0.005;
const delta = 3;

export abstract class DocumentViewer<
    DocumentT extends ViewableDocument,
    PainterT extends DocumentPainter,
    ViewLayerSetT extends ViewLayerSet,
    ThemeT extends BaseTheme,
> extends Viewer {
    public document: DocumentT;
    public drawing_sheet: DrawingSheet;
    declare public layers: ViewLayerSetT;
    public theme: ThemeT;

    protected painter: PainterT;
    protected grid: Grid;

    protected static FACTOR_zoom_fit_top_item = 1.6;

    constructor(
        canvas: HTMLCanvasElement,
        interactive: boolean,
        theme: ThemeT,
    ) {
        super(canvas, interactive);
        this.theme = theme;
    }

    protected abstract create_painter(): PainterT;
    protected abstract create_layer_set(): ViewLayerSetT;
    protected get grid_origin(): Vec2 {
        return new Vec2(0, 0);
    }

    override async load(src: DocumentT) {
        await this.setup_finished;

        if (this.document == src) {
            return;
        }

        this.document = src;
        this.paint();

        // Wait for a valid viewport size
        later(async () => {
            await this.viewport.ready;
            const c = this.document as unknown as any;
            this.viewport.bounds = c.bbox.grow(11);

            // Position the camera and draw the scene.
            this.zoom_fit_top_item();

            // Mark the viewer as loaded and notify event listeners
            this.resolve_loaded(true);

            // Draw
            this.draw();
        });
    }

    public override paint() {
        if (!this.document) {
            return;
        }

        // Update the renderer's background color to match the theme.
        this.renderer.background_color = is_showing_design_block()
            ? Color.white
            : this.theme.background;

        // Load the default drawing sheet.
        if (!this.drawing_sheet) {
            // TODO: Fix drawing sheet loading
            this.drawing_sheet = new DrawingSheet({
                version: 1,
                generator: "Ecad Viewer",
                setup: {
                    linewidth: 0.15,
                    textsize: { x: 1.5, y: 1.5 },
                    textlinewidth: 0.15,
                    top_margin: 0,
                    left_margin: 0,
                    bottom_margin: 0,
                    right_margin: 0
                },
                drawings: []
            });
            this.drawing_sheet.document = {
                paper: { size: "A4", portrait: false },
                resolve_text_var: () => undefined
            };
        }
        this.drawing_sheet.document = this.document;

        // Setup graphical layers
        this.disposables.disposeAndRemove(this.layers);
        this.layers = this.disposables.add(this.create_layer_set());

        // Paint the board
        this.painter = this.create_painter();
        this.painter.paint(this.document);

        // Paint the drawing sheet
        if (!this.document.is_converted_from_ad && !is_showing_design_block())
            new DrawingSheetPainter(
                this.renderer,
                this.layers,
                this.theme,
            ).paint(this.drawing_sheet);

        // Create the grid
        this.grid = new Grid(
            this.renderer,
            this.viewport.camera,
            this.layers.by_name(ViewLayerNames.grid)!,
            this.grid_origin,
            this.theme.grid,
            this.theme.grid_axes,
        );
    }

    public override zoom_in() {
        this.genericZoom(true);
    }

    protected genericZoom(zoomIn: boolean) {
        this.viewport.camera.zoom *= Math.exp(
            (zoomIn ? delta : -delta) * -zoom_speed,
        );
        this.viewport.camera.zoom = Math.min(
            Viewer.MaxZoom,
            Math.max(this.viewport.camera.zoom, Viewer.MinZoom),
        );
        this.draw();
    }

    public override zoom_out() {
        this.genericZoom(false);
    }

    public override move(pos: Vec2): void {}

    public override zoom_fit_top_item() {
        this.viewport.camera.bbox = this.document.bbox.grow(
            DocumentViewer.FACTOR_zoom_fit_top_item,
        );
        this.draw();
    }

    public override draw(): void {
        if (!this.viewport) {
            return;
        }

        this.grid?.update();

        super.draw();
    }
}












