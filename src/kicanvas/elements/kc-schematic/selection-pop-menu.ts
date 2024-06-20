import { Vec2 } from "../../../base/math";
import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import type { NetRef } from "../../../kicad/net_ref";
import {
    KiCanvasFitterMenuEvent,
    NetItemSelectEvent,
} from "../../../viewers/base/events";
import type { SchematicViewer } from "../../../viewers/schematic/viewer";

export class SchSelectionPopMenu extends KCUIElement {
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
    #net_items: NetRef[] = [];
    #content: HTMLDivElement;
    #pos: Vec2 | null = null;
    viewer: SchematicViewer;
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
            }
        });

        this.addEventListener(KiCanvasFitterMenuEvent.type, (e) => {
            this.#net_items = e.detail.items as NetRef[];
            if (!this.#net_items.length) {
                this.hidden = true;
            } else {
                if (!this.#pos) return;
                this.update();
                this.#content.style.top = `${this.#pos.y - 10}px`;
                this.#content.style.left = `${this.#pos.x}px`;
                this.hidden = false;
            }
        });
    }

    build_item_desc(itm: NetRef) {
        return `${itm.sheet_name}:${itm.name}`;
    }

    override render() {
        this.#content = html` <ul class="modal-list"></ul>` as HTMLDivElement;

        for (const i of this.#net_items) {
            const selection = html` <li>${this.build_item_desc(i)}</li> `;
            selection.addEventListener("click", () => {
                this.viewer.dispatchEvent(
                    new NetItemSelectEvent({
                        sheet: i.sheet_name,
                        uuid: i.uuid,
                    }),
                );
            });

            this.#content.appendChild(selection);
        }
        return html` ${this.#content} `;
    }
}

window.customElements.define("kc-sch-selection-menu", SchSelectionPopMenu);
