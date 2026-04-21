/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KCUIElement } from "../../../kc-ui";
import { css, html } from "../../../base/web-components";
import "./viewer";

export class BomApp extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                margin: 0;
                display: flex;
                position: relative;
                width: 100%;
                height: 100%;
                aspect-ratio: 1.414;
                background-color: white;
                color: var(--fg);
            }

            .vertical {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                overflow: hidden;
            }

            .tab-content {
                height: 100%;
                width: 100%;
                flex: 1;
                display: none;
            }

            .tab-content.active {
                display: inherit;
            }
        `,
    ];

    override render() {
        return html` <bom-viewer> </bom-viewer> `;
    }
}

window.customElements.define("ecad-bom-app", BomApp);
