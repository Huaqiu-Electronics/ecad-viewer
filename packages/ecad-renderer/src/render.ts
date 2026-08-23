import { KicadPCB } from "../../ecad-viewer-app/src/kicad/board";
import { KicadSch } from "../../ecad-viewer-app/src/kicad/schematic";
import themes from "../../ecad-viewer-app/src/kicanvas/themes";
import { BoardViewer } from "../../ecad-viewer-app/src/viewers/board/viewer";
import { SchematicViewer } from "../../ecad-viewer-app/src/viewers/schematic/viewer";
import type { boardProto, schematicProto } from "@huaqiu/kicad-sexpr-parser";
import type { RenderOptions, RenderResult } from "./types";

function target(options: RenderOptions) {
    const canvas = options.canvas ?? document.createElement("canvas");
    canvas.width = options.width ?? 800;
    canvas.height = options.height ?? 600;
    canvas.style.width ||= `${canvas.width}px`;
    canvas.style.height ||= `${canvas.height}px`;
    if (!canvas.parentElement) (options.container ?? document.body).append(canvas);
    return canvas;
}

async function mount<T extends { setup(): Promise<void>; load(value: never): Promise<void>; dispose(): void }>(
    viewer: T,
    document: never,
    canvas: HTMLCanvasElement,
): Promise<RenderResult<T>> {
    await viewer.setup();
    await viewer.load(document);
    return { canvas, viewer, dispose: () => viewer.dispose() };
}

export async function renderSchematic(
    schematic: schematicProto.I_KicadSch,
    options: RenderOptions = {},
): Promise<RenderResult<SchematicViewer>> {
    const canvas = target(options);
    const document = new KicadSch("schematic.kicad_sch", schematic);
    return mount(new SchematicViewer(canvas, options.interactive ?? false, themes.default.schematic), document as never, canvas);
}

export async function renderPcb(
    pcb: boardProto.I_KicadPCB,
    options: RenderOptions = {},
): Promise<RenderResult<BoardViewer>> {
    const canvas = target(options);
    const document = new KicadPCB("board.kicad_pcb", pcb);
    return mount(new BoardViewer(canvas, options.interactive ?? false, themes.default.board), document as never, canvas);
}
