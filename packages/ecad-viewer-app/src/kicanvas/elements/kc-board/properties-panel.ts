/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../../base/web-components";
import {
    KCUIElement,
    KCUIPanelTitleWithCloseElement,
    HorizontalResizerElement,
} from "../../../kc-ui";
import { Footprint, LineSegment, Pad, Via, Zone } from "../../../kicad/board";
import type {
    BoardInspectItem,
    NetInfo,
} from "../../../kicad/board_bbox_visitor";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardPropertiesPanelElement extends KCUIElement {
    viewer: BoardViewer;
    selected_item?: BoardInspectItem;

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
                this.selected_item = e.detail.item as BoardInspectItem;
                if (!this.selected_item) {
                    this.hidden = true;
                } else {
                    this.update();
                    this.hidden = false;
                }
            }),
        );
    }
    entry = (name: string, desc?: any, suffix = "") =>
        html`<kc-ui-property-list-item name="${name}">
            ${desc ?? ""} ${suffix}
        </kc-ui-property-list-item>`;

    header = (name: string) =>
        html`<kc-ui-property-list-item class="label" name="${name}">
        </kc-ui-property-list-item>`;

    checkbox = (value?: boolean) =>
        value
            ? html`<kc-ui-icon>check</kc-ui-icon>`
            : html`<kc-ui-icon>close</kc-ui-icon>`;
    override render() {
        let entries;

        const itm = this.selected_item;
        let title_txt = "Properties";

        if (!itm) {
            entries = this.header("No item selected");
        } else {
            if ("typeId" in itm) {
                title_txt = itm.typeId;
                switch (itm.typeId) {
                    case "Footprint":
                        entries = this.getFootprintProperties(itm as Footprint);
                        break;
                    case "Pad":
                        entries = this.getPadProperties(itm as Pad);
                        break;
                    case "LineSegment":
                        title_txt = "Track";
                        entries = this.getLineSegmentProperties(
                            itm as LineSegment,
                        );
                        break;
                    case "Via":
                        entries = this.getViaProperties(itm as Via);
                        break;
                    case "Zone":
                        entries = this.getZoneProperties(itm as Zone);
                        break;
                    default:
                        entries = this.header("Unknown item type");
                        break;
                }
            } else {
                entries = this.getNetInfo(itm as NetInfo);
                title_txt = "Net";
            }
        }
        const title = html`
            <kc-ui-panel-title-with-close></kc-ui-panel-title-with-close>
        ` as KCUIPanelTitleWithCloseElement;
        title.title = title_txt;

        title.close.addEventListener("click", (e) => {
            this.hidden = true;
        });
        const sizer_element: HorizontalResizerElement =
            new HorizontalResizerElement(this);
        return html`
            ${sizer_element}
            <kc-ui-panel>
                ${title}
                <kc-ui-panel-body>
                    <kc-ui-property-list> ${entries} </kc-ui-property-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }

    getFootprintProperties(itm: Footprint) {
        const properties = Object.entries(itm.properties).map(([k, v]) => {
            return this.entry(k, v);
        });
        const bbox = itm.bbox;
        return html`
            ${this.header("Basic properties")}
            ${this.entry("X", itm.at.position.x.toFixed(4), "mm")}
            ${this.entry("Y", itm.at.position.y.toFixed(4), "mm")}
            ${this.entry("Height", bbox.h.toFixed(4), "mm")}
            ${this.entry("Width", bbox.w.toFixed(4), "mm")}
            ${this.entry("Orientation", itm.at.rotation, "°")}
            ${this.entry("Layer", itm.layer)}
            ${this.header("Footprint properties")}
            ${this.entry("Reference", itm.reference)}
            ${this.entry("Value", itm.value)}
            ${this.entry(
                "Type",
                itm.attr.through_hole
                    ? "through hole"
                    : itm.attr.smd
                      ? "smd"
                      : "unspecified",
            )}
            ${this.entry("Pads", itm.pads.length)}
            ${this.entry("Library link", itm.library_link)}
            ${this.entry("Description", itm.descr)}
            ${this.entry("Keywords", itm.tags)} ${properties}
            ${this.header("Fabrication attributes")}
            ${this.entry(
                "Not in schematic",
                this.checkbox(itm.attr.board_only),
            )}
            ${this.entry(
                "Exclude from position files",
                this.checkbox(itm.attr.exclude_from_pos_files),
            )}
            ${this.entry(
                "Exclude from BOM",
                this.checkbox(itm.attr.exclude_from_bom),
            )}
            ${this.header("Overrides")}
            ${this.entry(
                "Exempt from courtyard requirement",
                this.checkbox(itm.attr.allow_missing_courtyard),
            )}
            ${this.entry("Clearance", itm.clearance ?? 0, "mm")}
            ${this.entry(
                "Solderpaste margin",
                itm.solder_paste_margin ?? 0,
                "mm",
            )}
            ${this.entry(
                "Solderpaste margin ratio",
                itm.solder_paste_ratio ?? 0,
            )}
            ${this.entry("Zone connection", itm.zone_connect ?? "inherited")}
        `;
    }

    getPadProperties(itm: Pad) {
        const bbox = itm.bbox;
        return html`
            ${this.header("Basic properties")}
            ${this.entry("X", bbox.x.toFixed(4), "mm")}
            ${this.entry("Y", bbox.y.toFixed(4), "mm")}
            ${this.entry("Height", bbox.h.toFixed(4), "mm")}
            ${this.entry("Width", bbox.w.toFixed(4), "mm")}
            ${this.entry("Orientation", itm.at.rotation, "°")}
            ${this.entry("Layer", itm.parent?.layer)}
            ${this.header("Pad properties")} ${this.entry("Type", itm.type)}
            ${this.entry("Shape", itm.shape)}
            ${this.entry("Drill", itm.drill?.diameter)}
            ${this.entry("Net", itm?.net?.name ?? "")}
            ${this.entry("PinNum", itm.number)}
            ${this.entry("PinType", itm.pintype)}
            ${this.entry("PinFunction", itm.pinfunction)}
        `;
    }

    getLineSegmentProperties(itm: LineSegment) {
        return html`
            ${this.header("Basic properties")}
            ${this.entry("X", itm.start.x.toFixed(4), "mm")}
            ${this.entry("Y", itm.start.y.toFixed(4), "mm")}
            ${this.entry("Width", itm.width.toFixed(4), "mm")}
            ${this.entry("Length", itm.routed_length.toFixed(4), "mm")}
            ${this.entry("Layer", itm.layer)}
            ${this.entry("Net", this.viewer.board.getNetName(itm.net))}
            ${this.header("Track properties")}
            ${this.entry("End X", itm.end.x.toFixed(4), "mm")}
            ${this.entry("End Y", itm.end.y.toFixed(4), "mm")}
        `;
    }

    getViaProperties(itm: Via) {
        return html`
            ${this.header("Basic properties")}
            ${this.entry("X", itm.at.position.x.toFixed(4), "mm")}
            ${this.entry("Y", itm.at.position.y.toFixed(4), "mm")}
            ${this.entry("Net", this.viewer.board.getNetName(itm.net))}
            ${this.entry("Diameter", itm.size.toFixed(4), "mm")}
            ${this.header("Via properties")}
            ${this.entry("Hole", itm.drill, "mm")}
            ${this.entry("Layer Top", itm.layers[0])}
            ${this.entry("Layer Bottom", itm.layers[itm.layers.length - 1])}
            ${this.entry("Via Type", itm.type)}
        `;
    }

    getZoneProperties(zone: Zone) {
        return html`
            ${this.header("Basic properties")} ${this.entry("Name", zone.name)}
            ${this.entry("Priority", zone.priority)}
            ${this.entry("Net", zone.net_name)}
            ${this.header("Zone properties")}
            ${this.entry("File Mode", zone.fill.mode)}
            ${this.entry("Clearance Override", zone.connect_pads.clearance)}
            ${this.entry("Minimum width", zone.min_thickness, "mm")}
            ${this.entry(
                "Pad Connections",
                zone.connect_pads.type ?? "Thermal reliefs",
            )}
            ${this.entry("Minimum width", zone.min_thickness, "mm")}
            ${this.entry("Thermal Relief Gap", zone.fill.thermal_gap, "mm")}
            ${this.entry(
                "Thermal Relief Spoke Width",
                zone.fill.thermal_bridge_width,
                "mm",
            )}
        `;
    }

    getNetInfo(net: NetInfo) {
        let layers = "";
        if (net.layers) for (const i of net.layers) layers += i + ",";
        if (layers.length) layers.slice(0, layers.length - 1);

        const name = net.net ?? "";
        const length = net.routed_length ?? 0;
        return html`
            ${this.header(`${name}`)} ${this.entry("Net Name", name)}
            ${this.entry("Routed length", length.toFixed(4), "mm")}
            ${this.entry("Layers Used", layers)}
        `;
    }
}

window.customElements.define(
    "kc-board-properties-panel",
    KCBoardPropertiesPanelElement,
);
