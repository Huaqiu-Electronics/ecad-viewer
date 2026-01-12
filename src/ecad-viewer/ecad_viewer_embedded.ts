import { attribute, html } from "../base/web-components";

import { ECadViewer } from "./ecad_viewer";

export class ECadViewerEmbedded extends ECadViewer {
    @attribute({ type: Boolean })
    public is_bom: boolean;
    override render() {
        if (this.is_bom) return html`<ecad-bom-app></ecad-bom-app>`;
        if (this.has_pcb) return html`<kc-board-app> </kc-board-app>`;
        if (this.has_sch) return html`<kc-schematic-app> </kc-schematic-app>`;
        if (this.has_3d) return html`<ecad-3d-viewer> </ecad-3d-viewer>`;
        return html``;
    }
}

window.customElements.define("ecad-viewer-embedded", ECadViewerEmbedded);
