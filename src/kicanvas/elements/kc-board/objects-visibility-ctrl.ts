/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { LayerSet } from "../../../viewers/board/layers";
import { BoardViewer } from "../../../viewers/board/viewer";

enum ObjVisibilities {
    FP_Values = "Values",
    FP_Reference = "Reference",
    FP_Txt = "Footprint Text",
    Hidden_Txt = "Hidden Text",
}

export class ObjVisibilityCtrlList extends KCUIElement {
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
        `,
    ];

    viewer: BoardViewer;

    public constructor() {
        super();
        this.provideContext("layer-visibility", this);
    }

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        // Toggle layer visibility when its item's visibility control is clicked
        this.renderRoot.addEventListener(
            ObjVisibilityCtrl.visibility_event,
            (e) => {
                const item = (e as CustomEvent).detail as ObjVisibilityCtrl;

                const layers = this.viewer.layers as LayerSet;

                item.obj_visible = !item.obj_visible;
                const p = item.obj_visible;

                switch (item.obj_name) {
                    case ObjVisibilities.FP_Reference:
                        {
                            for (const it of layers.fp_reference_txt_layers())
                                if (it) it.opacity = p ? 1 : 0;
                        }
                        break;
                    case ObjVisibilities.FP_Txt:
                        {
                            for (const it of layers.fp_txt_layers()) {
                                if (it) it.opacity = p ? 1 : 0;
                            }

                            this.shadowRoot!.querySelectorAll(
                                "ecad-visibility-ctrl",
                            ).forEach((e) => {
                                const b = e as ObjVisibilityCtrl;

                                if (
                                    b.obj_name ===
                                        ObjVisibilities.FP_Reference ||
                                    b.obj_name === ObjVisibilities.FP_Values
                                ) {
                                    b.obj_visible = p;
                                }
                            });
                        }
                        break;
                    case ObjVisibilities.FP_Values:
                        {
                            for (const it of layers.fp_value_txt_layers()) {
                                if (it) it.opacity = p ? 1 : 0;
                            }
                        }
                        break;
                    case ObjVisibilities.Hidden_Txt:
                        {
                            for (const it of layers.hidden_txt_layers()) {
                                if (it) it.opacity = p ? 1 : 0;
                            }
                        }
                        break;
                }

                this.viewer.draw();
            },
        );
    }

    override render() {
        const items: ReturnType<typeof html>[] = [];

        for (const obj of [
            ObjVisibilities.FP_Reference,
            ObjVisibilities.FP_Values,

            ObjVisibilities.FP_Txt,
            ObjVisibilities.Hidden_Txt,
        ]) {
            const visible = obj !== ObjVisibilities.Hidden_Txt ? "" : undefined;
            items.push(
                html`<ecad-visibility-ctrl
                    obj-name="${obj}"
                    obj-visible="${visible}"></ecad-visibility-ctrl>`,
            );
        }

        return html` ${items} `;
    }
}

class ObjVisibilityCtrl extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                box-sizing: border-box;
                padding: 0.1em 0.8em 0.1em 0.4em;
                color: white;
                text-align: left;
                display: flex;
                flex-direction: row;
                width: 100%;
                align-items: center;
            }

            button {
                all: unset;
                cursor: pointer;
                flex-shrink: 0;
                margin-left: 1em;
                color: white;
                border: 0 none;
                background: transparent;
                padding: 0 0.25em 0 0.25em;
                margin-right: -0.25em;
                display: flex;
                align-items: center;
            }

            .name {
                display: block;
                flex-grow: 1;
            }

            .for-hidden {
                color: #888;
            }

            :host {
                background: var(--list-item-disabled-bg);
                color: var(--list-item-disabled-fg);
            }

            :host(:hover) {
                background: var(--list-item-hover-bg);
                color: var(--list-item-hover-fg);
            }

            :host(:hover) button {
                color: var(--list-item-fg);
            }

            :host(:hover) button:hover {
                color: var(--list-item-fg);
            }

            :host([obj-visible]) {
                background: var(--list-item-bg);
                color: var(--list-item-fg);
            }

            :host([obj-visible]:hover) {
                background: var(--list-item-hover-bg);
                color: var(--list-item-hover-fg);
            }

            :host kc-ui-icon.for-visible,
            :host([obj-visible]) kc-ui-icon.for-hidden {
                display: none;
            }

            :host kc-ui-icon.for-hidden,
            :host([obj-visible]) kc-ui-icon.for-visible {
                display: revert;
            }
        `,
    ];

    static visibility_event = "ecad-viewer:layer-control:visibility";

    override initialContentCallback() {
        super.initialContentCallback();

        this.renderRoot.addEventListener("click", (e) => {
            e.stopPropagation();
            this.dispatchEvent(
                new CustomEvent(ObjVisibilityCtrl.visibility_event, {
                    detail: this,
                    bubbles: true,
                }),
            );
        });
    }

    @attribute({ type: String })
    public obj_name: string;

    @attribute({ type: Boolean })
    public obj_visible: boolean;

    override render() {
        return html` <span class="name">${this.obj_name}</span>
            <button type="button" name="${this.obj_name}">
                <kc-ui-icon class="for-visible">svg:visibility</kc-ui-icon>
                <kc-ui-icon class="for-hidden">svg:visibility_off</kc-ui-icon>
            </button>`;
    }
}

window.customElements.define("ecad-visibility-ctrl", ObjVisibilityCtrl);

window.customElements.define(
    "ecad-visibility-ctrl-list",
    ObjVisibilityCtrlList,
);
