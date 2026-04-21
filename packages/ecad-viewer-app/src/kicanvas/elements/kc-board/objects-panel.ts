/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate } from "../../../base/events";
import { css, html } from "../../../base/web-components";
import { KCUIElement, type KCUIRangeElement } from "../../../kc-ui";
import {
    BoardViewer,
    ZONE_DEFAULT_OPACITY,
} from "../../../viewers/board/viewer";
import "./objects-visibility-ctrl";

export class KCBoardObjectsPanelElement extends KCUIElement {
    viewer: BoardViewer;
    #check_highlight_track: HTMLInputElement;
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

            kc-ui-panel-title button {
                all: unset;
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
        `,
    ];
    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private setup_events() {
        delegate(this.renderRoot, "kc-ui-range", "kc-ui-range:input", (e) => {
            const control = e.target as KCUIRangeElement;
            const opacity = control.valueAsNumber;
            switch (control.name) {
                case "tracks":
                    this.viewer.track_opacity = opacity;
                    break;
                case "vias":
                    this.viewer.via_opacity = opacity;
                    break;
                case "pads":
                    this.viewer.pad_opacity = opacity;
                    break;
                case "zones":
                    this.viewer.zone_opacity = opacity;
                    break;
                case "grid":
                    this.viewer.grid_opacity = opacity;
                    break;
                case "page":
                    this.viewer.page_opacity = opacity;
                    break;
            }
        });
    }

    override render() {
        this.#check_highlight_track = html` <input
            type="checkbox"
            id="exampleCheckbox"
            name="exampleCheckbox"
            checked="true" />` as HTMLInputElement;

        this.#check_highlight_track.addEventListener("change", () => {
            this.viewer.set_highlighted_track(
                this.#check_highlight_track.checked,
            );
        });

        return html`
            <kc-ui-panel>
                <kc-ui-panel-body padded>
                    <kc-ui-control-list>
                        <kc-ui-control>
                            <label>Tracks</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="tracks"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Vias</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="vias"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Pads</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="pads"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Zones</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="${ZONE_DEFAULT_OPACITY}"
                                name="zones"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-h-control-list>
                            <label>Highlight track:</label>
                            ${this.#check_highlight_track}
                        </kc-ui-h-control-list>
                        <ecad-visibility-ctrl-list></ecad-visibility-ctrl-list>
                    </kc-ui-control-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-objects-panel",
    KCBoardObjectsPanelElement,
);
