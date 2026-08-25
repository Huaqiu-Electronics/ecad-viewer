import type { schematicProto } from "kicad-parser";
import { renderSchematic } from "./render";
import type { RenderOptions } from "./types";

/**
 * KiCad library symbols store body graphics and pins on per-unit "child"
 * symbols with names suffixed `_{unit}_{style}`. The root symbol rarely has
 * pins itself. Walk the root + its descendants to enumerate every pin that
 * applies to the (unit=1, style=1) instance we build below — common pins
 * (unit 0) plus the specific unit's pins.
 */
function collectAllLibPins(
    symbol: schematicProto.I_LibSymbol,
): schematicProto.I_Pin[] {
    const result: schematicProto.I_Pin[] = [];

    function parseUnitStyleFromName(name: string): {
        unit: number;
        style: number;
    } {
        const m = /(\d+)_(\d+)$/.exec(name);
        if (m) return { unit: Number(m[1]), style: Number(m[2]) };
        return { unit: 0, style: 0 };
    }

    function visit(sym: schematicProto.I_LibSymbol, isRoot: boolean) {
        const { unit, style } = isRoot
            ? { unit: 0, style: 0 }
            : parseUnitStyleFromName(sym.name);

        // Unit 0 = common to all units. Unit 1 matches our requested instance.
        // Style 0 = common to all styles. Style 1 matches our convert=1.
        const unitMatch = unit === 0 || unit === 1;
        const styleMatch = style === 0 || style === 1;
        if (unitMatch && styleMatch) {
            for (const pin of sym.pins ?? []) result.push(pin);
        }
        for (const child of sym.children ?? []) visit(child, false);
    }

    visit(symbol, true);
    return result;
}

/** Render one parser Symbol POD by using the existing schematic painter. */
export function renderSymbol(
    symbol: schematicProto.I_LibSymbol,
    options: RenderOptions = {},
) {
    // Build PinInstance entries from every lib pin that applies to a
    // (unit=1, style=1) instance. The painter yields unit_pins in the
    // document walk, one PinPainter render per instance, and each one
    // resolves its graphical definition through `lib_symbol.pin_by_number`.
    const allPins = collectAllLibPins(symbol);
    const pins: schematicProto.I_PinInstance[] = allPins.map((pin, idx) => ({
        number: pin.number?.text ?? String(idx + 1),
        uuid: `ecad-renderer-pin-${idx}-${pin.number?.text ?? idx}`,
        alternate: "",
    }));

    return renderSchematic(
        {
            version: 20231120,
            uuid: "ecad-renderer-symbol",
            generator_version: "ecad-renderer",
            lib_symbols: [symbol],
            // LibSymbol is the parser POD for library content. The existing
            // schematic painter draws a SchematicSymbol instance, so create the
            // smallest such instance at the origin and retain the original POD as
            // its library source. This is a rendering adapter, not another model.
            symbols: [
                {
                    uuid: "ecad-renderer-symbol-instance",
                    lib_id: symbol.name,
                    at: { position: { x: 0, y: 0 }, rotation: 0 },
                    unit: 1,
                    convert: 1,
                    in_bom: symbol.in_bom ?? false,
                    on_board: symbol.on_board ?? false,
                    dnp: false,
                    fields_autoplaced: false,
                    properties: symbol.properties ?? [],
                    pins,
                    exclude_from_sim: symbol.exclude_from_sim ?? false,
                    instances: { projects: [] },
                },
            ],
            wires: [],
            buses: [],
            bus_entries: [],
            bus_aliases: [],
            junctions: [],
            net_labels: [],
            global_labels: [],
            hierarchical_labels: [],
            no_connects: [],
            drawings: [],
            images: [],
            tables: [],
            sheets: [],
        },
        options,
    );
}
export type { Symbol, RenderOptions, RenderResult } from "./types";
