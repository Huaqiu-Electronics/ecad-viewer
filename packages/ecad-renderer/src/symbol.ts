import type { schematicProto } from "@huaqiu/kicad-sexpr-parser";
import { renderSchematic } from "./render";
import type { RenderOptions } from "./types";

/** Render one parser Symbol POD by using the existing schematic painter. */
export function renderSymbol(symbol: schematicProto.I_LibSymbol, options: RenderOptions = {}) {
    return renderSchematic({
        version: 20231120,
        uuid: "ecad-renderer-symbol",
        generator_version: "ecad-renderer",
        lib_symbols: [symbol],
        symbols: [], wires: [], buses: [], bus_entries: [], bus_aliases: [], junctions: [],
        net_labels: [], global_labels: [], hierarchical_labels: [], no_connects: [], drawings: [], images: [], tables: [], sheets: [],
    }, options);
}
export type { Symbol, RenderOptions, RenderResult } from "./types";
