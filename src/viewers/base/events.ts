/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { TabKind } from "../../ecad-viewer/constraint";
import type { ComponentERCResult } from "../../proto/component_erc_result";
import type { ProjectErcResult } from "../../proto/project_erc_result";

class KiCanvasEvent<T> extends CustomEvent<T> {
    constructor(name: string, detail: T, bubbles = false) {
        super(name, { detail: detail, composed: true, bubbles: bubbles });
    }
}

export class KiCanvasLoadEvent extends KiCanvasEvent<null> {
    static readonly type = "kicanvas:load";

    constructor() {
        super(KiCanvasLoadEvent.type, null);
    }
}

interface SelectDetails {
    item: unknown;
    previous: unknown;
}

interface SelectedItems {
    text: string;
    apiId: number;
}

export class KiCanvasAiSelectEvent extends KiCanvasEvent<SelectedItems> {
    static readonly type = "kicanvas:ai-select";

    constructor(detail: SelectedItems) {
        super(KiCanvasAiSelectEvent.type, detail, true);
    }
}

export class KiCanvasSelectEvent extends KiCanvasEvent<SelectDetails> {
    static readonly type = "kicanvas:select";

    constructor(detail: SelectDetails) {
        super(KiCanvasSelectEvent.type, detail, true);
    }
}

interface FitterSelections {
    items: unknown[];
}

export class KiCanvasContextMenuEvent extends KiCanvasEvent<FitterSelections> {
    static readonly type = "kicanvas:context-selection";

    constructor(detail: FitterSelections) {
        super(KiCanvasContextMenuEvent.type, detail, true);
    }
}

export class KiCanvasSchContextMenuEvent extends KiCanvasEvent<string> {
    static readonly type = "kicanvas:sch-context-selection";

    constructor(detail: string) {
        super(KiCanvasSchContextMenuEvent.type, detail, true);
    }
}

export class KiCanvasFitterMenuEvent extends KiCanvasEvent<FitterSelections> {
    static readonly type = "kicanvas:fitter-selection";

    constructor(detail: FitterSelections) {
        super(KiCanvasFitterMenuEvent.type, detail, true);
    }
}

interface MouseMoveDetails {
    x: number;
    y: number;
}

export interface LabelIndex {
    name: string;
    uuid: string;
}

export interface NetItemIndex {
    sheet: string;
    uuid: string;
}

export interface DesignatorIndex {
    sheet: string;
    designator: string;
}

export class KiCanvasMouseMoveEvent extends KiCanvasEvent<MouseMoveDetails> {
    static readonly type = "kicanvas:mousemove";

    constructor(detail: MouseMoveDetails) {
        super(KiCanvasMouseMoveEvent.type, detail, true);
    }
}

export class KicadSyncHoverEvent extends KiCanvasEvent<string | null> {
    static readonly type = "kicanvas:sync_hover";

    constructor(index: string | null) {
        super(KicadSyncHoverEvent.type, index, true);
    }
}

export interface TabIndexChange {
    current: TabKind;
    previous?: TabKind;
}

export class TabActivateEvent extends CustomEvent<TabIndexChange> {
    static readonly type = "kicanvas:tab:activate";

    constructor(current: TabIndexChange) {
        super(TabActivateEvent.type, { detail: current });
    }
}

export class TabMenuVisibleChangeEvent extends CustomEvent<boolean> {
    static readonly type = "kicanvas:tab:menu:visible";

    constructor(v: boolean) {
        super(TabMenuVisibleChangeEvent.type, { detail: v });
    }
}

export class TabMenuChangeEvent extends CustomEvent<string> {
    static readonly type = "file:tab:menu:change";

    constructor(v: string) {
        super(TabMenuChangeEvent.type, { detail: v });
    }
}

export class TabMenuClickEvent extends CustomEvent<TabKind> {
    static readonly type = "kicanvas:tab:menu:click";

    constructor(tab: TabKind) {
        super(TabMenuClickEvent.type, { detail: tab });
    }
}

export class SheetChangeEvent extends CustomEvent<string> {
    static readonly type = "kicanvas:sheet:change";

