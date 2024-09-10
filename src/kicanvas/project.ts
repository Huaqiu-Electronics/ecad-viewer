/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../base/array";
import { Barrier } from "../base/async";
import { type IDisposable } from "../base/disposable";
import { first, length, map } from "../base/iterator";
import { Logger } from "../base/log";
import { type Constructor } from "../base/types";
import { KicadPCB, KicadSch, ProjectSettings } from "../kicad";
import { BoardBomItemVisitor } from "../kicad/board_bom_visitor";
import type { BomItem } from "../kicad/bom_item";
import { ItemsGroupedByFpValueDNP } from "../kicad/ItemsGroupedByFpValueDNP";
import { NetRef } from "../kicad/net_ref";
import type {
    SchematicSheet,
    SchematicSheetInstance,
} from "../kicad/schematic";
import { SchematicBomVisitor } from "../kicad/schematic_bom_visitor";

import type { EcadBlob, EcadSources, VirtualFileSystem } from "./services/vfs";

const log = new Logger("kicanvas:project");

export enum AssertType {
    SCH,
    PCB,
}

export class Project extends EventTarget implements IDisposable {
    #fs: VirtualFileSystem;
    #files_by_name: Map<string, KicadPCB | KicadSch> = new Map();
    #file_content: Map<string, string> = new Map();
    #pcb: KicadPCB[] = [];
    #sch: KicadSch[] = [];
    #ov_3d_url?: string;
    #bom_items: BomItem[] = [];
    #label_name_refs = new Map<string, NetRef[]>();
    #net_item_refs = new Map<string, NetRef>();
    #designator_refs = new Map<string, string>();
    #project_name: string;

    find_labels_by_name(name: string) {
        return this.#label_name_refs.get(name);
    }

    find_net_item(uuid: string) {
        return this.#net_item_refs.get(uuid);
    }

    find_designator(d: string) {
        return this.#designator_refs.get(d);
    }

    get bom_items() {
        return this.#bom_items;
    }

    public active_sch_name: string;

    public loaded: Barrier = new Barrier();
    public settings: ProjectSettings = new ProjectSettings();
    #root_schematic_page?: ProjectPage;
    #pages_by_path: Map<string, ProjectPage> = new Map();

