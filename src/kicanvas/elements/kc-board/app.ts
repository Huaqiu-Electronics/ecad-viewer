/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, type ElementOrFragment } from "../../../base/web-components";
import { KicadPCB } from "../../../kicad";
import { KCViewerAppElement, type KicadAssert } from "../common/app";
import { KCBoardViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "../common/help-panel";
import "../common/preferences-panel";
import "../common/viewer-bottom-toolbar";
import "./footprints-panel";
import "./info-panel";
import "./layers-panel";
import "./nets-panel";
import "./objects-panel";
import "./properties-panel";
import "./viewer";
import "./objects-visibility-ctrl";
import "./selection-pop-menu";
import { KCBoardLayersPanelElement } from "./layers-panel";
import { KCBoardObjectsPanelElement } from "./objects-panel";
import { TabView } from "../../../kc-ui/tab-view";
import { KCBoardNetsPanelElement } from "./nets-panel";
import type { BoardViewer } from "../../../viewers/board/viewer";
import { AssertType } from "../../project";
import { Footprint } from "../../../kicad/board";

/**
 * Internal "parent" element for KiCanvas's board viewer. Handles
 * setting up the actual board viewer as well as interface controls. It's
 * basically KiCanvas's version of PCBNew.
 */
export class KCBoardAppElement extends KCViewerAppElement<KCBoardViewerElement> {
    override assert_type(): AssertType {
        return AssertType.PCB;
    }

    #layer: KCBoardLayersPanelElement;
    protected override make_property_element(): ElementOrFragment {
        return html`<kc-board-properties-panel></kc-board-properties-panel>`;
    }

    override initialContentCallback() {
        super.initialContentCallback();
        (this.viewer as BoardViewer).layer_visibility_ctrl = this.#layer;
    }

    protected override make_fitter_menu(): HTMLElement {
        this.#layer = new KCBoardLayersPanelElement();
        const obj = new KCBoardObjectsPanelElement();
        const nets = new KCBoardNetsPanelElement();
        return new TabView([
            {
                title: "Layers",
                content: this.#layer,
            },
            {
                title: "Objects",
                content: obj,
            },
            {
                title: "Nets",
                content: nets,
            },
        ]);
    }

    override on_viewer_select(item?: unknown, previous?: unknown) {
        // Selecting the same item twice should show the properties panel.
        if (item instanceof Footprint)
            (this.viewer as BoardViewer).highlight_fp(item);
    }

    override can_load(src: KicadAssert): boolean {
        return src instanceof KicadPCB;
    }

    override make_viewer_element(): KCBoardViewerElement {
        return html`<kc-board-viewer></kc-board-viewer>` as KCBoardViewerElement;
    }

    protected override do_render() {
        const selection_menu =
            html`<kc-board-selection-menu></kc-board-selection-menu>` as HTMLElement;
        const content = super.render_viewer();
        return html`${content} ${selection_menu}`;
    }
}

window.customElements.define("kc-board-app", KCBoardAppElement);
