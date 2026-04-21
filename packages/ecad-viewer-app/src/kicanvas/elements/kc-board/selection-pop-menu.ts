import { Vec2 } from "../../../base/math";
import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import type {
    BoardSelectable,
    BoardInteractiveItem,
} from "../../../kicad/board_bbox_visitor";
import {
    KiCanvasFitterMenuEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import { BoardViewer } from "../../../viewers/board/viewer";
import { Footprint, LineSegment, Pad, Via, Zone } from "../../../kicad/board";

export class SelectionPopMenu extends KCUIElement {
    static override styles = [
        css`
            :host {
                position: fixed;
                display: block;
                height: 100%;
                width: 100%;
                background: transparent;
                color: var(--pop-menu-fg);
                z-index: 10; /* Set a higher z-index for the modal */
            }

            /* Style the list inside the modal */
            .modal-list {
                background-color: var(--pop-menu-bg);
                position: absolute;
                display: block;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                list-style-type: none;
                padding: 0;
                color: var(--pop-menu-fg);
                z-index: 300; /* Set a higher z-index for the list */
            }

            .modal-list li {
                color: var(--pop-menu-fg);
                margin-bottom: 8px;
                cursor: pointer;
                transition: color 0.3s; /* Add transition for smooth hover effect */
            }

            .modal-list li:hover {
                color: var(
                    --pop-menu-fg-hover
                ); /* Set your desired hover color */
            }
        `,
    ];
    #selected_items: BoardInteractiveItem[] = [];
    #content: HTMLDivElement;
    #pos: Vec2 | null = null;
    viewer: BoardViewer;
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
        window.addEventListener("mousemove", (e) => {
            this.#pos = new Vec2(e.offsetX, e.offsetY);
        });

        this.addEventListener("click", (event: MouseEvent) => {
            if (this.#content.contains(event.target as any)) {
                return;
            }

            if (event.button === 0 && this.hidden === false) {
                this.hidden = true;
                event.stopPropagation();
            }
        });

        this.addDisposable(
            this.viewer.addEventListener(KiCanvasFitterMenuEvent.type, (e) => {
                this.#selected_items = e.detail.items as BoardInteractiveItem[];
                if (!this.#selected_items.length) {
                    this.hidden = true;
                } else {
                    if (!this.#pos) return;
                    this.update();
                    this.#content.style.top = `${this.#pos.y - 10}px`;
                    this.#content.style.left = `${this.#pos.x}px`;
                    this.hidden = false;
                }
            }),
        );
    }

    build_item_desc(itm: BoardSelectable) {
        switch (itm.typeId) {
            case "Footprint":
                return this.getFootprintProperties(itm as Footprint);
            case "Pad":
                return this.getPadProperties(itm as Pad);
            case "LineSegment":
                return this.getLineDesc(itm as LineSegment);
            case "Via":
                return this.getViaProperties(itm as Via);
            case "Zone":
                return this.getZoneProperties(itm as Zone);
            default:
                return "";
        }
    }

    getPadProperties(itm: Pad) {
        return `Pad [Net-${itm.net.name}] on ${itm.layers[0]}`;
    }

    getViaProperties(itm: Via) {
        return `Via [Net-${this.viewer.board.getNetName(itm.net)}] on ${itm.layers[0]}`;
    }

    getZoneProperties(zone: Zone) {
        return `Zone [Net-${this.viewer.board.getNetName(zone.net)}] on ${zone.layer}`;
    }

    getFootprintProperties(itm: Footprint) {
        return `Footprint  ${itm.Reference}  on ${itm.layer}`;
    }

    getLineDesc(itm: LineSegment) {
        return `Track [Net-${this.viewer.board.getNetName(itm.net)}] on ${itm.layer} `;
    }

    override render() {
        this.#content = html` <ul class="modal-list"></ul>` as HTMLDivElement;

        for (const i of this.#selected_items) {
            if (i.item) {
                const selection = html`
                    <li>${this.build_item_desc(i.item)}</li>
                `;
                selection.addEventListener("click", () => {
                    this.viewer.dispatchEvent(
                        new KiCanvasSelectEvent({
                            item: i.item,
                            previous: null,
                        }),
                    );
                });

                selection.addEventListener("mouseover", () => {
                    if (
                        i.item &&
                        "net" in i.item &&
                        typeof i.item.net === "number"
                    ) {
                        this.viewer.highlight_net(i.item.net);
                    }
                });
                this.#content.appendChild(selection);
            }
        }
        return html` ${this.#content} `;
    }
}

window.customElements.define("kc-board-selection-menu", SelectionPopMenu);
