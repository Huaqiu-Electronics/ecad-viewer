import { later } from "../base/async";
import { css, html } from "../base/web-components";
import { KCUIElement } from "../kc-ui/element";
import type { Project } from "../kicanvas/project";
import {
    Online3dViewerLoaded,
    Online3dViewerUrlReady,
} from "../viewers/base/events";
import { Viewer } from "./viewer";

export class Online3dViewer extends KCUIElement {
    _loader: HTMLElement;
    _canvas: HTMLElement;
    _viewer_container: Viewer;
    project: Project;

    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                height: 100%;
                width: 100%;
            }
        `,
    ];

    constructor() {
        super();

        window.addEventListener(
            Online3dViewerUrlReady.type,
            (evt: Online3dViewerUrlReady) => {
                this._load_src(evt.detail);
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
            if (this.project.ov_3d_url) this._load_src(this.project.ov_3d_url);
        });
    }
    public on_show() {
        this._viewer_container.resize();
    }

    async _load_src(url: string) {
        await this._viewer_container.load(url, new Map());
        URL.revokeObjectURL(url);
        this.project.dispatchEvent(new Online3dViewerLoaded());
        this.on_show();
    }

    override render() {
        this._viewer_container = new Viewer(this);
        this._canvas = this._viewer_container.renderer.domElement;
        return html` ${this._canvas}`;
    }
}

window.customElements.define("ecad-3d-viewer", Online3dViewer);
