import type { boardProto, schematicProto } from "@huaqiu/kicad-sexpr-parser";

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

/**
 * Anything that resolves to a KiCad project ZIP (a URL, a fetched Response, or
 * raw bytes). `renderProjectFromZip` / `loadProjectZip` accept all of these.
 */
export type ProjectZipSource =
    | string
    | URL
    | Blob
    | ArrayBuffer
    | Uint8Array
    | Response;

/** A single KiCad text file extracted from a project ZIP. */
export interface ProjectZipFile {
    /** Basename, e.g. `my-board.kicad_sch`. */
    filename: string;
    /** Raw S-expression text. */
    content: string;
}

/** Result of unpacking a project ZIP into its KiCad sources. */
export interface LoadedProjectZip {
    /** Every `.kicad_sch` / `.kicad_pcb` file in the ZIP, by basename. */
    files: ProjectZipFile[];
    /**
     * The root schematic filename — derived the same way the ECAD viewer app
     * does it: the sheet named after the `.kicad_pro` project file, falling
     * back to the first sheet. Empty when the ZIP has no schematic.
     */
    rootSchematic: string;
}

export interface RenderProjectOptions extends RenderOptions {
    /**
     * Which document to render when the project ZIP contains more than one
     * kind. Defaults to `"auto"`: the root schematic first, then the first
     * PCB if there is no schematic.
     */
    kind?: "auto" | "schematic" | "pcb";
}
