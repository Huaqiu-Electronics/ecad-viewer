import { BoardParser, SchematicParser } from "kicad-parser";
import {
    renderFootprint,
    renderPcb,
    renderSchematic,
    renderSymbol,
} from "@huaqiu/ecad-renderer";

async function asset(name: string) {
    const response = await fetch(`./assets/${name}`);
    if (!response.ok) throw new Error(`Unable to load ${name}`);
    return response.text();
}

async function main() {
    const [symbolSource, footprintSource, schematicSource, pcbSource] =
        await Promise.all([
            asset("LMV761MAX_NOPB.kicad_sym"),
            asset("LMV761MAX_NOPB.kicad_mod"),
            asset("M5Pi.kicad_sch"),
            asset("M5Pi.kicad_pcb"),
        ]);

    const symbol = new SchematicParser().parseLibSymbols(symbolSource)[0];
    if (!symbol) throw new Error("Fixture has no symbol");

    const board = new BoardParser().parse(
        `(kicad_pcb (version 20240108) (generator "ecad-renderer-example") ${footprintSource})`,
    );
    const footprint = board.footprints[0];
    if (!footprint) throw new Error("Fixture has no footprint");

    const schematic = new SchematicParser().parse(schematicSource);
    const pcb = new BoardParser().parse(pcbSource);

    const interactive = { interactive: true };

    await Promise.all([
        renderSymbol(symbol, {
            canvas: document.querySelector<HTMLCanvasElement>("#symbol")!,
            ...interactive,
        }),
        renderFootprint(footprint, {
            canvas: document.querySelector<HTMLCanvasElement>("#footprint")!,
            ...interactive,
        }),
        renderSchematic(schematic, {
            canvas: document.querySelector<HTMLCanvasElement>("#schematic")!,
            ...interactive,
        }),
        renderPcb(pcb, {
            canvas: document.querySelector<HTMLCanvasElement>("#pcb")!,
            ...interactive,
        }),
    ]);
}

// Right-click drag is used for panning; suppress the browser context menu
// on all canvases so it doesn't interrupt interaction.
document.addEventListener("contextmenu", (e) => {
    if (e.target instanceof HTMLCanvasElement) e.preventDefault();
});

main().catch((error: unknown) => {
    document.body.insertAdjacentHTML(
        "beforeend",
        `<pre>${String(error)}</pre>`,
    );
    console.error(error);
});
