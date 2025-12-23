/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-icon is a material symbol
 */
export class KCUIIconElement extends KCUIElement {
    public static sprites_url: string = "";

    static override styles = [
        css`
            :host {
                box-sizing: border-box;
                font-family: "Material Symbols Outlined";
                font-weight: normal;
                font-style: normal;
                font-size: inherit;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: "liga";
                -moz-font-feature-settings: "liga";
                font-feature-settings: "liga";
                -webkit-font-smoothing: antialiased;
                user-select: none;
            }

            svg {
                width: 1.2em;
                height: auto;
                fill: currentColor;
            }
        `,
    ];

    override render() {
        const text = this.textContent ?? "";
        if (text.startsWith("svg:")) {
            const name = text.slice(4);
            const url = `${KCUIIconElement.sprites_url}#${name}`;
            // Manually construct SVG to avoid $$:0:$$ 404 error from html tag template
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 48 48");
            svg.setAttribute("width", "48");

            const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);

            svg.appendChild(use);
            return svg;
        } else {
            return html`<slot></slot>`;
        }
    }
}

window.customElements.get("kc-ui-icon") ||
    customElements.define("kc-ui-icon", KCUIIconElement);
