import type { boardProto } from "@huaqiu/kicad-sexpr-parser";
import { renderPcb } from "./render";
import type { RenderOptions } from "./types";

/** Render one parser Footprint POD through the existing board/footprint painter. */
export function renderFootprint(footprint: boardProto.I_Footprint, options: RenderOptions = {}) {
    return renderPcb({
        version: footprint.version ?? 20240108,
        title_block: { title: "", date: "", company: "", comments: [] },
        layers: [], nets: [], footprints: [footprint], zones: [], segments: [], vias: [], drawings: [], groups: [],
    }, options);
}
export type { Footprint, RenderOptions, RenderResult } from "./types";
