import { later } from "../base/async";
import {
    CSS,
    CustomElement,
    attribute,
    css,
    html,
} from "../base/web-components";
import { KCUIElement } from "../kc-ui";
import kc_ui_styles from "../kc-ui/kc-ui.css";
import { AssertType, Project } from "../kicanvas/project";
import {
    FetchFileSystem,
    type EcadBlob,
    type EcadSources,
} from "../kicanvas/services/vfs";
import { KCBoardAppElement } from "../kicanvas/elements/kc-board/app";
import { KCSchematicAppElement } from "../kicanvas/elements/kc-schematic/app";
import { BomApp } from "../kicanvas/elements/bom/app";

import { TabHeaderElement } from "./tab_header";
import {
    BoardContentReady,
    OpenBarrierEvent,
    SheetLoadEvent,
    TabActivateEvent,
    TabMenuClickEvent,
    TabMenuVisibleChangeEvent,
} from "../viewers/base/events";

import { TabKind } from "./constraint";
import type { InputContainer } from "./input_container";
import { Online3dViewer } from "../3d-viewer/online_3d_viewer";
import "../kc-ui/spinner";

export class ECadViewer extends KCUIElement implements InputContainer {
    static override styles = [
        ...KCUIElement.styles,
        new CSS(kc_ui_styles),
        css`
            :host(.full-window) {
                width: 100vw; /* Full width of the viewport */
                height: 100vh; /* Full height of the viewport */
                top: 0px;
                left: 0px;
                position: fixed;
            }

            :host {
                margin: 0;
                display: flex;
                position: relative;
                width: 100%;
                max-height: 100%;
                aspect-ratio: 1.414;
                background-color: white;
                color: var(--fg);
                contain: layout paint;
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

    constructor() {
        super();
        this.provideContext("project", this.#project);
        this.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
    }

    get input() {
        return this.#file_input;
    }
    public get target() {
        return this;
    }

    #tab_contents: Record<string, HTMLElement> = {};
    #project: Project = new Project();
    #schematic_app: KCSchematicAppElement;
    #ov_d_app: Online3dViewer;
    #board_app: KCBoardAppElement;
    #bom_app: BomApp;
    #tab_header: TabHeaderElement;
    #file_input: HTMLInputElement;
    #spinner: HTMLElement;
    #content: HTMLElement;
    get project() {
        return this.#project;
    }

    @attribute({ type: Boolean })
    public loading: boolean;

    @attribute({ type: Boolean })
    public loaded: boolean;

    @attribute({ type: String })
    public url: string;

    @attribute({ type: String })
    public cli_server_addr: string;

    @attribute({ type: String })
    public zip_url?: string;

    override initialContentCallback() {
        this.#setup_events();
        later(() => {
            this.load_src();
        });
    }

    async #setup_events() {}

    async load_src() {
        if (this.zip_url) {
            this.#tab_header = new TabHeaderElement({
                has_3d: false,
                has_pcb: false,
                has_sch: false,
                has_bom: false,
                cli_server_addr: this.cli_server_addr,
            });

            const file = await (await fetch(this.zip_url)).blob();
            this.#tab_header.load_zip_content(this, file);
            return;
        }

        const files = [];
        const blobs: EcadBlob[] = [];

        if (this.url) {
            for (const it of this.url.split(";")) {
                if (it.endsWith(".glb")) this.#project.ov_3d_url = this.url;
                else files.push(it);
            }
        }

        for (const src_elm of this.querySelectorAll<EcadSourceElement>(
            "ecad-source",
        )) {
            if (src_elm.src) {
                files.push(src_elm.src);
            }
        }

        for (const blob_elm of this.querySelectorAll<EcadBlobElement>(
            "ecad-blob",
        )) {
            blobs.push({
                filename: blob_elm.filename,
                content: blob_elm.content,
            });
        }

        for (const src of this.querySelectorAll<Ov3dElement>(
            "ecad-3d-source",
        )) {
            if (src.src) {
                this.#project.ov_3d_url = src.src;
                break;
            }
        }

        const vfs = new FetchFileSystem(files);
        await this.#setup_project({ vfs, blobs });
    }

    async #setup_project(sources: EcadSources) {
        this.loaded = false;
        this.loading = true;

        try {
            await this.#project.load(sources);

            this.loaded = true;
            await this.update();
            this.#project.on_loaded();
        } finally {
            this.loading = false;
        }
    }
    get has_3d() {
        return this.#project.has_boards || this.#project.has_3d;
    }
    get has_pcb() {
        return this.#project.has_boards;
    }
    get has_sch() {
        return this.#project.has_schematics;
    }
    get has_bom() {
        return this.has_pcb || this.has_sch;
    }
    on_full_windows() {
        this.classList.toggle("full-window");
        this.#ov_d_app.on_show();
    }

    override render() {
        this.#file_input = html` <input
            type="file"
            id="fileInput"
            style="display: none"
            multiple />` as HTMLInputElement;
        this.#spinner = html`<ecad-spinner></ecad-spinner>` as HTMLElement;
        if (!this.loaded) return this.#spinner;
        this.#spinner.hidden = true;
        this.#tab_contents = {};

        this.#tab_header = new TabHeaderElement({
            has_3d: this.has_3d,
            has_pcb: this.has_pcb,
            has_sch: this.has_sch,
            has_bom: this.has_bom,
            cli_server_addr: this.cli_server_addr,
        });

        this.#tab_header.input_container = this;
        this.#tab_header.addEventListener(TabActivateEvent.type, (event) => {
            const tab = (event as TabActivateEvent).detail;
            if (tab.previous) {
                switch (tab.previous) {
                    case TabKind.pcb:
                        if (this.#board_app)
                            this.#board_app.tabMenuHidden = true;
                        break;
                    case TabKind.sch:
                        if (this.#schematic_app)
                            this.#schematic_app.tabMenuHidden = true;
                        break;
                    case TabKind.bom:
                        break;
                    case TabKind.step:
                        break;
                }
            }

            Object.values(this.#tab_contents).forEach((i) => {
                i.classList.remove("active");
            });
            this.#tab_contents[tab.current]?.classList.add("active");

            if (tab.current === TabKind.step && this.#ov_d_app) {
                this.#ov_d_app.on_show();
            }
        });

        this.#tab_header.addEventListener(TabMenuClickEvent.type, (event) => {
            const tab = (event as TabMenuClickEvent).detail;
            switch (tab) {
                case TabKind.pcb:
                    this.#board_app.tabMenuHidden =
                        !this.#board_app.tabMenuHidden;
                    break;
                case TabKind.sch:
                    this.#schematic_app.tabMenuHidden =
                        !this.#schematic_app.tabMenuHidden;
                    break;
                case TabKind.bom:
                    break;
            }
        });

        this.#tab_header.addEventListener(OpenBarrierEvent.type, (event) => {
            if (this.#spinner) {
                this.#spinner.hidden = false;
                this.#content.hidden = true;
            }
        });

        const embed_to_tab = (page: HTMLElement, index: TabKind) => {
            this.#tab_contents[index] = page;
            page.classList.add("tab-content");
            page.addEventListener(TabMenuVisibleChangeEvent.type, (event) => {
                const visible = (event as TabMenuVisibleChangeEvent).detail;
                this.#tab_header.tabMenuChecked = visible;
            });
        };

        if (this.has_pcb) {
            this.#board_app = html`<kc-board-app>
            </kc-board-app>` as KCBoardAppElement;
            embed_to_tab(this.#board_app, TabKind.pcb);
            if (!this.#project.has_3d) {
                try {
                    this.#project
                        .get_file_text(
                            this.#project.get_first_page(AssertType.PCB)!
                                .filename,
                        )
                        .then((v) => {
                            if (v)
                                window.dispatchEvent(new BoardContentReady(v));
                        });
                } catch (e) {
                    alert(e);
                }
            }
        }

        if (this.has_sch) {
            this.#schematic_app = html`<kc-schematic-app>
            </kc-schematic-app>` as KCSchematicAppElement;
            this.#tab_contents[TabKind.sch] = this.#schematic_app;
            embed_to_tab(this.#schematic_app, TabKind.sch);
            this.#schematic_app.addEventListener(SheetLoadEvent.type, (e) => {
                this.#tab_header.dispatchEvent(new SheetLoadEvent(e.detail));
            });
        }

        if (this.has_3d) {
            this.#ov_d_app = new Online3dViewer();
            embed_to_tab(this.#ov_d_app, TabKind.step);
        }

        if (this.has_bom) {
            this.#bom_app = new BomApp();
            embed_to_tab(this.#bom_app, TabKind.bom);
        }

        this.#content = html` <div class="vertical">
            ${this.#tab_header}
            <div class="vertical">
                ${this.#board_app} ${this.#schematic_app} ${this.#bom_app}
                ${this.#ov_d_app}
            </div>
        </div>` as HTMLElement;

        return html` ${this.#content} ${this.#spinner} `;
    }
}

window.customElements.define("ecad-viewer", ECadViewer);

class EcadSourceElement extends CustomElement {
    constructor() {
        super();
        this.ariaHidden = "true";
        this.hidden = true;
        this.style.display = "none";
    }

    @attribute({ type: String })
    src: string | null;
}

window.customElements.define("ecad-source", EcadSourceElement);

class EcadBlobElement extends CustomElement {
    constructor() {
        super();
        this.ariaHidden = "true";
        this.hidden = true;
        this.style.display = "none";
    }

    @attribute({ type: String })
    filename: string;

    @attribute({ type: String })
    content: string;
}

window.customElements.define("ecad-blob", EcadBlobElement);

class Ov3dElement extends CustomElement {
    constructor() {
        super();
        this.ariaHidden = "true";
        this.hidden = true;
        this.style.display = "none";
    }

    @attribute({ type: String })
    src: string | null;
}
window.customElements.define("ecad-3d-source", Ov3dElement);