    get pages() {
        return Array.from(this.#pages_by_path.values());
    }

    get project_name() {
        if (this.#project_name) return this.#project_name;

        const fn =
            (this.#pcb.length
                ? this.#pcb[0]?.filename
                : this.#sch.length
                  ? this.#root_schematic_page?.filename
                  : "") ?? "";

        const fns = fn.split(".");

        if (fns.length > 1) {
            return fns.slice(0, -1).join(".");
        }
        return fn;
    }

    public dispose() {
        for (const i of [this.#pcb, this.#sch]) i.length = 0;
        this.#files_by_name.clear();
        this.#pages_by_path.clear();
        this.#file_content.clear();
        this.#label_name_refs.clear();
        this.#net_item_refs.clear();
        this.#designator_refs.clear();
    }

    public async load(sources: EcadSources) {
        log.info(`Loading project from ${sources.constructor.name}`);

        this.settings = new ProjectSettings();
        this.dispose();

        this.#fs = sources.vfs;

        const promises = [];

        for (const filename of this.#fs.list()) {
            promises.push(this.#load_file(filename));
        }

        for (const blob of sources.blobs) {
            if (blob.filename.endsWith(".kicad_pcb")) {
                promises.push(this.#load_blob(KicadPCB, blob));
            } else if (blob.filename.endsWith(".kicad_sch")) {
                promises.push(this.#load_blob(KicadSch, blob));
            } else if (blob.filename.endsWith(".kicad_pro")) {
                this.#project_name = blob.filename.slice(
                    0,
                    blob.filename.length - ".kicad_pro".length,
                );
            }
        }

        await Promise.all(promises);

        let has_root_sch = false;

        if (this.has_schematics)
            has_root_sch = this.#determine_schematic_hierarchy();

        const bom_items = (() => {
            if (this.has_schematics) {
                const sch_visitor = new SchematicBomVisitor();
                if (has_root_sch) {
                    for (const page of this.pages) {
                        const doc = page.document;
                        if (doc instanceof KicadSch) sch_visitor.visit(doc);
                    }
                } else {
                    for (const sch of this.schematics()) {
                        sch_visitor.visit(sch);
                    }
                }

                this.#designator_refs = sch_visitor.designator_refs;
                if (sch_visitor.bom_list.length) return sch_visitor.bom_list;
            }
            if (this.has_boards) {
                const visitor = new BoardBomItemVisitor();
                for (const b of this.boards()) visitor.visit(b);
                this.#designator_refs = visitor.designator_refs;
                return visitor.bom_list;
            }
            return [];
        })();
        this.#sort_bom(bom_items);

        this.loaded.open();

        this.dispatchEvent(
            new CustomEvent("load", {
                detail: this,
            }),
        );
    }

    #sort_bom(bom_list: BomItem[]) {
        const grouped_it_map: Map<string, ItemsGroupedByFpValueDNP> = new Map();

        const group_by_fp_value = (itm: BomItem) =>
            `${itm.Footprint}-${itm.Name}-${itm.DNP}`;

        for (const it of bom_list) {
            const key = group_by_fp_value(it);

            if (!grouped_it_map.has(key)) {
                grouped_it_map.set(
                    key,
                    new ItemsGroupedByFpValueDNP(
                        it.Name,
                        it.Datasheet,
                        it.Description,
                        it.Footprint,
                        it.DNP,
                    ),
                );
            }
            grouped_it_map.get(key)!.addReference(it.Reference);
        }
        this.#bom_items = Array.from(grouped_it_map.values());
    }
    public get root_schematic_page() {
        return this.#root_schematic_page;
    }

    async #load_file(filename: string) {
        log.info(`Loading file ${filename}`);

        if (filename.endsWith(".kicad_sch")) {
            return await this.#load_doc(KicadSch, filename);
        }
        if (filename.endsWith(".kicad_pcb")) {
            return await this.#load_doc(KicadPCB, filename);
        }
        if (filename.endsWith(".kicad_pro")) {
            return this.#load_meta(filename);
        }

        log.warn(`Couldn't load ${filename}: unknown file type`);
    }

    async #load_doc(
        document_class: Constructor<KicadPCB | KicadSch>,
        filename: string,
    ) {
        if (this.#files_by_name.has(filename)) {
            return this.#files_by_name.get(filename);
        }

        const text = await this.get_file_text(filename);
        return this.#load_blob(document_class, {
            filename,
            content: text!,
        });
    }

    async #load_blob(
        document_class: Constructor<KicadPCB | KicadSch>,
        blob: EcadBlob,
    ) {
        if (this.#files_by_name.has(blob.filename)) {
            return this.#files_by_name.get(blob.filename);
        }
        const filename = blob.filename;
        const doc = new document_class(filename, blob.content);
        doc.project = this;
        this.#files_by_name.set(filename, doc);
        if (doc instanceof KicadPCB) this.#pcb.push(doc);
        else {
            this.#sch.push(doc);

            for (const it of doc.labels) {
                if (it.uuid) {
                    const ref = new NetRef(doc.filename, it.text, it.uuid);
                    this.#net_item_refs.set(it.uuid, ref);

                    if (!this.#label_name_refs.has(it.text))
                        this.#label_name_refs.set(it.text, []);

                    this.#label_name_refs.get(it.text)!.push(ref);
                }
            }
        }
        this.#files_by_name.set(filename, doc);
        this.#file_content.set(filename, blob.content);
        return doc;
    }

    async #load_meta(filename: string) {
        const text = await this.get_file_text(filename);
        const data = JSON.parse(text!);
        this.settings = ProjectSettings.load(data);
    }

