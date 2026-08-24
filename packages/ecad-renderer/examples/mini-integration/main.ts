import { BoardParser, SchematicParser } from "@huaqiu/kicad-sexpr-parser";
import { renderFootprint, renderSymbol } from "@huaqiu/ecad-renderer";

async function asset(name: string) {
    const response = await fetch(`./assets/${name}`);
    if (!response.ok) throw new Error(`Unable to load ${name}`);
    return response.text();
}

async function main() {
    const [symbolSource, footprintSource] = await Promise.all([
        asset("LMV761MAX_NOPB.kicad_sym"),
        asset("LMV761MAX_NOPB.kicad_mod"),
    ]);
    const symbol = new SchematicParser().parseLibSymbols(symbolSource)[0];
    if (!symbol) throw new Error("Fixture has no symbol");

    // A .kicad_mod holds a footprint expression; BoardParser deliberately owns
    // footprint parsing, so embed the exact fixture in the smallest PCB POD.
    const board = new BoardParser().parse(`(kicad_pcb (version 20240108) (generator "ecad-renderer-example") ${footprintSource})`);
    const footprint = board.footprints[0];
    if (!footprint) throw new Error("Fixture has no footprint");

    await Promise.all([
        renderSymbol(symbol, { canvas: document.querySelector<HTMLCanvasElement>("#symbol")! }),
        renderFootprint(footprint, { canvas: document.querySelector<HTMLCanvasElement>("#footprint")! }),
    ]);
}

main().catch((error: unknown) => {
    document.body.insertAdjacentHTML("beforeend", `<pre>${String(error)}</pre>`);
    console.error(error);
});
