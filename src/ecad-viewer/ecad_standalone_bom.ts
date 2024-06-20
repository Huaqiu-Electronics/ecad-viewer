import { html } from "../base/web-components";
import { ECadViewer } from "./ecad_viewer";

export class ECadStandaloneBom extends ECadViewer {
    override render() {
        return html`<ecad-bom-app> </ecad-bom-app>`;
    }
}

window.customElements.define("ecad-standalone-bom", ECadStandaloneBom);