    async get_file_text(filename: string) {
        if (this.#file_content.has(filename))
            return this.#file_content.get(filename);
        return await (await this.#fs.get(filename)).text();
    }

    public *files() {
        yield* this.#files_by_name.values();
    }

    *sch_in_order() {
        for (const p of this.pages) {
            yield this.file_by_name(p.filename) ??
                // AD HOC for ad converted sch
                this.file_by_name(p.sheet_path);
        }
    }

    public file_by_name(name: string) {
        return this.#files_by_name.get(name);
    }

    public *boards() {
        for (const value of this.#files_by_name.values()) {
            if (value instanceof KicadPCB) {
                yield value;
            }
        }
    }

    public get has_3d() {
        return this.#ov_3d_url !== undefined;
    }

    public set ov_3d_url(url: string | undefined) {
        this.#ov_3d_url = url;
    }

    public get ov_3d_url() {
        return this.#ov_3d_url;
    }

    public get has_boards() {
        return length(this.boards()) > 0;
    }

    public *schematics() {
        for (const [, v] of this.#files_by_name) {
            if (v instanceof KicadSch) {
                yield v;
            }
        }
    }

    public get has_schematics() {
        return length(this.schematics()) > 0;
    }

    public get_first_page(kind: AssertType) {
        switch (kind) {
            case AssertType.SCH:
                return (
                    (this.#files_by_name.get(
                        `${this.#project_name}.kicad_sch`,
                    ) as KicadSch) ??
                    this.root_schematic_page?.document ??
                    first(this.#sch)
                );
            case AssertType.PCB:
                return first(this.#pcb);
        }
    }

    public page_by_path(project_path: string) {
        return this.#files_by_name.get(project_path);
    }

    public async download(name: string) {
        if (this.#files_by_name.has(name)) {
            name = this.#files_by_name.get(name)!.filename;
        }
        return await this.#fs.download(name);
    }

    public get is_empty() {
        return length(this.files()) === 0;
    }

    public on_loaded() {
        this.dispatchEvent(
            new CustomEvent("change", {
                detail: this,
            }),
        );
    }

    public activate_sch(page_or_path: string) {
        this.active_sch_name = page_or_path;
        this.dispatchEvent(
            new CustomEvent("change", {
                detail: this,
            }),
        );
    }

    #determine_schematic_hierarchy() {
        log.info("Determining schematic hierarchy");

        const paths_to_schematics = new Map<string, KicadSch>();
        const paths_to_sheet_instances = new Map<
            string,
            { sheet: SchematicSheet; instance: SchematicSheetInstance }
        >();

        for (const schematic of this.schematics()) {
            paths_to_schematics.set(`/${schematic.uuid}`, schematic);

            for (const sheet of schematic.sheets) {
                const sheet_sch = this.#files_by_name.get(
                    sheet.sheetfile ?? "",
                ) as KicadSch;

                if (!sheet_sch) {
                    continue;
                }

                for (const instance of sheet.instances.values()) {
                    // paths_to_schematics.set(instance.path, schematic);
                    paths_to_sheet_instances.set(
                        `${instance.path}/${sheet.uuid}`,
                        {
                            sheet: sheet,
                            instance: instance,
                        },
                    );
                }
            }
        }

        // Find the root sheet. This is done by sorting all of the paths
        // from shortest to longest and walking through the paths to see if
        // we can find the schematic for the parent. The first one we find
        // it the common ancestor (root).
        const paths = Array.from(paths_to_sheet_instances.keys()).sort(
            (a, b) => a.length - b.length,
        );

        let root: KicadSch | undefined;
        let found_root = false;
        for (const path of paths) {
            const parent_path = path.split("/").slice(0, -1).join("/");

            if (!parent_path) {
                continue;
            }

            root = paths_to_schematics.get(parent_path);

            if (root) {
                found_root = true;
                break;
            }
        }

        // If we found a root page, we can build out the list of pages by
        // walking through paths_to_sheet with root as page one.
        let pages = [];

        if (root) {
            this.#root_schematic_page = new ProjectPage(
                this,
                root.filename,
                `/${root!.uuid}`,
                "Root",
                "1",
            );
            pages.push(this.#root_schematic_page);

            for (const [path, sheet] of paths_to_sheet_instances.entries()) {
                pages.push(
                    new ProjectPage(
                        this,
                        sheet.sheet.sheetfile!,
                        path,
                        sheet.sheet.sheetname ?? sheet.sheet.sheetfile!,
                        sheet.instance.page ?? "",
                    ),
                );
            }
        }

        // Sort the pages we've collected so far and then insert them
        // into the pages map.
        pages = sorted_by_numeric_strings(pages, (p) => p.page!);

        for (const page of pages) {
            this.#pages_by_path.set(page.project_path, page);
        }

        // Add any "orphan" sheets to the list of pages now that we've added all
        // the hierarchical ones.
        const seen_schematic_files = new Set(
            map(this.#pages_by_path.values(), (p) => p.filename),
        );

        for (const schematic of this.schematics()) {
            if (!seen_schematic_files.has(schematic.filename)) {
                const page = new ProjectPage(
                    this,
                    "schematic",
                    schematic.filename,
                    `/${schematic.uuid}`,
                    schematic.filename,
                );
                this.#pages_by_path.set(page.project_path, page);

            }
        }

        // Finally, if no root schematic was found, just use the first one we saw.
        this.#root_schematic_page = first(this.#pages_by_path.values());
        return found_root;
    }
}

export class ProjectPage {
    constructor(
        public project: Project,
        public filename: string,
        public sheet_path: string,
        public name?: string,
        public page?: string,
    ) {}

    /**
     * A unique identifier for this page within the project,
     * made from the filename and sheet path.
     */
    get project_path() {
        if (this.sheet_path) {
            return `${this.filename}:${this.sheet_path}`;
        } else {
            return this.filename;
        }
    }

    get document() {
        return this.project.file_by_name(this.filename)!;
    }
}
