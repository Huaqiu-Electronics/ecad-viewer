/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html, attribute } from "../base/web-components";
import { KCUIElement } from "./element";

export class KCUIPropertyList extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: grid;
                gap: 1px;
                background: var(--prop-panel-bg);
                grid-template-columns: fit-content(50%) 1fr;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-property-list", KCUIPropertyList);

export class KCUIPropertyListItemElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: contents;
            }

            span {
                padding: 0.4em;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                user-select: all;
                border-bottom: 1px dashed var(--prop-border-color);
                border-right: 1px dashed var(--prop-border-color);
            }

            :host(.label) span:first-child {
                user-select: none;
                grid-column-end: span 2;
                background: var(--panel-subtitle-bg);
                color: var(--panel-subtitle-fg);
            }

            :host(.label) span:last-child {
                display: none;
            }

            ::slotted(*) {
                vertical-align: middle;
            }
        `,
    ];

    @attribute({ type: String })
    name: string;

    override render() {
        return html`
            <span title="${this.name}">${this.name}</span>
            <span><slot></slot></span>
        `;
    }
}

window.customElements.define(
    "kc-ui-property-list-item",
    KCUIPropertyListItemElement,
);
