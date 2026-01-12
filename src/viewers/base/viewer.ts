/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Barrier } from "../../base/async";
import { Disposables, type IDisposable } from "../../base/disposable";
import { listen } from "../../base/events";
import { Vec2 } from "../../base/math";
import { Renderer } from "../../graphics";
import {
    CommentClickEvent,
    KiCanvasLoadEvent,
    KiCanvasMouseMoveEvent,
    type KiCanvasEventMap,
} from "./events";
import { ViewLayerSet } from "./view-layers";
import { Viewport } from "./viewport";

export enum ViewerType {
    SCHEMATIC,
    PCB,
}

export abstract class Viewer extends EventTarget {
    public renderer: Renderer;
    public viewport: Viewport;
    public layers: ViewLayerSet;
    #mouse_position: Vec2 = new Vec2(0, 0);
    #mouse_client_pos: Vec2 = new Vec2(0, 0);
    #page_mouse_pos: Vec2 = new Vec2(0, 0);

    get client_mouse_pos(): Vec2 {
        return this.#mouse_client_pos;
    }

    get page_mouse_pos(): Vec2 {
        return this.#page_mouse_pos;
    }

    public loaded = new Barrier();

    abstract type: ViewerType;

    public static MinZoom = 0.5;
    public static MaxZoom = 190;

    protected disposables = new Disposables();
    protected setup_finished = new Barrier();

    /**
     * When true, clicks dispatch CommentClickEvent instead of normal selection.
     */
    public commentModeEnabled = false;

    /**
     * Current active layer name for comments (override in subclass).
     */
    protected get activeLayerName(): string {
        return "";
    }

    constructor(
        public canvas: HTMLCanvasElement,
        protected interactive = true,
    ) {
        super();
    }

    dispose() {
        this.disposables.dispose();
    }

    override addEventListener<K extends keyof KiCanvasEventMap>(
        type: K,
        listener:
            | ((this: Viewer, ev: KiCanvasEventMap[K]) => void)
            | { handleEvent: (ev: KiCanvasEventMap[K]) => void }
            | null,
        options?: boolean | AddEventListenerOptions,
    ): IDisposable;
    override addEventListener(
        type: string,
        listener: EventListener | null,
        options?: boolean | AddEventListenerOptions,
    ): IDisposable {
        super.addEventListener(type, listener, options);
        return {
            dispose: () => {
                this.removeEventListener(type, listener, options);
            },
        };
    }

    protected abstract create_renderer(canvas: HTMLCanvasElement): Renderer;

    async setup() {
        this.renderer = this.disposables.add(this.create_renderer(this.canvas));

        await this.renderer.setup();

        this.viewport = this.disposables.add(
            new Viewport(this.renderer, () => {
                this.on_viewport_change();
            }),
        );

        if (this.interactive) {
            this.viewport.enable_pan_and_zoom(Viewer.MinZoom, Viewer.MaxZoom);

            this.disposables.add(
                listen(this.canvas, "mousemove", (e) => {
                    this.on_mouse_change(e);
                }),
            );

            this.disposables.add(
                listen(this.canvas, "panzoom", (e) => {
                    this.on_mouse_change(e as MouseEvent);
                }),
            );

            this.disposables.add(
                listen(this.canvas, "click", (e) => {
                    // Always call on_click - subclasses can check commentModeEnabled
                    // to dispatch CommentClickEvent with element info
                    this.on_click(this.#mouse_position, e);
                }),
            );

            this.disposables.add(
                listen(this.canvas, "dblclick", (e) => {
                    this.on_dblclick(this.#mouse_position);
                }),
            );
            document.addEventListener("click", () => {
                this.on_document_clicked();
            });
        }

        this.setup_finished.open();
    }

    protected on_viewport_change() {
        if (this.interactive) {
            this.draw();
        }
    }

    protected on_mouse_change(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        this.#mouse_client_pos = new Vec2(e.clientX, e.clientY);
        this.#page_mouse_pos = new Vec2(e.pageX, e.pageY);
        const new_position = this.viewport.camera.screen_to_world(
            new Vec2(e.clientX - rect.left, e.clientY - rect.top),
        );
        if (
            this.#mouse_position.x != new_position.x ||
            this.#mouse_position.y != new_position.y
        ) {
            this.#mouse_position.set(new_position);
            this.on_hover(this.#mouse_position);
            this.dispatchEvent(
                new KiCanvasMouseMoveEvent(this.#mouse_position),
            );
        }
    }

    public abstract load(src: any): Promise<void>;

    protected resolve_loaded(value: boolean) {
        if (value) {
            this.loaded.open();
            this.dispatchEvent(new KiCanvasLoadEvent());
        }
    }

    public abstract paint(): void;

    protected on_document_clicked(): void { }

    protected on_draw() {
        this.renderer.clear_canvas();

        if (!this.layers) {
            return;
        }

        // Render all layers in display order (back to front)
        let depth = 0.01;
        const camera = this.viewport.camera.matrix;
        const should_dim = this.layers.is_any_layer_highlighted();

        for (const layer of this.layers.in_display_order()) {
            if (layer.visible && layer.graphics) {
                let alpha = layer.opacity;

                if (should_dim && !layer.highlighted) {
                    alpha = 0.25;
                }

                layer.graphics.render(camera, depth, alpha);
                depth += 0.01;
            }
        }
    }

    public draw() {
        if (!this.viewport) {
            return;
        }

        window.requestAnimationFrame(() => {
            this.on_draw();
        });
    }

    abstract zoom_fit_top_item(): void;

    abstract zoom_in(): void;

    abstract zoom_out(): void;

    abstract move(pos: Vec2): void;

    abstract on_hover(pos: Vec2): void;

    abstract on_click(pos: Vec2, event?: MouseEvent): void;

    abstract on_dblclick(pos: Vec2): void;

    // ============================================================
    // COMMENT MODE API
    // ============================================================

    /**
     * Dispatch a CommentClickEvent with world and screen coordinates.
     * Called when commentModeEnabled is true and user clicks.
     */
    protected dispatchCommentClick(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX;
        const screenY = e.clientY;

        // Convert screen coordinates to world (board) coordinates
        const worldPos = this.viewport.camera.screen_to_world(
            new Vec2(e.clientX - rect.left, e.clientY - rect.top),
        );

        const context: "PCB" | "SCH" =
            this.type === ViewerType.PCB ? "PCB" : "SCH";

        this.dispatchEvent(
            new CommentClickEvent({
                worldX: worldPos.x,
                worldY: worldPos.y,
                screenX: screenX,
                screenY: screenY,
                layer: this.activeLayerName,
                context: context,
            }),
        );
    }

    /**
     * Convert screen coordinates to world (board) coordinates.
     * Useful for external overlay positioning.
     */
    public screenToWorld(screenX: number, screenY: number): Vec2 {
        const rect = this.canvas.getBoundingClientRect();
        return this.viewport.camera.screen_to_world(
            new Vec2(screenX - rect.left, screenY - rect.top),
        );
    }

    /**
     * Convert world (board) coordinates to screen coordinates.
     * Useful for positioning overlays at specific board locations.
     */
    public worldToScreen(worldX: number, worldY: number): Vec2 {
        const rect = this.canvas.getBoundingClientRect();
        const screenPos = this.viewport.camera.world_to_screen(
            new Vec2(worldX, worldY),
        );
        return new Vec2(screenPos.x + rect.left, screenPos.y + rect.top);
    }
}
