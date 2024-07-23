import { css, html } from "../base/web-components";
import { KCUIElement } from "../kc-ui/element";
import { ZipUtils } from "../utils/zip_utils";
import {
    TabMenuClickEvent,
    TabActivateEvent,
    SheetLoadEvent,
    OpenBarrierEvent,
} from "../viewers/base/events";
import { Sections, TabKind } from "./constraint";
import type { InputContainer } from "./input_container";

export interface TabData {
    title: string;
    content: HTMLElement;
}

const is_ad = (name: string) =>
    name.endsWith(".SchDoc") || name.endsWith(".PcbDoc");

const is_kicad = (name: string) =>
    name.endsWith(".kicad_pcb") || name.endsWith(".kicad_sch");

export class TabHeaderElement extends KCUIElement {
    #elements: Map<Sections, Map<TabKind, HTMLElement>>;
    #current_tab?: TabKind;
    #open_file_btn = html` <tab-button
        icon="svg:open_file"
        class="end"
        title="Open local file">
    </tab-button>` as HTMLElement;

    public constructor(
        public option: {
            has_3d: boolean;
            has_pcb: boolean;
            has_sch: boolean;
            has_bom: boolean;
            cli_server_addr: string | null;
        },
    ) {
        super();
    }

    public set tabMenuChecked(activate: boolean) {
        this.#elements
            .get(Sections.beginning)!
            .get(this.#current_tab!)
            ?.classList.toggle("checked", activate);
    }

    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                height: 2em;
                width: 100%;
                flex: 1;
                display: flex;
                background-color: var(--panel-bg);
            }
            .horizontal-bar {
                display: flex;
                height: 100%;
                width: 100%;

                background-color: transparent;
                overflow: hidden;
            }

            .bar-section {
                height: 100%;
                flex: 1;
            }

            .beginning {
                background-color: var(--panel-bg);
                display: flex;
                align-items: left;
                justify-content: left;
            }

            .middle {
                background-color: var(--panel-bg);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .end {
                background-color: var(--panel-bg);
                display: flex;
                align-items: right;
                justify-content: right;
            }

            .menu {
                display: none;
            }

            .menu.active {
                display: block;
            }

            tab-button.tab {
                height: 100%;
                border: none;
                width: 48px;
            }

            tab-button.beginning {
                height: 100%;
                min-width: 120px;
                display: none;
            }

            tab-button.end {
                height: 100%;
                width: 32px;
            }

            tab-button.beginning.active {
                height: 100%;
                display: block;
            }
        `,
    ];

    protected get sch_button() {
        return this.#elements.get(Sections.beginning)!.get(TabKind.sch)!;
    }
    make_ecad_view = () =>
        html`<ecad-viewer cli_server_addr="${this.option.cli_server_addr}">
        </ecad-viewer>`;

    async load_zip_content(input_container: InputContainer, file: Blob) {
        // All files have been read successfully
        const parent = input_container.target.parentElement;
        const ecad_view = this.make_ecad_view();
        const designs = await ZipUtils.unzipFile(file);

        Object.entries(designs).forEach(([name, content]) => {
            if (is_kicad(name))
                ecad_view.appendChild(
                    html`<ecad-blob
                        filename="${name}"
                        content="${content}"></ecad-blob>`,
                );
        });

        if (!parent) throw new Error("Parent element not found");

        parent.removeChild(input_container.target);
        parent.appendChild(ecad_view);
    }

    public set input_container(input_container: InputContainer) {
        this.#open_file_btn.addEventListener("click", () => {
            input_container.input.click();
        });
        input_container.input.addEventListener("change", async (e) => {
            const readFiles = () => {
                const readFile = (file: any) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();

                        reader.onload = function (e) {
                            const content = e.target!.result;
                            resolve({
                                name: file.name,
                                content: content,
                            });
                        };

                        reader.onerror = function (error) {
                            reject(error);
                        };

                        reader.readAsText(file);
                    });
                };
                const files = (e.target! as any).files;

                const design_to_converted: any[] = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.name.endsWith(".zip"))
                        return this.load_zip_content(input_container, file);

                    if (!is_ad(file.name)) continue;
                    design_to_converted.push(file);
                }

                if (design_to_converted.length && this.option.cli_server_addr) {
                    this.dispatchEvent(new OpenBarrierEvent());
                    //  Post the files to the server
                    const form_data = new FormData();
                    for (const form_file of design_to_converted) {
                        form_data.append("files", form_file);
                        form_data.append("file_names", form_file.name);
                    }

                    try {
                        fetch(this.option.cli_server_addr, {
                            method: "POST",
                            body: form_data,
                        }).then((response) => {
                            if (!response.ok) {
                                throw new Error(
                                    `HTTP error! status: ${response.status}`,
                                );
                            }
                            response.json().then((j) => {
                                const parent =
                                    input_container.target.parentElement;

                                const ecad_view = this.make_ecad_view();

                                (j["files"] as string[]).forEach((url) => {
                                    ecad_view.appendChild(
                                        html`<ecad-source
                                            src="${url}"></ecad-source>`,
                                    );
                                });
                                if (parent) {
                                    parent.removeChild(input_container.target);
                                    parent.appendChild(ecad_view);
                                }
                            });
                        });
                    } catch (e) {
                        console.log(e);
                    }
                    return;
                }

                // Create an array of promises for each file reading operation
                const promises = Array.from(files).map((file) =>
                    readFile(file),
                );

                // Use Promise.all to wait for all promises to resolve
                Promise.all(promises)
                    .then((results) => {
                        // All files have been read successfully
                        const parent = input_container.target.parentElement;
                        const ecad_view = this.make_ecad_view();
                        (
                            results as [{ name: string; content: string }]
                        ).forEach(({ name, content }) => {
                            if (is_kicad(name))
                                ecad_view.appendChild(
                                    html`<ecad-blob
                                        filename="${name}"
                                        content="${content}"></ecad-blob>`,
                                );
                        });
                        if (parent) {
                            parent.removeChild(input_container.target);
                            parent.appendChild(ecad_view);
                        }
                    })
                    .catch((error) => {
                        console.error("Error reading files:", error);
                    });
            };
            readFiles();
        });
    }

    private createSection(sectionClass: Sections): HTMLDivElement {
        const section = document.createElement("div");
        section.classList.add("bar-section", sectionClass);

        const make_middle = (kind: TabKind) => {
            const btn = html` <tab-button>${kind}</tab-button> ` as HTMLElement;
            btn.classList.add("tab");
            this.#elements.get(sectionClass)?.set(kind, btn);
            return btn;
        };

        const make_beginning = (kind: TabKind) => {
            const icon_map = {
                [TabKind.pcb]: "svg:layers",
                [TabKind.sch]: "svg:page",
                [TabKind.step]: "svg:layers",
                [TabKind.bom]: "svg:layers",
            };

            const icon = html` <tab-button icon="${icon_map[kind]}">
                ${kind}
            </tab-button>` as HTMLElement;
            icon.classList.add("beginning");
            this.#elements.get(sectionClass)?.set(kind, icon);
            return icon;
        };

        switch (sectionClass) {
            case Sections.beginning:
                {
                    if (this.option.has_pcb)
                        section.appendChild(make_beginning(TabKind.pcb));
                    if (this.option.has_sch)
                        section.appendChild(make_beginning(TabKind.sch));
                    if (this.option.has_3d)
                        section.appendChild(make_beginning(TabKind.step));
                    if (this.option.has_bom)
                        section.appendChild(make_beginning(TabKind.bom));
                }
                break;
            case Sections.middle:
                {
                    if (this.option.has_sch)
                        section.appendChild(make_middle(TabKind.sch));
                    if (this.option.has_pcb)
                        section.appendChild(make_middle(TabKind.pcb));
                    if (this.option.has_3d)
                        section.appendChild(make_middle(TabKind.step));
                    if (this.option.has_bom)
                        section.appendChild(make_middle(TabKind.bom));
                }
                break;
            case Sections.end:
                {
                    const download = html` <tab-button
                        title="Download"
                        icon="svg:download"
                        class="end">
                    </tab-button>` as HTMLElement;

                    const full_screen = html` <tab-button
                        title="Switch full screen mode"
                        icon="svg:full_screen"
                        class="end">
                    </tab-button>` as HTMLElement;

                    section.appendChild(this.#open_file_btn);
                    section.appendChild(download);
                    section.appendChild(full_screen);
                }
                break;
        }

        return section;
    }

    override renderedCallback(): void | undefined {
        if (this.#elements.size) {
            if (this.option.has_pcb) {
                this.activateTab(TabKind.pcb);
            } else if (this.option.has_sch) {
                this.activateTab(TabKind.sch);
            } else if (this.option.has_3d) {
                this.activateTab(TabKind.step);
            } else if (this.option.has_bom) {
                this.activateTab(TabKind.bom);
            }
        }
    }

    private activateTab(kind: TabKind) {
        if (this.#current_tab === kind) return;

        for (const [section, elements] of this.#elements) {
            switch (section) {
                case Sections.beginning:
                    {
                        for (const [k, v] of elements) {
                            if (k === kind) v.classList.add("active");
                            else v.classList.remove("active");
                        }
                    }
                    break;
                case Sections.middle:
                    {
                        for (const [k, v] of elements) {
                            if (k === kind) v.classList.add("checked");
                            else v.classList.remove("checked");
                        }
                    }
                    break;
            }
        }

        this.dispatchEvent(
            new TabActivateEvent({
                previous: this.#current_tab,
                current: kind,
            }),
        );
        this.#current_tab = kind;
    }

    on_menu_closed() {
        const mene = this.#elements.get(Sections.beginning);
        if (mene) {
            for (const [, v] of mene) {
                v.classList.remove("active");
            }
        }
    }

    override initialContentCallback(): void {
        super.initialContentCallback();
        this.#elements.forEach((section, sectionClass) => {
            section.forEach((element, kind) => {
                switch (sectionClass) {
                    case Sections.beginning:
                        {
                            element.addEventListener("click", () => {
                                for (const [, v] of section) {
                                    v.classList.remove("checked");
                                }
                                element.classList.add("checked");
                                this.dispatchEvent(new TabMenuClickEvent(kind));
                            });
                        }
                        break;
                    case Sections.middle: {
                        element.addEventListener("click", () => {
                            this.activateTab(kind);
                        });
                        break;
                    }
                }
            });
        });

        this.addEventListener(SheetLoadEvent.type, (e) => {
            this.sch_button.textContent = e.detail;
        });
    }

    override render() {
        this.#elements = new Map();
        // Create the container for the header
        const container = html`<div class="horizontal-bar"></div>`;
        for (const v of Object.values(Sections)) {
            this.#elements.set(v, new Map());
            container.appendChild(this.createSection(v));
        }

        return html` ${container} `;
    }
}

window.customElements.define("tab-header", TabHeaderElement);
