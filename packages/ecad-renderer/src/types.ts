import type { boardProto, schematicProto } from "kicad-parser";

/** Existing parser POD types; no renderer-specific model is introduced. */
export type Pcb = boardProto.I_KicadPCB;
export type Footprint = boardProto.I_Footprint;
export type Schematic = schematicProto.I_KicadSch;
export type Symbol = schematicProto.I_LibSymbol;

export interface RenderOptions {
    /** Canvas to render into. A canvas is created when omitted. */
    canvas?: HTMLCanvasElement;
    /** Attach a generated canvas to this element so it receives layout dimensions. */
    container?: HTMLElement;
    interactive?: boolean;
}

export interface RenderResult<TViewer = unknown> {
    canvas: HTMLCanvasElement;
    viewer: TViewer;
    dispose(): void;
}