    constructor(fp: string) {
        super(SheetChangeEvent.type, { detail: fp });
    }
}

export class SheetLoadEvent extends CustomEvent<string> {
    static readonly type = "kicanvas:sheet:loaded";

    constructor(sheet_name: string) {
        super(SheetLoadEvent.type, { detail: sheet_name });
    }
}

export class Online3dViewerUrlReady extends CustomEvent<string> {
    static readonly type = "3d:url:ready";

    constructor(url: string) {
        super(Online3dViewerUrlReady.type, { detail: url });
    }
}

export class Online3dViewerLoaded extends CustomEvent<void> {
    static readonly type = "3d:viewer:loaded";

    constructor() {
        super(Online3dViewerLoaded.type);
    }
}

export class SchViewerLoaded extends CustomEvent<void> {
    static readonly type = "sch:viewer:loaded";

    constructor() {
        super(SchViewerLoaded.type);
    }
}

export class PCBViewerLoaded extends CustomEvent<void> {
    static readonly type = "pcb:viewer:loaded";

    constructor() {
        super(PCBViewerLoaded.type);
    }
}

export class BoardContentReady extends CustomEvent<string> {
    static readonly type = "pcb:board_content:ready";

    constructor(content: string) {
        super(BoardContentReady.type, { detail: content });
    }
}

export class AdBoardContentReady extends CustomEvent<string> {
    static readonly type = "ad:board_content:ready";

    constructor(url: string) {
        super(AdBoardContentReady.type, { detail: url });
    }
}

export class LabelClickEvent extends CustomEvent<LabelIndex> {
    static readonly type = "sch:label:click";

    constructor(label: LabelIndex) {
        super(LabelClickEvent.type, { detail: label });
    }
}

export class HierarchicalSheetPinClickEvent extends CustomEvent<LabelIndex> {
    static readonly type = "sch:hierarchical_sheet_pin:click";

    constructor(pin: LabelIndex) {
        super(HierarchicalSheetPinClickEvent.type, { detail: pin });
    }
}

export class SelectDesignatorEvent extends CustomEvent<DesignatorIndex> {
    static readonly type = "sch:select:designator";

    constructor(d: DesignatorIndex) {
        super(SelectDesignatorEvent.type, { detail: d });
    }
}

export class ComponentERCResultEvent extends CustomEvent<ComponentERCResult> {
    static readonly type = "sch:erc:component";

    constructor(d: ComponentERCResult) {
        super(ComponentERCResultEvent.type, { detail: d });
    }
}

export class ProjectERCResultEvent extends CustomEvent<ProjectErcResult> {
    static readonly type = "sch:erc:project";

    constructor(detail: ProjectErcResult) {
        super(ProjectERCResultEvent.type, { detail });
    }
}

export class NetItemSelectEvent extends CustomEvent<NetItemIndex> {
    static readonly type = "net:select_item";

    constructor(net: NetItemIndex) {
        super(NetItemSelectEvent.type, { detail: net });
    }
}

export class OpenBarrierEvent extends CustomEvent<undefined> {
    static readonly type = "ecad-viewer:open_barrier";

    constructor() {
        super(OpenBarrierEvent.type);
    }
}

export class ShowBarrierEvent extends CustomEvent<undefined> {
    static readonly type = "ecad-viewer:show_barrier";
    constructor() {
        super(ShowBarrierEvent.type);
    }
}

export class PresetChangeEvent extends CustomEvent<string> {
    static readonly type = "ecad-viewer:preset:change";

    constructor(preset: string) {
        super(PresetChangeEvent.type, { detail: preset });
    }
}

export class PresetUnsetEvent extends CustomEvent<undefined> {
    static readonly type = "ecad-viewer:preset:unset";

    constructor() {
        super(PresetUnsetEvent.type);
    }
}

/**
 * Event dispatched when user clicks in comment mode.
 * Contains world coordinates and element information.
 */
