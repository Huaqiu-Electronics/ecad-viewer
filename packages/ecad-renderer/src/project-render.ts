import { BoardParser, SchematicParser } from "kicad-parser";
import type { SchematicViewer } from "../../ecad-viewer-app/src/viewers/schematic/viewer";
import type { BoardViewer } from "../../ecad-viewer-app/src/viewers/board/viewer";
import { renderPcb, renderSchematic } from "./render";
import { loadProjectZip } from "./project";
import type {
    ProjectZipSource,
    RenderProjectOptions,
    RenderResult,
} from "./types";

/**
 * Whole-project rendering on top of the single-document renderers.
 *
 * `renderProjectFromZip` accepts a KiCad project ZIP (by URL, Response, Blob,
 * or raw bytes), unpacks it through `loadProjectZip`, finds the root schematic
 * (the sheet named after the `.kicad_pro` project file), parses it, and renders
 * it through the existing schematic pipeline. When the ZIP has no schematic it
 * falls back to the first `.kicad_pcb`.
 */
export async function renderProjectFromZip(
    source: ProjectZipSource,
    options: RenderProjectOptions = {},
): Promise<RenderResult<SchematicViewer | BoardViewer>> {
    const loaded = await loadProjectZip(source);
    const kind = options.kind ?? "auto";

    if (kind !== "pcb" && loaded.rootSchematic) {
        const root = loaded.files.find((f) => f.filename === loaded.rootSchematic);
        if (root) {
            const proto = new SchematicParser().parse(root.content);
            return renderSchematic(proto, options);
        }
    }

    if (kind !== "schematic") {
        const pcb = loaded.files.find((f) => f.filename.endsWith(".kicad_pcb"));
        if (pcb) {
            const proto = new BoardParser().parse(pcb.content);
            return renderPcb(proto, options);
        }
    }

    throw new Error(
        `renderProjectFromZip: no ${kind === "pcb" ? ".kicad_pcb" : kind === "schematic" ? ".kicad_sch" : ".kicad_sch or .kicad_pcb"} found in the project zip`,
    );
}
