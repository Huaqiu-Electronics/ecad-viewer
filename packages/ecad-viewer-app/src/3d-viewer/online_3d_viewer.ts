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
    _pending_3d_url: string | null = null;
    _loaded = false;

    get renderer_element() {
        return this._viewer_container?.renderer_element;
    }

    get canvas() {
        return this._canvas;
    }

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
                console.log("[3DViewer] Online3dViewerUrlReady received, viewer_container ready:", !!this._viewer_container);
                if (this._viewer_container) {
                    this._load_src(evt.detail);
                } else {
                    this._pending_3d_url = evt.detail;
                }
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
            const url = this._pending_3d_url || this.project.ov_3d_url;
            console.log("[3DViewer] initialContentCallback, url:", url ? "found" : "not found");
            if (url) this._load_src(url);
        });
    }

    public on_show() {
        if (!this._viewer_container) {
            console.log("[3DViewer] on_show skipped: viewer not initialized");
            return;
        }
        requestAnimationFrame(() => {
            const w = this.clientWidth;
            const h = this.clientHeight;
            console.log("[3DViewer] on_show resize:", w, "x", h);
            if (w === 0 || h === 0) {
                console.log("[3DViewer] on_show skipped: element not visible");
                return;
            }
            this._viewer_container.resize();
        });
    }

    async _load_src(url: string) {
        if (this._loaded) {
            console.log("[3DViewer] _load_src skipped: already loaded");
            return;
        }
        if (!this._viewer_container) {
            console.log("[3DViewer] _load_src deferred: viewer not ready, storing URL");
            this._pending_3d_url = url;
            return;
        }
        this._loaded = true;
        console.log("[3DViewer] _load_src loading model from URL");
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
