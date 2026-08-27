import JSZip from "jszip";
import { find_root_sch_from_content } from "../../ecad-viewer-app/src/utils";
import type {
    LoadedProjectZip,
    ProjectZipFile,
    ProjectZipSource,
} from "./types";

/**
 * Whole-project ZIP loading — pure data, no canvas / rendering. Kept free of
 * the render pipeline (viewers, WebGL) so it can run in any JS environment
 * (Node included). `renderProjectFromZip` (main entry) builds on this.
 *
 * It unpacks a KiCad project ZIP with the same rule the ECAD viewer app uses
 * (jszip), then identifies the root schematic (the sheet named after the
 * `.kicad_pro` project file), so hosts like HQ Edge can render just the root
 * sheet instead of every sub-sheet.
 */

const KICAD_EXT = /\.kicad_(sch|pcb)$/;

function isKicad(name: string): boolean {
    return KICAD_EXT.test(name);
}

async function toBlob(source: ProjectZipSource): Promise<Blob> {
    if (typeof Blob !== "undefined" && source instanceof Blob) return source;
    if (source instanceof Response) {
        if (!source.ok) {
            throw new Error(
                `Failed to fetch project zip (HTTP ${source.status})`,
            );
        }
        return source.blob();
    }
    if (source instanceof ArrayBuffer) return new Blob([source]);
    if (source instanceof Uint8Array) return new Blob([source as BlobPart]);
    const url = source instanceof URL ? source.href : String(source);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch project zip (HTTP ${res.status})`);
    }
    return res.blob();
}

/**
 * Read the input as an ArrayBuffer. jszip accepts an ArrayBuffer in every
 * environment (browser + Node); a Blob only via the browser-only FileReader.
 */
async function toArrayBuffer(source: ProjectZipSource): Promise<ArrayBuffer> {
    const blob = await toBlob(source);
    if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
}

function findProjectRootSchematic(
    blobs: Record<string, string>,
    projectFileNames: string[],
) {
    // The root sheet is the one named after the `.kicad_pro` project file
    // (the hierarchy root references it). `.kicad_pro` files are excluded
    // from `blobs` (which only holds renderable sch/pcb sources), so the
    // project filenames are passed in explicitly.
    for (const projectFile of projectFileNames) {
        const basename = projectFile.slice(0, -".kicad_pro".length);
        const projectSchematic = `${basename}.kicad_sch`;

        if (blobs[projectSchematic] !== undefined) {
            return projectSchematic;
        }
    }

    return find_root_sch_from_content(blobs);
}

/**
 * Unpack a KiCad project ZIP into its schematic/PCB sources and identify the
 * root schematic. Returns only `.kicad_sch` / `.kicad_pcb` files (by basename).
 */
export async function loadProjectZip(
    source: ProjectZipSource,
): Promise<LoadedProjectZip> {
    const buffer = await toArrayBuffer(source);
    const zip = await JSZip.loadAsync(buffer);

    const files: ProjectZipFile[] = [];
    const blobs: Record<string, string> = {};
    // Basenames of `.kicad_pro` entries — needed to identify the root sheet
    // (the sheet named after the project file) even though the project file
    // itself is not a renderable source and is excluded from `files`/`blobs`.
    const projectFileNames: string[] = [];

    for (const name in zip.files) {
        const entry = zip.files[name];
        if (!entry || entry.dir) continue;

        const parts = name.split("/");
        const basename = parts[parts.length - 1] ?? name;

        if (basename.endsWith(".kicad_pro")) {
            projectFileNames.push(basename);
            continue;
        }

        if (!isKicad(basename)) continue;

        const content = await entry.async("text");
        files.push({ filename: basename, content });
        blobs[basename] = content;
    }

    const rootSchematic = findProjectRootSchematic(blobs, projectFileNames);

    return { files, rootSchematic };
}
