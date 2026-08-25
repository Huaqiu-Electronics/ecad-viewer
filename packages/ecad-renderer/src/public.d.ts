import type { boardProto, schematicProto } from "@huaqiu/kicad-sexpr-parser";

export type Pcb = boardProto.I_KicadPCB;
export type Footprint = boardProto.I_Footprint;
export type Schematic = schematicProto.I_KicadSch;
export type Symbol = schematicProto.I_LibSymbol;
export interface RenderOptions { canvas?: HTMLCanvasElement; container?: HTMLElement; interactive?: boolean; }
export interface RenderResult<TViewer = unknown> { canvas: HTMLCanvasElement; viewer: TViewer; dispose(): void; }
export declare function renderSymbol(symbol: Symbol, options?: RenderOptions): Promise<RenderResult>;
export declare function renderFootprint(footprint: Footprint, options?: RenderOptions): Promise<RenderResult>;
export declare function renderSchematic(schematic: Schematic, options?: RenderOptions): Promise<RenderResult>;
export declare function renderPcb(pcb: Pcb, options?: RenderOptions): Promise<RenderResult>;
export type RendererRequest = { id: string; type: "symbol" | "footprint" | "schematic" | "pcb"; model: unknown };
export type RendererResponse = { id: string; ok: true; result: unknown } | { id: string; ok: false; error: string };
export declare function createRendererWorker(url?: URL): Worker;
export declare function createRendererClient(worker: Worker): { render(request: RendererRequest): Promise<RendererResponse>; dispose(): void };
