import type { boardProto } from "kicad-parser";
import { renderPcb } from "./render";
import type { RenderOptions } from "./types";

/** Render one parser Footprint POD through the existing board/footprint painter. */
export function renderFootprint(
    footprint: boardProto.I_Footprint,
    options: RenderOptions = {},
) {
    return renderPcb(
        {
            version: footprint.version ?? 20240108,
            title_block: { title: "", date: "", company: "", comments: [] },
            // Intentionally omit `layers` so KicadPCB falls back to DEFAULT_LAYERS
            // (F.Cu, B.Cu, F.SilkS, B.SilkS, F.Mask, B.Mask, Edge.Cuts, F.Fab, B.Fab).
            // An empty array [] would bypass the fallback since [] is truthy.
            nets: [],
            footprints: [footprint],
            zones: [],
            segments: [],
            vias: [],
            drawings: [],
            groups: [],
        },
        options,
    );
}
export type { Footprint, RenderOptions, RenderResult } from "./types";
