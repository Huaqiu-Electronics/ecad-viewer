/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../../base/web-components";
import { KCUIElement, type KCUIButtonElement } from "../../../kc-ui";
import type { Viewer } from "../../../viewers/base/viewer";

export class KCViewerBottomToolbarElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            output {
                width: unset;
                margin: unset;
                padding: 0.5em;
                color: var(--button-toolbar-fg);
                background: var(--button-toolbar-bg);
                border: 1px solid var(--button-toolbar-bg);
                border-radius: 0.25em;
                font-weight: 300;
                font-size: 0.9em;
                box-shadow: var(--input-hover-shadow);
                user-select: none;
            }
        `,
    ];

    viewer: Viewer;
    #reset: KCUIButtonElement;
    #zoom_in: KCUIButtonElement;
    #zoom_out: KCUIButtonElement;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;

            super.connectedCallback();

            this.#reset.addEventListener("click", (e) => {
                e.preventDefault();
                this.viewer.zoom_fit_top_item();
            });

            this.#zoom_in.addEventListener("click", (e) => {
                e.preventDefault();
                this.viewer.zoom_in();
            });

            this.#zoom_out.addEventListener("click", (e) => {
                e.preventDefault();
                this.viewer.zoom_out();
            });
        })();
    }

    override render() {
        this.#reset = html`<kc-ui-button
            slot="right"
            variant="toolbar"
            name="reset"
            title="reset"
            icon="svg:reset">
        </kc-ui-button>` as KCUIButtonElement;

        this.#zoom_in = html`<kc-ui-button
            slot="right"
            variant="toolbar"
            name="zoom_in"
            title="zoom in"
            icon="svg:zoom_in">
        </kc-ui-button>` as KCUIButtonElement;

        this.#zoom_out = html`<kc-ui-button
            slot="right"
            variant="toolbar"
            name="zoom_out"
            title="zoom out"
            icon="svg:zoom_out">
        </kc-ui-button>` as KCUIButtonElement;

        return html`<kc-ui-floating-toolbar location="bottom">
            ${this.#zoom_out} ${this.#reset} ${this.#zoom_in}
        </kc-ui-floating-toolbar>`;
    }
}

window.customElements.define(
    "kc-viewer-bottom-toolbar",
    KCViewerBottomToolbarElement,
);
