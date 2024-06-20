/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { TabKind } from "../../ecad-viewer/constraint";

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

export class KiCanvasSelectEvent extends KiCanvasEvent<SelectDetails> {
    static readonly type = "kicanvas:select";

    constructor(detail: SelectDetails) {
        super(KiCanvasSelectEvent.type, detail, true);
    }
}

interface FitterSelections {
    items: unknown[];
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

export class BoardContentReady extends CustomEvent<string> {
    static readonly type = "pcb:board_content:ready";

    constructor(content: string) {
        super(BoardContentReady.type, { detail: content });
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

// Event maps for type safe addEventListener.

export interface KiCanvasEventMap {
    [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
    [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
    [KiCanvasMouseMoveEvent.type]: KiCanvasMouseMoveEvent;
    [KicadSyncHoverEvent.type]: KicadSyncHoverEvent;
    [TabActivateEvent.type]: TabActivateEvent;
    [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
    [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
    [SheetChangeEvent.type]: SheetChangeEvent;
    [SheetLoadEvent.type]: SheetLoadEvent;
    [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
    [LabelClickEvent.type]: LabelClickEvent;
    [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
    [NetItemSelectEvent.type]: NetItemSelectEvent;
    [OpenBarrierEvent.type]: OpenBarrierEvent;
    [SelectDesignatorEvent.type]: SelectDesignatorEvent;
}

declare global {
    interface WindowEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
        [SheetChangeEvent.type]: SheetChangeEvent;
        [SheetLoadEvent.type]: SheetLoadEvent;
        [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
        [LabelClickEvent.type]: LabelClickEvent;
        [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
        [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
        [OpenBarrierEvent.type]: OpenBarrierEvent;
        [SelectDesignatorEvent.type]: SelectDesignatorEvent;
    }

    interface HTMLElementEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [TabMenuVisibleChangeEvent.type]: TabMenuVisibleChangeEvent;
        [SheetChangeEvent.type]: SheetChangeEvent;
        [SheetLoadEvent.type]: SheetLoadEvent;
        [Online3dViewerUrlReady.type]: Online3dViewerUrlReady;
        [LabelClickEvent.type]: LabelClickEvent;
        [HierarchicalSheetPinClickEvent.type]: HierarchicalSheetPinClickEvent;
        [KiCanvasFitterMenuEvent.type]: KiCanvasFitterMenuEvent;
        [OpenBarrierEvent.type]: OpenBarrierEvent;
        [SelectDesignatorEvent.type]: SelectDesignatorEvent;
    }
}
