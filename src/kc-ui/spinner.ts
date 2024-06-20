/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-floating-toolbar is a toolbar that presents its elements on top of
 * another, such as a document viewer. It allows tools to take up minimal room
 * in the UI since unused areas of the toolbar are transparent and open to the
 * element belong.
 */
export class Spinner extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                height: 100%;
                width: 100%;
            }
            .loading-container {
                margin: 0;
                padding: 0;
                height: 100%; /* Make sure the body takes up the full height of the viewport */
                width: 100%;
                display: flex;
                justify-content: center; /* Center horizontally */
                align-items: center; /* Center vertically */
            }

            .loading-spinner {
                border: 8px solid rgba(0, 0, 0, 0.1);
                border-left-color: #333;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }
        `,
    ];

    override render() {
        return html`
            <div class="loading-container">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

window.customElements.define("ecad-spinner", Spinner);
