import { KicadPCB, KicadSch } from "../kicad";
import { BoardBomItemVisitor } from "../kicad/board_bom_visitor";

import { SchematicBomVisitor } from "../kicad/schematic_bom_visitor";
import { SchematicParser } from "../parser/schematic_parser";
import { BoardParser } from "../parser/board_parser";
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
    const sch_file_names: string[] = [];
    let expected_root_sch = "";

    for (const filename of Object.keys(blobs)) {
        if (is_sch(filename)) {
            sch_file_names.push(filename);
        } else if (filename.endsWith(".kicad_pro")) {
            expected_root_sch = filename.replace(".kicad_pro", ".kicad_sch");
        }
    }

    if (!sch_file_names.length) return "";
    if (sch_file_names.length === 1) return sch_file_names[0];
    if (expected_root_sch && sch_file_names.includes(expected_root_sch))
        return expected_root_sch;

    return sch_file_names[0];
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
            const pod = new SchematicParser().parse(blob);
            sch_visitor.visit(new KicadSch(filename, pod as any));
        }
        if (is_pcb(filename)) {
            const pod = new BoardParser().parse(blob);
            pcb_visitor.visit(new KicadPCB(filename, pod as any));
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
