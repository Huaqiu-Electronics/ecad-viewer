/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, type ElementOrFragment } from "../../../base/web-components";
import { KCViewerAppElement, type KicadAssert } from "../common/app";
import { KCSchematicViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "./info-panel";
import "./properties-panel";
import "./viewer";
import "./erc-inspector";
import type { KCErcInspectorElement } from "./erc-inspector";

import { KicadSch } from "../../../kicad";
import { SchematicSheet } from "../../../kicad/schematic";
import { AssertType, Project } from "../../project";
import { SchPreviewListElement } from "./sch-preview-list";
import "./selection-pop-menu";
import {
    ComponentERCResultEvent,
    HierarchicalSheetPinClickEvent,
    KiCanvasFitterMenuEvent,
    LabelClickEvent,
    NetItemSelectEvent,
    ProjectERCResultEvent,
    SelectDesignatorEvent,
    SheetChangeEvent,
    SheetLoadEvent,
    type NetItemIndex,
} from "../../../viewers/base/events";
import type { NetRef } from "../../../kicad/net_ref";
import type { SchematicViewer } from "../../../viewers/schematic/viewer";
import type { ComponentERCResult } from "../../../proto/component_erc_result";

/**
 * Internal "parent" element for KiCanvas's schematic viewer. Handles
 * setting up the schematic viewer as well as interface controls. It's
 * basically KiCanvas's version of EESchema.
 */
export class KCSchematicAppElement extends KCViewerAppElement<KCSchematicViewerElement> {
    #selection_pop_menu: HTMLElement;
    override assert_type(): AssertType {
        return AssertType.SCH;
    }

    protected override make_property_element(): ElementOrFragment {
        return html`<kc-schematic-properties-panel></kc-schematic-properties-panel>`;
    }

    protected override make_fitter_menu(): HTMLElement {
        const preview = new SchPreviewListElement();
        return preview;
    }

    get sch_viewer() {
        return this.viewer as SchematicViewer;
    }
    override initialContentCallback() {
        super.initialContentCallback();
        this.viewer.addEventListener(SheetChangeEvent.type, (e) => {
            const sch = this.project.file_by_name(e.detail);
            if (sch instanceof KicadSch) this.viewer.load(sch);
        });

        this.viewer.addEventListener(SheetLoadEvent.type, (e) => {
            if (this.#selection_pop_menu)
                this.#selection_pop_menu.hidden = true;
            this.dispatchEvent(new SheetLoadEvent(e.detail));
        });

        this.viewer.addEventListener(NetItemSelectEvent.type, async (e) => {
            this.#select_item(e.detail);
        });

        this.viewer.addEventListener(
            HierarchicalSheetPinClickEvent.type,
            (e) => {
                const it = this.project.find_net_item(e.detail.uuid);
                if (!it) return;
                this.pop_up_label_ref_menu([it]);
            },
        );

        window.addEventListener(SelectDesignatorEvent.type, (e) => {
            const refs = this.project.find_designator(
                e.detail.designator,
            );

            if (refs && refs.length > 0) {
                const ref = refs[0];
                this.#select_item({
                    sheet: ref.sheet_name,
                    uuid: ref.uuid,
                });
            } else {
                console.log(`cannot find designator ${e.detail.designator}`);
            }
        });

        window.addEventListener(ComponentERCResultEvent.type, (e) => {
            Project.import_cjk_glyphs();
            const component_erc_result: ComponentERCResult = e.detail;
            
            if (component_erc_result.pins.length === 0) {
                console.warn(`ERC: No pins specified for designator ${component_erc_result.designator}`);
                return;
            }

            const designator = component_erc_result.designator;
            const pins_by_uuid = new Map<string, PinCheckResult[]>();

            for (const pin of component_erc_result.pins) {
                const sch_symbol = this.project.find_designator_by_pin(
                    designator,
                    pin.pin_num,
                );
                
                if (sch_symbol) {
                    const existing_pins = pins_by_uuid.get(sch_symbol.uuid) ?? [];
                    existing_pins.push(pin);
                    pins_by_uuid.set(sch_symbol.uuid, existing_pins);
                }
            }

            if (pins_by_uuid.size === 0) {
                console.warn(`ERC: Cannot find any symbol instances for designator ${designator}`);
                return;
            }

            const erc_items = Array.from(pins_by_uuid.entries()).map(
                ([uuid, pins]) => ({ uuid, pins })
            );

            const first_ref = this.project.find_designator_by_pin(
                designator,
                component_erc_result.pins[0].pin_num
            );
            
            if (first_ref) {
                if (first_ref.sheet_name !== this.sch_viewer.sch_name) {
                    const sch = this.project.file_by_name(first_ref.sheet_name);
                    if (sch instanceof KicadSch) {
                        this.viewer.load(sch);
                    }
                }

                setTimeout(() => {
                    if (erc_items.length === 1) {
                        this.sch_viewer.show_erc(erc_items[0].uuid, erc_items[0].pins);
                    } else {
                        this.sch_viewer.show_erc_multi(erc_items);
                    }
                }, 500);
            } else {
                console.warn(`ERC: Cannot find first pin's symbol instance for designator ${designator}`);
            }
        });

        this.viewer.addEventListener(LabelClickEvent.type, (e) => {
            const its = this.project.find_labels_by_name(e.detail.name);
            if (!its) return;

            this.pop_up_label_ref_menu(
                its.filter((it) => it.uuid !== e.detail.uuid),
            );
        });

        this.renderRoot.addEventListener("erc-jump", (e: any) => {
            const { designator, pins } = e.detail;
            
            if (!pins || pins.length === 0) {
                console.warn(`ERC: No pins specified for designator ${designator}`);
                return;
            }

            const pins_by_uuid = new Map<string, PinCheckResult[]>();

            for (const pin of pins) {
                const sch_symbol = this.project.find_designator_by_pin(
                    designator,
                    pin.pin_num,
                );
                
                if (sch_symbol) {
                    const existing_pins = pins_by_uuid.get(sch_symbol.uuid) ?? [];
                    existing_pins.push(pin);
                    pins_by_uuid.set(sch_symbol.uuid, existing_pins);
                }
            }

            if (pins_by_uuid.size === 0) {
                console.warn(`ERC: Cannot find any symbol instances for designator ${designator}`);
                return;
            }

            const erc_items = Array.from(pins_by_uuid.entries()).map(
                ([uuid, pins]) => ({ uuid, pins })
            );

            const first_ref = this.project.find_designator_by_pin(
                designator,
                pins[0].pin_num
            );
            
            if (first_ref) {
                if (first_ref.sheet_name !== this.sch_viewer.sch_name) {
                    const sch = this.project.file_by_name(first_ref.sheet_name);
                    if (sch instanceof KicadSch) {
                        this.viewer.load(sch);
                    }
                }

                setTimeout(() => {
                    if (erc_items.length === 1) {
                        this.sch_viewer.show_erc(erc_items[0].uuid, erc_items[0].pins);
                    } else {
                        this.sch_viewer.show_erc_multi(erc_items);
                    }
                }, 100);
            } else {
                console.warn(`ERC: Cannot find first pin's symbol instance for designator ${designator}`);
            }
        });

        window.addEventListener(ProjectERCResultEvent.type, (e) => {
            console.log("Project ERC Result", e.detail);
            const inspector = this.renderRoot.querySelector('kc-erc-inspector') as KCErcInspectorElement;
            if (inspector && e.detail) {
                 inspector.ercResult = e.detail;
            }
        });
    }

    #select_item(idx: NetItemIndex) {
        const sch = this.project.file_by_name(idx.sheet);
        if (sch instanceof KicadSch) {
            if (sch.filename === this.sch_viewer.sch_name) {
                this.sch_viewer.zoom_fit_item(idx.uuid);
            } else {
                this.sch_viewer.focus_net_item = idx.uuid;
                this.viewer.load(sch);
            }
        }
    }

    pop_up_label_ref_menu(refs: NetRef[]) {
        this.#selection_pop_menu.dispatchEvent(
            new KiCanvasFitterMenuEvent({ items: refs }),
        );
    }

    override on_viewer_select(item?: unknown, previous?: unknown) {
        // Only handle double-selecting/double-clicking on items.
        if (!item || item != previous) {
            return;
        }

        // If it's a sheet instance, switch over to the new sheet.
        if (item instanceof SchematicSheet) {
            this.project.activate_sch(
                `${item.sheetfile}:${item.path}/${item.uuid}`,
            );
            return;
        }
    }

    override can_load(src: KicadAssert): boolean {
        return src instanceof KicadSch;
    }

    protected override do_render() {
        this.#selection_pop_menu =
            html`<kc-sch-selection-menu></kc-sch-selection-menu>` as HTMLElement;
        const inspector = html`<kc-erc-inspector></kc-erc-inspector>` as KCErcInspectorElement;
        const content = super.render_viewer();
        return html`${content} ${this.#selection_pop_menu} ${inspector}`;
    }

    override make_viewer_element(): KCSchematicViewerElement {
        return html`<kc-schematic-viewer></kc-schematic-viewer>` as KCSchematicViewerElement;
    }
}

window.customElements.define("kc-schematic-app", KCSchematicAppElement);
