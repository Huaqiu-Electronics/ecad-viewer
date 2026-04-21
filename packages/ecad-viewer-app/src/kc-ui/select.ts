/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html, query } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-button wraps the <button> element with common styles and behaviors
 */
export class KCUISelectElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            .alter_src_selections {
                border: solid 1px rgb(202, 216, 218);
                width: 100%;
            }

            .alter_src_selections option {
                text-align: center;
                border: none;
            }
            .alter_src_selections:hover {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections:focus {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections:active {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections option:checked {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections option:disabled {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections option:focus {
                border: solid 1px rgb(202, 216, 218);
            }
            .alter_src_selections option:active {
                border: solid 1px rgb(202, 216, 218);
            }
        `,
    ];

    @query("select", true)
    public select!: HTMLSelectElement;

    @attribute({ type: String })
    name: string | null;

    @attribute({ type: String })
    icon: string | null;

    @attribute({ type: Boolean })
    disabled: boolean;

    @attribute({ type: Boolean })
    selected: boolean;

    static get observedAttributes() {
        return ["disabled", "icon"];
    }

    attributeChangedCallback(
        name: string,
        old: string | null,
        value: string | null,
    ) {
        if (!this.select) {
            return;
        }
        switch (name) {
            case "disabled":
                this.select.disabled = value == null ? false : true;
                break;
        }
    }

    override initialContentCallback() {}

    override render() {
        return html`<select class="alter_src_selections"></select>`;
    }

    public addSelections(ss: string[]) {
        for (const s of ss)
            this.select.appendChild(
                html`<option value=${s}>${s.split(".")[0]}</option>`,
            );
    }
}

window.customElements.define("kc-ui-select", KCUISelectElement);
