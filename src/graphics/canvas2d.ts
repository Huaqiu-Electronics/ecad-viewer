/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../base/color";
import { Angle, BBox, Matrix3, Vec2 } from "../base/math";
import { Renderer, RenderLayer, RenderStateStack } from "./renderer";
import { Arc, Circle, Polygon, Polyline } from "./shapes";

/**
 * Canvas2d-based renderer.
 *
 * This renderer works by turning draw calls into DrawCommands - basically
 * serializing them as Path2D + state. These DrawCommands are combined into
 * multiple Layers. When the layers are later drawn, the draw commands are
 * stepped through and draw onto the canvas.
 *
 * This is similar to generating old-school display lists.
 *
 */

// FIXME
const MAX_LEN = 24;
export class Canvas2DRenderer extends Renderer {
    override image(
        img: HTMLImageElement,
        x: number,
        y: number,
        scale: number,
    ): void {
        const src_box = new BBox(0, 0, img.width, img.height);

        let ss = new Vec2(img.width * scale, img.height * scale);

        if (ss.x > MAX_LEN || ss.y > MAX_LEN) {
            const factor = Math.min(MAX_LEN / ss.x, MAX_LEN / ss.y);
            ss = ss.scale(new Vec2(factor, factor));
        }

        const target_bbox = new BBox(x - ss.x / 2, y - ss.y / 2, ss.x, ss.y);

        this.#active_layer?.commands.push(
            new ImageCommand(img, src_box, target_bbox),
        );
    }
    /** Graphics layers */
    #layers: Canvas2dRenderLayer[] = [];

    /** The layer currently being drawn to. */
    #active_layer: Canvas2dRenderLayer | null;

    #bboxes: Map<string, BBox> = new Map();

    //The scene bounding box containing all items.
    #scene_bbox: BBox = new BBox();

    get scene_bbox() {
        return this.#scene_bbox;
    }

    reset_scene_bbox() {
        this.#scene_bbox = new BBox();
    }

    get_item_bbox(uuid: string) {
        return this.#bboxes.get(uuid);
    }

    /** State */
    override state: RenderStateStack = new RenderStateStack();

    ctx2d?: CanvasRenderingContext2D;

    /**
     * Create a new Canvas2DRenderer
     */
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
    }

    /**
     * Create and configure the 2D Canvas context.
     */
    override async setup() {
        const ctx2d = this.canvas.getContext("2d");

        if (ctx2d == null) {
            throw new Error("Unable to create Canvas2d context");
        }

        this.ctx2d = ctx2d;
        this.update_canvas_size();
    }

    override dispose() {
        this.ctx2d = undefined;
        for (const layer of this.#layers) {
            layer.dispose();
        }
    }

    override end_bbox(context: any): BBox {
        const bb = super.end_bbox(context);
        if ("uuid" in context && typeof context.uuid === "string") {
            this.#bboxes.set(context.uuid, bb);
        }
        this.#scene_bbox = BBox.combine([this.#scene_bbox, bb]);
        return bb;
    }

    override update_canvas_size() {
        // const dpr = window.devicePixelRatio;
        const dpr = 1;

        const rect = this.canvas.getBoundingClientRect();
        const pixel_w = Math.round(rect.width * dpr);
        const pixel_h = Math.round(rect.height * dpr);

        if (this.canvas.width != pixel_w || this.canvas.height != pixel_h) {
            this.canvas.width = pixel_w;
            this.canvas.height = pixel_h;
        }
    }

    override clear_canvas() {
        this.update_canvas_size();

        this.ctx2d!.setTransform();
        // this.ctx2d!.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.ctx2d!.fillStyle = this.background_color.to_css();
        this.ctx2d!.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx2d!.lineCap = "round";
        this.ctx2d!.lineJoin = "round";
    }

    override start_layer(name: string) {
        this.#active_layer = new Canvas2dRenderLayer(this, name);
    }

    override end_layer(): RenderLayer {
        if (!this.#active_layer) {
            throw new Error("No active layer");
        }

        this.#layers.push(this.#active_layer);
        this.#active_layer = null;

        return this.#layers.at(-1)!;
    }

    override arc(
        arc_or_center: Arc | Vec2,
        radius?: number,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): void {
        super.prep_arc(
            arc_or_center,
            radius,
            start_angle,
            end_angle,
            width,
            color,
        );
    }

    override circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): void {
        const circle = super.prep_circle(circle_or_center, radius, color);

        if (!circle.color || circle.color.is_transparent_black) {
            return;
        }

        const css_color = (circle.color as Color).to_css();

        const path = new Path2D();
        path.arc(
            circle.center.x,
            circle.center.y,
            circle.radius,
            0,
            Math.PI * 2,
        );

        this.#active_layer!.commands.push(
            new DrawCommand(path, css_color, null, 0),
        );
    }

    override line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): void {
        const line = super.prep_line(line_or_points, width, color);

        if (!line.color || line.color.is_transparent_black) {
            return;
        }

        const css_color = (line.color as Color).to_css();

        const path = new Path2D();
        let started = false;

        for (const point of line.points) {
            if (!started) {
                path.moveTo(point.x, point.y);
                started = true;
            } else {
                path.lineTo(point.x, point.y);
            }
        }

        this.#active_layer!.commands.push(
            new DrawCommand(path, null, css_color, line.width),
        );
    }

    override polygon(polygon_or_points: Polygon | Vec2[], color?: Color): void {
        const polygon = super.prep_polygon(polygon_or_points, color);

        if (!polygon.color || polygon.color.is_transparent_black) {
            return;
        }

        const css_color = (polygon.color as Color).to_css();

        const path = new Path2D();
        let started = false;

        for (const point of polygon.points) {
            if (!started) {
                path.moveTo(point.x, point.y);
                started = true;
            } else {
                path.lineTo(point.x, point.y);
            }
        }
        path.closePath();

        this.#active_layer!.commands.push(
            new DrawCommand(path, css_color, null, 0),
        );
    }

    override get layers() {
        const layers = this.#layers;
        return {
            *[Symbol.iterator]() {
                for (const layer of layers) {
                    yield layer;
                }
            },
        };
    }

    override remove_layer(layer: Canvas2dRenderLayer) {
        const idx = this.#layers.indexOf(layer);
        if (idx == -1) {
            return;
        }
        this.#layers.splice(idx, 1);
    }
}

