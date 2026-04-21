/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, WithContext, css } from "../base/web-components";

const common_styles = css`
    :host {
        box-sizing: border-box;
    }

    :host *,
    :host *::before,
    :host *::after {
        box-sizing: inherit;
    }

    [hidden] {
        display: none !important;
    }
`;

/**
 * Base element for all kc-ui-* elements
 */
export class KCUIElement extends WithContext(CustomElement) {
    static override styles = [common_styles];
}
