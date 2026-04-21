/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html, query } from "../base/web-components";
import { KCUIElement } from "../kc-ui/element";
import { KCUIIconElement } from "../kc-ui/icon";

/**
 * kc-ui-button wraps the <button> element with common styles and behaviors
 */
export class TabButtonElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: inline-flex;
                position: relative;
                width: auto;
                cursor: pointer;
                user-select: none;
                align-items: center;
                justify-content: center;
            }

            button {
                all: unset;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid transparent;
                border-radius: 0.25em;
                font-weight: medium;
                font-size: 1em;
                background: var(--tab-button-bg);
                color: var(--tab-button-color);
                width: 100%;
                height: 100%;
                transition:
                    color var(--transition-time-short) ease,
                    border var(--transition-time-short) ease,
                    background var(--transition-time-short) ease;
            }

            :host {
                fill: var(--button-fg);
            }

            button:hover {
                background: var(--tab-button-hover-bg);
            }

            :host(.checked) button {
                background: var(--tab-button-hover-bg);
            }

            :host([selected]) button {
                background: var(--tab-button-selected-bg);
            }
        `,
    ];

    @query("button", true)
    private button!: HTMLButtonElement;

    @query("button_icon", true)
    private button_icon!: KCUIIconElement;

    @attribute({ type: String })
    name: string | null;

    @attribute({ type: String })
    icon: string | null;

    @attribute({ type: String })
    variant: string | null;

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
        if (!this.button) {
            return;
        }
        switch (name) {
            case "disabled":
                this.button.disabled = value == null ? false : true;
                break;
            case "icon":
                this.button_icon.innerText = value ?? "";
                break;
        }
    }

    override initialContentCallback() {
        if (this.variant) {
            this.button.classList.add(this.variant);
        }

        this.button.disabled = this.disabled;
    }

    override render() {
        const icon = this.icon
            ? html`<kc-ui-icon part="icon">${this.icon}</kc-ui-icon>`
            : undefined;
        return html`<button part="base">
            ${icon}
            <slot part="contents"></slot>
        </button>`;
    }
}

window.customElements.define("tab-button", TabButtonElement);
