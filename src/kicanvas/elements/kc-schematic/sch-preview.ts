/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { KicadSch } from "../../../kicad";
import { KCSchematicViewerElement } from "./viewer";

export class SchPreviewElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: content;
                width: 100%;
                user-select: none;
                background-color: var(--panel-bg);
            }

            .margin-container {
                display: content;
                width: 100%;
                height: var(--preview-item-height);
                padding-right: 10px;
                padding-left: 10px;
                padding-top: 2px;
                padding-bottom: 2px;
            }

            .view-container {
                pointer-events: none;
                height: 85%;
                width: 100%;
            }
            .text-container {
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 15%;
                width: 100%;
            }
            .viewer-panel {
                width: 100%;
                height: 100%;
                background-color: var(--panel-bg);
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                border-radius: 5px;
                color: var(--pop-menu-fg);
                align-items: center;
                border: 1px solid var(--pop-menu-bg);
                padding: 2px;
            }

            .viewer-panel:hover {
                border: 1px solid var(--preview-item-hover-fg);
            }
        `,
    ];

    #preview: KCSchematicViewerElement = new KCSchematicViewerElement();

    #sch: KicadSch;

    #sch_name: string;

    constructor(sch: KicadSch) {
        super();
        this.#sch = sch;
        this.#sch_name = sch.filename;
        this.#preview.classList.add("preview");
    }

    override initialContentCallback() {
        this.#preview.load(this.#sch);
    }

    override render() {
        return html`
            <div class="margin-container">
                <div class="viewer-panel">
                    <div class="view-container">${this.#preview}</div>
                    <div class="text-container">
                        <p>${this.#sch_name}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("sch-preview", SchPreviewElement);