class DrawCommand {
    public path_count = 1;

    constructor(
        public path: Path2D,
        public fill: string | null,
        public stroke: string | null,
        public stroke_width: number,
    ) {}

    render(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.fill ?? "black";
        ctx.strokeStyle = this.stroke ?? "black";
        ctx.lineWidth = this.stroke_width;
        if (this.fill) {
            ctx.fill(this.path);
        }
        if (this.stroke) {
            ctx.stroke(this.path);
        }
    }
}

class ImageCommand {
    constructor(
        public img: HTMLImageElement,
        public src_bbox: BBox,
        public dest_bbox: BBox,
    ) {}
    render(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(
            this.img,
            this.src_bbox.x,
            this.src_bbox.y,
            this.src_bbox.w,
            this.src_bbox.h,
            this.dest_bbox.x,
            this.dest_bbox.y,
            this.dest_bbox.w,
            this.dest_bbox.h,
        );
    }
}

class Canvas2dRenderLayer extends RenderLayer {
    constructor(
        public override readonly renderer: Renderer,
        public override readonly name: string,
        public commands: {
            render: (ctx: CanvasRenderingContext2D) => void;
        }[] = [],
    ) {
        super(renderer, name);
    }

    override dispose(): void {
        this.clear();
    }

    clear() {
        this.commands = [];
    }

    render(transform: Matrix3, depth: number, global_alpha = 1) {
        const ctx = (this.renderer as Canvas2DRenderer).ctx2d;

        if (!ctx) {
            throw new Error("No CanvasRenderingContext2D!");
        }

        ctx.save();

        ctx.globalCompositeOperation = this.composite_operation;
        ctx.globalAlpha = global_alpha;

        const accumulated_transform = Matrix3.from_DOMMatrix(
            ctx.getTransform(),
        );
        accumulated_transform.multiply_self(transform);
        ctx.setTransform(accumulated_transform.to_DOMMatrix());

        for (const command of this.commands) {
            command.render(ctx);
        }

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
