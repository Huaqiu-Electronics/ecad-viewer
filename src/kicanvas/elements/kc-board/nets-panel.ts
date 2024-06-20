/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html, query } from "../../../base/web-components";
import {
    KCUIElement,
    KCUIFilteredListElement,
    KCUITextFilterInputElement,
    type KCUIMenuItemElement,
} from "../../../kc-ui";
import { KicadPCB } from "../../../kicad";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardNetsPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: block;
                height: 100%;
                width: 100%;

                overflow-y: auto;
                overflow-x: hidden;
                user-select: none;
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

    viewer: BoardViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        this.addEventListener("kc-ui-menu:select", (e) => {
            const item = (e as CustomEvent).detail as KCUIMenuItemElement;

            const number = parseInt(item?.name, 10);

            if (!number) {
                return;
            }

            this.viewer.focus_net(number);
        });

        // Wire up search to filter the list
        this.search_input_elm.addEventListener("input", (e) => {
            this.item_filter_elem.filter_text =
                this.search_input_elm.value ?? null;
        });
    }

    @query("kc-ui-text-filter-input", true)
    private search_input_elm!: KCUITextFilterInputElement;

    @query("kc-ui-filtered-list", true)
    private item_filter_elem!: KCUIFilteredListElement;

    override render() {
        const board = this.viewer.board;

        const nets = [];
        if (board instanceof KicadPCB)
            for (const net of board.nets) {
                nets.push(
                    html`<kc-ui-menu-item
                        name="${net.number}"
                        data-match-text="${net.number} ${net.name}">
                        <span class="very-narrow"> ${net.number} </span>
                        <span>${net.name}</span>
                    </kc-ui-menu-item>`,
                );
            }

        return html`
            <kc-ui-panel>
                <!-- <kc-ui-panel-title title="Nets"></kc-ui-panel-title> -->
                <kc-ui-panel-body>
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <kc-ui-menu class="outline">${nets}</kc-ui-menu>
                    </kc-ui-filtered-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-nets-panel", KCBoardNetsPanelElement);
