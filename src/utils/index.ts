import { first } from "../base/iterator";
import { KicadPCB, KicadSch } from "../kicad";
import { BoardBomItemVisitor } from "../kicad/board_bom_visitor";
import type {
    SchematicSheet,
    SchematicSheetInstance,
} from "../kicad/schematic";
import { SchematicBomVisitor } from "../kicad/schematic_bom_visitor";
export const is_sch = (url: string) => url.endsWith(".kicad_sch");

export const is_pcb = (url: string) => url.endsWith(".kicad_pcb");

async function load_urls_content(urls: string[]) {
    async function fetchContent(url: string) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            return console.error("Error fetching", url, ":", error);
        }
    }
    function extractFileName(url: string): string {
        const lastSlashIndex = url.lastIndexOf("/");
        return url.substring(lastSlashIndex + 1);
    }

    return Promise.all(
        urls.map((url) =>
            fetchContent(url).then((content) => ({
                fileName: extractFileName(url),
                content: content,
            })),
        ),
    );
}

export function find_root_sch_from_content(blobs: Record<string, string>) {
    const files_by_name: Map<string, KicadSch> = new Map();

    const schematics: KicadSch[] = [];
    for (const [filename, blob] of Object.entries(blobs)) {
        if (is_sch(filename)) {
            const doc = new KicadSch(filename, blob);
            schematics.push(doc);
            files_by_name.set(filename, doc);
        }
    }

    if (!files_by_name.size) return "";
    else if (files_by_name.size == 1)
        return first(files_by_name.keys()) as string;

    const paths_to_schematics = new Map<string, KicadSch>();
    const paths_to_sheet_instances = new Map<
        string,
        { sheet: SchematicSheet; instance: SchematicSheetInstance }
    >();

    for (const schematic of schematics) {
        paths_to_schematics.set(`/${schematic.uuid}`, schematic);

        for (const sheet of schematic.sheets) {
            const sheet_sch = files_by_name.get(
                sheet.sheetfile ?? "",
            ) as KicadSch;

            if (!sheet_sch) {
                continue;
            }

            for (const instance of sheet.instances.values()) {
                paths_to_schematics.set(instance.path, schematic);
                paths_to_sheet_instances.set(`${instance.path}/${sheet.uuid}`, {
                    sheet: sheet,
                    instance: instance,
                });
            }
        }
    }

    const paths = Array.from(paths_to_sheet_instances.keys()).sort(
        (a, b) => a.length - b.length,
    );

    let root: KicadSch | undefined;
    for (const path of paths) {
        const parent_path = path.split("/").slice(0, -1).join("/");

        if (!parent_path) {
            continue;
        }

        root = paths_to_schematics.get(parent_path);

        if (root) {
            break;
        }
    }

    if (root) return root.filename;

    return first(schematics)!.filename;
}

export async function find_root_sch_from_urls(urls: string[]) {
    const results = await load_urls_content(urls);
    const blobs: Record<string, string> = {};
    for (const result_1 of results)
        if (result_1.content) blobs[result_1.fileName] = result_1.content;
    return find_root_sch_from_content(blobs);
}

export function extract_bom_list_from_content(blobs: Record<string, string>) {
    const sch_visitor = new SchematicBomVisitor();
    const pcb_visitor = new BoardBomItemVisitor();

    for (const [filename, blob] of Object.entries(blobs)) {
        if (is_sch(filename)) {
            sch_visitor.visit(new KicadSch(filename, blob));
        }
        if (is_pcb(filename)) {
            pcb_visitor.visit(new KicadPCB(filename, blob));
            return pcb_visitor.bom_list;
        }
    }
    return sch_visitor.bom_list;
}

export async function extract_bom_list_from_urls(urls: string[]) {
    const results = await load_urls_content(urls);
    const blobs: Record<string, string> = {};
    for (const result_1 of results)
        if (result_1.content) blobs[result_1.fileName] = result_1.content;
    return extract_bom_list_from_content(blobs);
}
