/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DeferredPromise } from "../../../base/async";
import { delegate, listen } from "../../../base/events";
import {
    css,
    html,
    type ElementOrFragment,
} from "../../../base/web-components";
import { KCUISelectElement, KCUIElement } from "../../../kc-ui";
import type { KicadPCB, KicadSch } from "../../../kicad";
import {
    KiCanvasSelectEvent,
    TabMenuVisibleChangeEvent,
} from "../../../viewers/base/events";
import type { Viewer } from "../../../viewers/base/viewer";
import type { AssertType, Project } from "../../project";

// import dependent elements so they're registered before use.
import "./help-panel";
import "./preferences-panel";
import "./viewer-bottom-toolbar";
export type KicadAssert = KicadPCB | KicadSch;

interface ViewerElement extends HTMLElement {
    viewer: Viewer;
    load(src: KicadAssert): Promise<void>;
    disableinteraction: boolean;
}

export interface SourceSelection {
    idx: number;
    name: string;
}

/**
 * Common base class for the schematic, board, etc. apps.
 */
export abstract class KCViewerAppElement<
    ViewerElementT extends ViewerElement,
> extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
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
            .content_container {
                height: 100%;
                width: 100%;
            }
        `,
    ];
    #viewer_elm: ViewerElementT;
    #property_viewer: ElementOrFragment;
    #fitter_menu: HTMLElement;
    #placeholder = html`<ecad-spinner></ecad-spinner>` as HTMLElement;
    #content?: HTMLElement;

    public set tabMenuHidden(v: boolean) {
        this.#fitter_menu.hidden = v;
        this.dispatchEvent(
            new TabMenuVisibleChangeEvent(!this.#fitter_menu.hidden),
        );
    }

    public get tabMenuHidden() {
        return this.#fitter_menu.hidden;
    }

    project: Project;
    viewerReady: DeferredPromise<boolean> = new DeferredPromise<boolean>();

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.#viewer_elm.viewer;
    }

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            await this.project.loaded;
            super.connectedCallback();
        })();
    }

    abstract assert_type(): AssertType;

    override initialContentCallback() {
        // Listen for changes to the project's active page and load or hide
        // as needed.
        this.addDisposable(
            listen(this.project, "change", async (e) => {
                const page = this.project.get_first_page(this.assert_type());
                if (page) {
                    await this.load(page);
                }
            }),
        );

        // Handle item selection in the viewers.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                this.on_viewer_select(e.detail.item, e.detail.previous);
            }),
        );

        // Handle download button.
        delegate(this.renderRoot, "kc-ui-button", "click", (e) => {
            const target = e.target as KCUISelectElement;
            console.log("button", target);
            switch (target.name) {
                default:
                    console.warn("Unknown button", e);
            }
        });
    }

    protected abstract on_viewer_select(
        item?: unknown,
        previous?: unknown,
    ): void;

    protected abstract can_load(src: KicadAssert): boolean;

    override async load(src: KicadAssert) {
        await this.viewerReady;
        if (this.can_load(src)) {
            await this.#viewer_elm.load(src);
            if (this.#content) {
                this.#content.hidden = false;
            }
            this.#placeholder.hidden = true;
        } else {
            if (this.#content) {
                this.#content.hidden = true;
            }
            this.#placeholder.hidden = false;
        }
    }

    protected abstract make_property_element(): ElementOrFragment;

    protected abstract make_viewer_element(): ViewerElementT;

    protected abstract make_fitter_menu(): HTMLElement;

    protected render_viewer() {
        this.#fitter_menu = this.make_fitter_menu();
        this.#fitter_menu.hidden = true;
        this.#fitter_menu.addEventListener(
            TabMenuVisibleChangeEvent.type,
            (e: TabMenuVisibleChangeEvent) => {
                this.tabMenuHidden = e.detail;
            },
        );
        this.#viewer_elm = this.make_viewer_element();
        this.#property_viewer = this.make_property_element();
        return html`
            ${this.#fitter_menu} ${this.#viewer_elm} ${this.#property_viewer}
        `;
    }

    protected abstract do_render(): ElementOrFragment;

    override render() {
        this.#content = html`<div class="content_container">
            ${this.do_render()}
        </div>` as HTMLElement;
        this.#content.hidden = true;
        return html`${this.#content} ${this.#placeholder}`;
    }

    override renderedCallback(): void | undefined {
        window.requestAnimationFrame(() => {
            this.viewerReady.resolve(true);
        });
    }
}
