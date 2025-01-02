import { later } from "../base/async";
import { css, html } from "../base/web-components";
import { KCUIElement } from "../kc-ui";
import type { Project } from "../kicanvas/project";
import { Online3dViewerUrlReady } from "../viewers/base/events";
import { Viewer } from "./viewer";

export class Online3dViewer extends KCUIElement {
    #canvas: HTMLElement;
    #viewer_container: Viewer;
    #spinner: HTMLElement;
    project: Project;

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

    constructor() {
        super();

        window.addEventListener(
            Online3dViewerUrlReady.type,
            (evt: Online3dViewerUrlReady) => {
                this.#load_src(evt.detail);
            },
        );
    }

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            await this.project.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        later(() => {
            if (this.project.has_3d) this.#load_src(this.project.ov_3d_url!);
            else {
                this.#show_loader(true);
            }
            this.addEventListener("resize", () => {
                this.on_show();
            });
        });
    }
    public on_show() {
        this.#viewer_container.resize();
    }

    async #load_src(url: string) {
        this.#viewer_container.load(url, new Map()).then(() => {
            URL.revokeObjectURL(url);
        });
        this.#show_loader(false);
        this.on_show();
    }

    #show_loader(show: boolean) {
        this.#canvas.style.display = show ? "none" : "block";
        this.#spinner.style.display = show ? "block" : "none";
    }

    override render() {
        this.#viewer_container = new Viewer(this);
        this.#canvas = this.#viewer_container.renderer.domElement;
        this.#spinner = html`<ecad-spinner></ecad-spinner>` as HTMLElement;
        return html` ${this.#canvas}${this.#spinner}`;
    }
}

window.customElements.define("ecad-3d-viewer", Online3dViewer);
