/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../../../base/array";
import { css, html } from "../../../base/web-components";
import { KCUIElement, KCUIPanelTitleWithCloseElement } from "../../../kc-ui";
import type { Stroke } from "../../../kicad/common";
import {
    Bus,
    BusEntry,
    GlobalLabel,
    HierarchicalLabel,
    Label,
    PinInstance,
    SchematicSheet,
    SchematicSymbol,
    Wire,
    type SchematicNode,
} from "../../../kicad/schematic";
import {
    KiCanvasLoadEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import { SchematicViewer } from "../../../viewers/schematic/viewer";

export class KCSchematicPropertiesPanelElement extends KCUIElement {
    viewer: SchematicViewer;
    selected_item?: SchematicNode;
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                position: absolute;
                right: 0;
                height: 100%;
                width: var(--floating-pro-panel-width);
                top: 0;
                bottom: 0;
                flex: 1;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
            }
            ::-webkit-scrollbar {
                position: absolute;
                width: 6px;
                height: 6px;
                margin-left: -6px;
                background: var(--scrollbar-bg);
            }

            ::-webkit-scrollbar-thumb {
                position: absolute;
                background: var(--scrollbar-fg);
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-hover-fg);
            }

            ::-webkit-scrollbar-thumb:active {
                background: var(--scrollbar-active-fg);
            }
        `,
    ];
    constructor() {
        super();
        this.hidden = true;
    }
    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private setup_events() {
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                this.selected_item = e.detail.item as SchematicSymbol;
                this.hidden = false;
                this.update();
            }),
        );

        // If a new schematic is loaded, clear the selected item.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasLoadEvent.type, (e) => {
                this.selected_item = undefined;
                this.hidden = true;
                this.update();
            }),
        );
    }

    override render() {
        const header = (name: string) =>
            html`<kc-ui-property-list-item
                class="label"
                name="${name}"></kc-ui-property-list-item>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html`<kc-ui-property-list-item name="${name}">
                ${desc ?? ""} ${suffix}
            </kc-ui-property-list-item>`;

        const stroke = (s: Stroke) =>
            html` ${entry("Line Style", s.type)}
            ${entry("Line Width", s.width, "mils")}
            ${entry("Color", s.color?.to_css())}`;

        const checkbox = (value?: boolean) =>
            value
                ? html`<kc-ui-icon>yes</kc-ui-icon>`
                : html`<kc-ui-icon>no</kc-ui-icon>`;

        let entries;
        const it = this.selected_item;
        let title_txt = "Properties";

        if (it) title_txt = it.constructor.name;

        const title = html`
            <kc-ui-panel-title-with-close
                title="${title_txt}"></kc-ui-panel-title-with-close>
        ` as KCUIPanelTitleWithCloseElement;

        title.close.addEventListener("click", (e) => {
            this.hidden = true;
        });
        if (!it) {
            entries = header("No item selected");
        } else if (it instanceof SchematicSymbol) {
            title.title = "Symbol";
            const lib = it.lib_symbol;

            const properties = Array.from(it.properties.values()).map((v) => {
                return entry(v.name, v.text);
            });

            const pins = sorted_by_numeric_strings(
                it.unit_pins,
                (pin) => pin.number,
            ).map((p) => {
                return entry(p.number, p.definition.name.text);
            });

            entries = html`
                ${header("Basic properties")}
                ${entry("X", it.at.position.x.toFixed(4), "mm")}
                ${entry("Y", it.at.position.y.toFixed(4), "mm")}
                ${entry("Orientation", it.at.rotation, "°")}
                ${entry(
                    "Mirror",
                    it.mirror == "x"
                        ? "Around X axis"
                        : it.mirror == "y"
                          ? "Around Y axis"
                          : "Not mirrored",
                )}
                ${header("Instance properties")}
                ${entry("Library link", it.lib_name ?? it.lib_id)}
                ${it.unit
                    ? entry(
                          "Unit",
                          String.fromCharCode("A".charCodeAt(0) + it.unit - 1),
                      )
                    : ""}
                ${entry("In BOM", checkbox(it.in_bom))}
                ${entry("On board", checkbox(it.in_bom))}
                ${entry("Populate", checkbox(!it.dnp))} ${header("Fields")}
                ${properties} ${header("Symbol properties")}
                ${entry("Name", lib.name)}
                ${entry("Description", lib.description)}
                ${entry("Keywords", lib.keywords)}
                ${entry("Power", checkbox(lib.power))}
                ${entry("Units", lib.unit_count)}
                ${entry(
                    "Units are interchangeable",
                    checkbox(lib.units_interchangable),
                )}
                ${header("Pins")} ${pins}
            `;
        } else if (it instanceof SchematicSheet) {
            title.title = "Sheet";

            const properties = Array.from(it.properties.values()).map((v) => {
                return entry(v.name, v.text);
            });

            const pins = sorted_by_numeric_strings(
                it.pins,
                (pin) => pin.name,
            ).map((p) => {
                return entry(p.name, p.shape);
            });

            entries = html`
                ${header("Basic properties")}
                ${entry("X", it.at.position.x.toFixed(4), "mm")}
                ${entry("Y", it.at.position.y.toFixed(4), "mm")}
                ${header("Fields")} ${properties} ${header("Pins")} ${pins}
            `;
        } else if (it instanceof Label) {
            entries = html`
                ${header("Basic properties")}
                ${entry("X", it.at.position.x.toFixed(4), "mm")}
                ${entry("Y", it.at.position.y.toFixed(4), "mm")}
                ${header("Text properties")} ${entry("Text", it.text)}
                ${entry("Bold", it.effects.font.bold)}
                ${entry("Italic", it.effects.font.italic)}
                ${it instanceof HierarchicalLabel || it instanceof GlobalLabel
                    ? entry("Shape", it.shape)
                    : ""}
            `;
        } else if (it instanceof Wire) {
            entries = html` ${header("Wire properties")} ${stroke(it.stroke)} `;
        } else if (it instanceof PinInstance) {
            title.title = "Pin";
            entries = html`
                ${header("Pin properties")} ${entry("unit", it.unit)}
                ${entry("number", it.number)}
                ${entry("alternate", it.alternate)}
            `;
        } else if (it instanceof BusEntry) {
            entries = html`
                ${header("Basic properties")}
                ${entry("X", it.at.position.x.toFixed(4), "mm")}
                ${entry("Y", it.at.position.y.toFixed(4), "mm")}
                ${header("BusEntry properties")} ${stroke(it.stroke)}
            `;
        } else if (it instanceof Bus) {
            entries = html` ${header("Bus properties")} ${stroke(it.stroke)} `;
        }

        return html`
            <kc-ui-panel>
                ${title}
                <kc-ui-panel-body>
                    <kc-ui-property-list>${entries}</kc-ui-property-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-schematic-properties-panel",
    KCSchematicPropertiesPanelElement,
);