export interface CommentClickDetails {
    /** X coordinate in board units (mm) */
    worldX: number;
    /** Y coordinate in board units (mm) */
    worldY: number;
    /** X coordinate on screen (pixels) */
    screenX: number;
    /** Y coordinate on screen (pixels) */
    screenY: number;
    /** Active layer name (e.g., "F.Cu") */
    layer: string;
    /** Context type: "PCB" or "SCH" */
    context: "PCB" | "SCH";
    /** Element type (e.g., "Footprint", "Pad", "Via", "Symbol", "Pin") */
    elementType?: string;
    /** Element ID or reference (e.g., footprint UUID) */
    elementId?: string;
    /** Element designator/reference (e.g., "U1", "R5", "C3") */
    elementRef?: string;
    /** Raw element object for additional info */
    element?: unknown;
}

export class CommentClickEvent extends KiCanvasEvent<CommentClickDetails> {
    static readonly type = "ecad-viewer:comment:click";

    constructor(detail: CommentClickDetails) {
        super(CommentClickEvent.type, detail, true);
    }
}

// Event maps for type safe addEventListener.

export interface KiCanvasEventMap {
    [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
    [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
    [KiCanvasAiSelectEvent.type]: KiCanvasAiSelectEvent;
    [KiCanvasMouseMoveEvent.type]: KiCanvasMouseMoveEvent;
    [KicadSyncHoverEvent.type]: KicadSyncHoverEvent;
    [TabActivateEvent.type]: TabActivateEvent;
    [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
    [TabMenuChangeEvent.type]: TabMenuChangeEvent;
    [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
    [KiCanvasContextMenuEvent.type]: KiCanvasContextMenuEvent;
    [KiCanvasSchContextMenuEvent.type]: KiCanvasSchContextMenuEvent;
    [SheetChangeEvent.type]: SheetChangeEvent;
    [SheetLoadEvent.type]: SheetLoadEvent;
    [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
    [Online3dViewerLoaded.type]: Online3dViewerLoaded;
    [LabelClickEvent.type]: LabelClickEvent;
    [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
    [NetItemSelectEvent.type]: NetItemSelectEvent;
    [OpenBarrierEvent.type]: OpenBarrierEvent;
    [ShowBarrierEvent.type]: ShowBarrierEvent;
    [SelectDesignatorEvent.type]: SelectDesignatorEvent;
    [PresetChangeEvent.type]: PresetChangeEvent;
    [PresetUnsetEvent.type]: PresetUnsetEvent;
    [ComponentERCResultEvent.type]: ComponentERCResultEvent;
    [ProjectERCResultEvent.type]: ProjectERCResultEvent;
    [CommentClickEvent.type]: CommentClickEvent;
}

declare global {
    interface WindowEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
        [SheetChangeEvent.type]: SheetChangeEvent;
        [SheetLoadEvent.type]: SheetLoadEvent;
        [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
        [Online3dViewerLoaded.type]: Online3dViewerLoaded;
        [LabelClickEvent.type]: LabelClickEvent;
        [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
        [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
        [OpenBarrierEvent.type]: OpenBarrierEvent;
        [SelectDesignatorEvent.type]: SelectDesignatorEvent;
        [BoardContentReady.type]: BoardContentReady;
        [ComponentERCResultEvent.type]: ComponentERCResultEvent;
        [ProjectERCResultEvent.type]: ProjectERCResultEvent;
        [CommentClickEvent.type]: CommentClickEvent;
    }

    interface HTMLElementEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
        [SheetChangeEvent.type]: SheetChangeEvent;
        [SheetLoadEvent.type]: SheetLoadEvent;
        [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
        [Online3dViewerLoaded.type]: Online3dViewerLoaded;
        [LabelClickEvent.type]: LabelClickEvent;
        [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
        [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
        [OpenBarrierEvent.type]: OpenBarrierEvent;
        [SelectDesignatorEvent.type]: SelectDesignatorEvent;
        [BoardContentReady.type]: BoardContentReady;
        [ComponentERCResultEvent.type]: ComponentERCResultEvent;
        [ProjectERCResultEvent.type]: ProjectERCResultEvent;
        [CommentClickEvent.type]: CommentClickEvent;
    }
}
