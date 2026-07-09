import { later } from "../base/async";
import { Vec2 } from "../base/math";
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
import { type EcadBlob, type EcadSources } from "../kicanvas/services/vfs";
import { KCBoardAppElement } from "../kicanvas/elements/kc-board/app";
import { KCSchematicAppElement } from "../kicanvas/elements/kc-schematic/app";
import { BomApp } from "../kicanvas/elements/bom/app";
import { KicadSch } from "../kicad";

import { is_3d_model, is_kicad, TabHeaderElement } from "./tab_header";
import {
    BoardContentReady,
    CommentClickEvent,
    ImageExportRequestEvent,
    ImageExportResultEvent,
    LoadZipEvent,
    LoadZipErrorEvent,
    Online3dViewerLoaded,
    OpenBarrierEvent,
    SheetLoadEvent,
    TabActivateEvent,
    TabMenuClickEvent,
    TabMenuVisibleChangeEvent,
} from "../viewers/base/events";

export {
    CommentClickEvent,
    TabActivateEvent,
    SheetLoadEvent,
} from "../viewers/base/events";

import { TabKind } from "./constraint";
import type { InputContainer } from "./input_container";
import type { Online3dViewer } from "../3d-viewer/online_3d_viewer";
import "../kc-ui/spinner";
import { show_ecad_viewer } from "../eda_host/show_ecad_viewer";
import "./ecad_viewer_global";
import { ZipUtils } from "../utils/zip_utils";
import { length } from "../base/iterator";
import { HQ_LOGO } from "../kc-ui/hq_logo";

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

            .bottom-left-icon {
                position: absolute;
                bottom: 16px;
                left: 16px; /* Adjusted to place it on the bottom-left */
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                background-color: transparent;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                text-decoration: none;
                color: var(--fg);
                transition:
                    transform 0.2s ease-in-out,
                    box-shadow 0.2s ease-in-out;
            }

            .bottom-left-icon:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
        `,
    ];

    constructor() {
        super();
        this.addDisposable(this.#project);
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
    #active_tab: TabKind = TabKind.pcb;
    #project: Project = new Project();
    #schematic_app: KCSchematicAppElement;
    #ov_d_app: Online3dViewer;
    #board_app: KCBoardAppElement;
    #bom_app: BomApp;
    #tab_header: TabHeaderElement;
    #file_input: HTMLInputElement;
    #spinner: HTMLElement;
    #content: HTMLElement;
    #step_viewer_placeholder: HTMLElement;
    #viewers_container: HTMLDivElement;
    #is_full_screen = false;
    get project() {
        return this.#project;
    }

    @attribute({ type: Boolean })
    public loading: boolean;

    @attribute({ type: Boolean })
    public loaded: boolean;

    /**
     * When true, clicking on the viewer dispatches CommentClickEvent
     * instead of selecting items. Used for design review commenting.
     */
    @attribute({ type: Boolean })
    public "comment-mode": boolean;

    /**
     * Enable or disable comment mode programmatically.
     * When enabled, clicks dispatch CommentClickEvent with coordinates.
     */
    public setCommentMode(enabled: boolean): void {
        this["comment-mode"] = enabled;

        // Helper to forward CommentClickEvent from internal viewer to this element
        const forwardEvent = (event: Event) => {
            const e = event as CommentClickEvent;
            // Re-dispatch the event from this element so React can listen
            this.dispatchEvent(new CommentClickEvent(e.detail));
        };

        if (this.#board_app?.viewer) {
            const viewer = this.#board_app.viewer as any;
            viewer.commentModeEnabled = enabled;
            if (enabled) {
                viewer.addEventListener(CommentClickEvent.type, forwardEvent);
            } else {
                viewer.removeEventListener(
                    CommentClickEvent.type,
                    forwardEvent,
                );
            }
        }

        if (this.#schematic_app?.viewer) {
            const viewer = this.#schematic_app.viewer as any;
            viewer.commentModeEnabled = enabled;
            if (enabled) {
                viewer.addEventListener(CommentClickEvent.type, forwardEvent);
            } else {
                viewer.removeEventListener(
                    CommentClickEvent.type,
                    forwardEvent,
                );
            }
        }
    }

    /**
     * Move the camera to a specific location (in world coordinates)
     */
    public zoomToLocation(x: number, y: number): void {
        const pos = new Vec2(x, y);
        // Helper to move camera on a viewer
        const moveCamera = (viewer: any) => {
            if (viewer?.viewport?.camera) {
                viewer.viewport.camera.center.set(pos.x, pos.y);
                viewer.draw();
            }
        };

        if (this.#board_app?.viewer) {
            moveCamera(this.#board_app.viewer);
        }
        if (this.#schematic_app?.viewer) {
            moveCamera(this.#schematic_app.viewer);
        }
    }

    /**
     * Switch to a specific schematic page (by filename or sheet path)
     */
    public switchPage(pageId: string): void {
        if (!this.#schematic_app) return;

        // Ensure we are on the schematic tab
        if (this.#tab_header) {
            // We can't easily programmatically click the tab header without exposing it or duplicating logic,
            // but we can simulate the tab switch if needed.
            // Ideally ecad-viewer should expose a method to set active tab.
            // For now, let's assume the caller handles tab switching or we just switch the internal view.
        }

        const project = this.#project;
        // Try to find by filename first
        const sch = project.file_by_name(pageId);
        if (sch) {
            this.#schematic_app.viewer.load(sch as any);
            return;
        }

        // Try to find by sheet path/UUID if needed - but filename is usually sufficient for now
        console.warn(`switchPage: Could not find page with ID ${pageId}`);
    }

    /**
     * Get screen coordinates from world coordinates
     */
    public getScreenLocation(
        x: number,
        y: number,
    ): { x: number; y: number } | null {
        const pos = new Vec2(x, y);

        let viewer: any = null;
        if (this.#active_tab === TabKind.pcb && this.#board_app) {
            viewer = this.#board_app.viewer;
        } else if (this.#active_tab === TabKind.sch && this.#schematic_app) {
            viewer = this.#schematic_app.viewer;
        } else {
            // Fallback
            viewer = (this.#board_app?.viewer ||
                this.#schematic_app?.viewer) as any;
        }

        if (viewer?.viewport?.camera) {
            // Note: Camera2 uses snake_case world_to_screen
            const screenPos = viewer.viewport.camera.world_to_screen(pos);
            return { x: screenPos.x, y: screenPos.y };
        }
        return null;
    }

    public async exportImage(
        viewType: 'SCH' | 'PCB' | '3D' | 'BOM' = this.#active_tab as 'SCH' | 'PCB' | '3D' | 'BOM',
    ): Promise<{ image: string; width: number; height: number } | null> {
        await this.loaded;

        const tabKind = this.#viewTypeToTabKind(viewType);
        const currentTab = this.#active_tab;
        const needSwitch = currentTab !== tabKind;

        if (needSwitch) {
            await this.#switchToTab(tabKind);
        }

        let result: { image: string; width: number; height: number } | null = null;

        switch (viewType) {
            case 'PCB': {
                const boardViewer = this.#board_app?.viewer;
                if (boardViewer?.canvas) {
                    const canvas = boardViewer.canvas as HTMLCanvasElement;
                    
                    if (canvas.width === 0 || canvas.height === 0) {
                        return null;
                    }
                    
                    if (typeof boardViewer.draw === 'function') {
                        boardViewer.draw();
                    }
                    
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    
                    result = {
                        image: canvas.toDataURL('image/png'),
                        width: canvas.width,
                        height: canvas.height,
                    };
                }
                break;
            }
            case 'SCH': {
                const schViewer = this.#schematic_app?.viewer;
                if (schViewer?.canvas) {
                    const schematics = Array.from(this.#project?.schematics() || []);
                    
                    if (schematics.length > 1) {
                        const images: Array<{ image: string; width: number; height: number; name: string }> = [];
                        const originalSheet = (schViewer as any).sch_name;
                        
                        for (const sch of schematics) {
                            if (sch instanceof KicadSch) {
                                await this.#schematic_app.viewer.load(sch);
                                await new Promise(resolve => requestAnimationFrame(resolve));
                                
                                const canvas = schViewer.canvas as HTMLCanvasElement;
                                images.push({
                                    image: canvas.toDataURL('image/png'),
                                    width: canvas.width,
                                    height: canvas.height,
                                    name: sch.filename,
                                });
                            }
                        }
                        
                        if (originalSheet) {
                            const originalSch = this.#project.file_by_name(originalSheet);
                            if (originalSch instanceof KicadSch) {
                                await this.#schematic_app.viewer.load(originalSch);
                            }
                        }
                        
                        result = {
                            image: JSON.stringify(images),
                            width: 0,
                            height: 0,
                        };
                    } else {
                        const canvas = schViewer.canvas as HTMLCanvasElement;
                        result = {
                            image: canvas.toDataURL('image/png'),
                            width: canvas.width,
                            height: canvas.height,
                        };
                    }
                }
                break;
            }
            case '3D': {
                const viewer3d = this.#ov_d_app;
                if (viewer3d?._viewer_container) {
                    const renderer = viewer3d._viewer_container.renderer;
                    if (renderer) {
                        renderer.render(
                            viewer3d._viewer_container.scene,
                            viewer3d._viewer_container.activeCamera
                        );
                        
                        const canvas = renderer.domElement;
                        result = {
                            image: canvas.toDataURL('image/png'),
                            width: canvas.width,
                            height: canvas.height,
                        };
                    }
                }
                break;
            }
            case 'BOM': {
                const bomItems = this.#project?.bom_items;
                if (bomItems && bomItems.length > 0) {
                    const padding = 20;
                    const rowHeight = 28;
                    const headerHeight = 32;
                    const colWidths = [50, 140, 350, 160, 200, 70];
                    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + padding * 2;
                    const totalHeight = headerHeight + (bomItems.length + 1) * rowHeight + padding * 2;
                    
                    const canvas = document.createElement('canvas');
                    const dpr = window.devicePixelRatio || 1;
                    canvas.width = totalWidth * dpr;
                    canvas.height = totalHeight * dpr;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        ctx.scale(dpr, dpr);
                        
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, totalWidth, totalHeight);
                        
                        ctx.fillStyle = '#666';
                        ctx.fillRect(padding, padding, totalWidth - padding * 2, headerHeight);
                        
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        
                        const headers = ['No', 'Value', 'Description', 'Footprint', 'Designator', 'Quantity'];
                        let x = padding + 8;
                        headers.forEach((header, index) => {
                            ctx.fillText(header, x, padding + headerHeight / 2);
                            x += colWidths[index] ?? 0;
                        });
                        
                        ctx.fillStyle = '#333';
                        ctx.font = '11px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        
                        let y = padding + headerHeight;
                        bomItems.forEach((item, index) => {
                            if (index % 2 === 0) {
                                ctx.fillStyle = '#f9f9f9';
                                ctx.fillRect(padding, y, totalWidth - padding * 2, rowHeight);
                            }
                            
                            ctx.fillStyle = '#333';
                            let x = padding + 8;
                            
                            ctx.fillText(String(index + 1), x, y + rowHeight / 2);
                            x += colWidths[0] ?? 0;
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x - 8, y, colWidths[1] ?? 0, rowHeight);
                            ctx.clip();
                            ctx.fillText(item.Name || '', x, y + rowHeight / 2);
                            ctx.restore();
                            x += colWidths[1] ?? 0;
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x - 8, y, colWidths[2] ?? 0, rowHeight);
                            ctx.clip();
                            ctx.fillText(item.Description || '', x, y + rowHeight / 2);
                            ctx.restore();
                            x += colWidths[2] ?? 0;
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x - 8, y, colWidths[3] ?? 0, rowHeight);
                            ctx.clip();
                            ctx.fillText(item.Footprint || '', x, y + rowHeight / 2);
                            ctx.restore();
                            x += colWidths[3] ?? 0;
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x - 8, y, colWidths[4] ?? 0, rowHeight);
                            ctx.clip();
                            ctx.fillText(item.Reference || '', x, y + rowHeight / 2);
                            ctx.restore();
                            x += colWidths[4] ?? 0;
                            
                            ctx.fillText(String(item.Qty), x, y + rowHeight / 2);
                            
                            y += rowHeight;
                        });
                        
                        const totalQty = bomItems.reduce((sum, item) => sum + item.Qty, 0);
                        ctx.fillStyle = '#666';
                        ctx.fillRect(padding, y, totalWidth - padding * 2, rowHeight);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.fillText(`Total: ${totalQty} Price: N/A`, totalWidth - padding - 8, y + rowHeight / 2);
                        
                        result = {
                            image: canvas.toDataURL('image/png'),
                            width: canvas.width,
                            height: canvas.height,
                        };
                    }
                }
                break;
            }
        }

        if (needSwitch && currentTab !== tabKind) {
            await this.#switchToTab(currentTab);
        }

        return result;
    }

    #viewTypeToTabKind(viewType: 'SCH' | 'PCB' | '3D' | 'BOM'): TabKind {
        switch (viewType) {
            case 'PCB': return TabKind.pcb;
            case 'SCH': return TabKind.sch;
            case '3D': return TabKind.step;
            case 'BOM': return TabKind.bom;
            default: return TabKind.pcb;
        }
    }

    async #switchToTab(tabKind: TabKind): Promise<void> {
        return new Promise((resolve) => {
            const tabButtons = this.#tab_header?.shadowRoot?.querySelectorAll('tab-button');
            if (tabButtons) {
                tabButtons.forEach((btn) => {
                    if (btn.textContent?.trim().toUpperCase() === tabKind) {
                        (btn as HTMLElement).click();
                    }
                });
            }
            
            const checkTab = () => {
                if (this.#active_tab === tabKind) {
                    resolve();
                } else {
                    setTimeout(checkTab, 50);
                }
            };
            setTimeout(checkTab, 100);
        });
    }

    attributeChangedCallback(
        name: string,
        old_value: string,
        new_value: string,
    ) {
        // super.attributeChangedCallback(name, old_value, new_value);
        // Sync comment-mode attribute to viewer's commentModeEnabled property
        // Only update if loaded (viewers exist)
        if (name === "comment-mode" && this.loaded) {
            const enabled = new_value !== null && new_value !== "false";
            this.setCommentMode(enabled);
        }
    }
    override initialContentCallback() {
        this.#setup_events();
        later(() => {
            this.load_src();
        });
    }

    async #setup_events() {
        // Listen for ZIP blob received via postMessage
        window.addEventListener(LoadZipEvent.type, async (e) => {
            const event = e as LoadZipEvent;
            const blob = event.detail;
            // Dispose current project and load new one
            await this.load_zip(blob);
        });

        window.addEventListener(ImageExportRequestEvent.type, async (e) => {
            const event = e as ImageExportRequestEvent;
            let viewType: 'SCH' | 'PCB' | '3D' | 'BOM' = this.#active_tab as 'SCH' | 'PCB' | '3D' | 'BOM';
            
            if (typeof event.detail === 'string') {
                viewType = event.detail as 'SCH' | 'PCB' | '3D' | 'BOM';
            } else if (event.detail && typeof event.detail === 'object' && 'viewType' in event.detail && event.detail.viewType) {
                viewType = event.detail.viewType;
            }
        
            const result = await this.exportImage(viewType);
            if (result) {
                window.parent.postMessage(
                    {
                        type: ImageExportResultEvent.type,
                        detail: {
                            viewType: viewType,
                            imageData: result.image,
                            width: result.width,
                            height: result.height,
                            timestamp: Date.now(),
                        },
                    },
                    '*',
                );
            }
        });
    }

    async load_zip(file: Blob) {
        // Dispose current project (queueing: newest wins)
        this.#project.dispose();

        try {
            const files = await ZipUtils.unzipFile(file);
            const readFilePromises = Array.from(files).map((file) =>
                this.readFile(file),
            );

            const blobs: EcadBlob[] = [];

            const results = await Promise.all(readFilePromises);

            let idx = -1;
            results.forEach(({ name, content }) => {
                idx = idx + 1;
                const names = name.split("/");
                name = names[names.length - 1]!;

                if (is_kicad(name)) {
                    blobs.push({ filename: name, content });
                } else if (is_3d_model(name)) {
                    this.#project.ov_3d_url = URL.createObjectURL(files[idx]!);
                }
            });

            await this.#setup_project({ urls: [], blobs });
        } catch (error) {
            console.error("Error while loading ZIP:", error);
            // Dispatch error event for iframe bridge to handle
            const errorMessage = error instanceof Error ? error.message : "Unknown error while loading ZIP";
            window.dispatchEvent(new LoadZipErrorEvent(errorMessage));
        }
    }

    private readFile(file: File): Promise<{ name: string; content: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) =>
                resolve({
                    name: file.name,
                    content: e.target!.result as string,
                });
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    async load_window_zip_url(url: string) {
        return this.load_zip(await (await fetch(url)).blob());
    }

    async load_src() {
        if (window.zip_url) {
            return this.load_window_zip_url(window.zip_url);
        }
        if (window.design_urls) {
            const do_load_glb = () => {
                if (window.design_urls?.glb_url) {
                    this.load_window_zip_url(window.design_urls.glb_url);
                }
            };

            const do_load_pcb = () => {
                if (window.design_urls?.pcb_url) {
                    this.load_window_zip_url(window.design_urls.pcb_url).then(
                        () => {
                            do_load_glb();
                        },
                    );
                }
            };

            if (window.design_urls.sch_url) {
                await this.load_window_zip_url(window.design_urls.sch_url);
                if (window.design_urls.pcb_url) return do_load_pcb();
                if (window.design_urls.glb_url) return do_load_glb();
            }

            if (window.design_urls.pcb_url) {
                return do_load_pcb();
            }

            if (window.design_urls.glb_url) {
                return do_load_glb();
            }
        }

        const urls = [];
        const blobs: EcadBlob[] = [];

        for (const src_elm of this.querySelectorAll<EcadSourceElement>(
            "ecad-source",
        )) {
            if (src_elm.src) {
                urls.push(src_elm.src);
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

        await this.#setup_project({ urls, blobs });
    }

    async #setup_project(sources: EcadSources) {
        this.loaded = false;
        this.loading = true;

        try {
            await this.#project.load(sources);

            this.loaded = true;
            await this.update();
            this.#project.on_loaded();
        } catch (error) {
            console.error("Error while setting up project:", error);
            // Dispatch error event for iframe bridge to handle
            const errorMessage = error instanceof Error ? error.message : "Unknown error while setting up project";
            window.dispatchEvent(new LoadZipErrorEvent(errorMessage));
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

    get sch_count() {
        return length(this.#project.schematics());
    }
    get has_bom() {
        return this.has_pcb || this.has_sch;
    }
    on_full_windows() {
        if (window.is_module_lib) {
            console.log("is_module_lib " + window.is_module_lib);
            return show_ecad_viewer();
        }

        if (!this.#is_full_screen) {
            window.document.documentElement.requestFullscreen();
            this.#is_full_screen = true;
        } else {
            window.document.exitFullscreen();
            this.#is_full_screen = false;
        }
        if (this.#ov_d_app) this.#ov_d_app.on_show();
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
            sch_count: this.sch_count,
            has_bom: this.has_bom,
        });

        if (window.hide_header) {
            this.#tab_header.hidden = true;
        }

        this.#tab_header.input_container = this;
        this.#tab_header.addEventListener(TabActivateEvent.type, (event) => {
            const tab = (event as TabActivateEvent).detail;
            this.#active_tab = tab.current;
            this.dispatchEvent(new TabActivateEvent(tab));
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

            if (tab.current === TabKind.step) {
                if (this.#ov_d_app) this.#ov_d_app.on_show();
                else {
                    (async () => {
                        // @ts-expect-error its imported from map
                        await import("3d-viewer");
                        this.#ov_d_app =
                            html`<ecad-3d-viewer></ecad-3d-viewer>` as Online3dViewer;
                        this.#viewers_container.appendChild(this.#ov_d_app);
                        const page = embed_to_tab(this.#ov_d_app, TabKind.step);
                        page.classList.add("active");
                        page.style.display = "none";
                    })();
                }
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
            return page;
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
                // Re-dispatch from viewer so visualizer can track active sheet
                this.dispatchEvent(new SheetLoadEvent(e.detail));
            });
        }

        if (this.has_3d) {
            this.#step_viewer_placeholder =
                html`<ecad-spinner></ecad-spinner>` as HTMLElement;
            embed_to_tab(this.#step_viewer_placeholder, TabKind.step);
            this.project.addEventListener(Online3dViewerLoaded.type, () => {
                this.#step_viewer_placeholder.hidden = true;
                this.#ov_d_app.style.display = "";
            });
        }
        if (this.has_bom) {
            this.#bom_app = new BomApp();
            embed_to_tab(this.#bom_app, TabKind.bom);
        }

        this.#viewers_container = html` <div class="vertical">
            ${this.#board_app} ${this.#schematic_app} ${this.#bom_app}
            ${this.#step_viewer_placeholder}
        </div>` as HTMLDivElement;

        this.#content = html` <div class="vertical">
            ${this.#tab_header} ${this.#viewers_container}
            <a
                href=${window.ai_url}
                class="bottom-left-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit EDA website">
                ${HQ_LOGO}
            </a>
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
