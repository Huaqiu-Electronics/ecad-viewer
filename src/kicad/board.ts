/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { CrossHightAble } from "../base/cross_highlight_able";
import { Angle, BBox, Arc as MathArc, Matrix3, Vec2 } from "../base/math";
import { Color } from "../graphics";
import { LayerNames } from "../viewers/board/layers";
import {
    At,
    Effects,
    Paper,
    Stroke,
    TitleBlock,
    expand_text_vars,
} from "./common";
import * as B from "../parser/proto/board";

import type { BoardNodeType } from "./board_node_type";
export interface BoardNode {
    typeId: BoardNodeType;
    getChildren?: () => BoardNode[];
}

export type Drawing =
    | GrLine
    | GrCircle
    | GrArc
    | GrPoly
    | GrRect
    | GrText
    | Dimension;

const DEFAULT_LAYERS: Partial<B.I_Layer>[] = [
    { canonical_name: LayerNames.f_cu, type: "signal" },
    { canonical_name: LayerNames.b_cu, type: "signal" },
    { canonical_name: LayerNames.f_silks, type: "user" },
    { canonical_name: LayerNames.b_silks, type: "user" },
    { canonical_name: LayerNames.f_mask, type: "user" },
    { canonical_name: LayerNames.b_mask, type: "user" },
    { canonical_name: LayerNames.edge_cuts, type: "user" },
    { canonical_name: LayerNames.f_fab, type: "user" },
    { canonical_name: LayerNames.b_fab, type: "user" },
];

export class KicadPCB implements BoardNode {
    typeId: BoardNodeType = "KicadPCB";
    version: number;
    generator?: string;
    general?: { thickness: number; legacy_teardrops?: boolean };
    paper?: Paper;
    title_block = new TitleBlock();
    setup?: Setup;
    properties = new Map<string, Property>();
    layers: Layer[] = [];
    nets: Net[] = [];
    footprints: Footprint[] = [];
    zones: Zone[] = [];
    segments: (LineSegment | ArcSegment)[] = [];
    vias: Via[] = [];
    drawings: Drawing[] = [];
    groups: Group[] = [];
    #net_names: Map<number, string> = new Map();

    public getNetName(idx: number) {
        return this.#net_names.get(idx);
    }

    public getChildren() {
        return [
            ...this.footprints,
            ...this.nets,
            ...this.zones,
            ...this.vias,
            ...this.drawings,
            ...this.segments,
        ];
    }

    constructor(
        public filename: string,
        data: B.I_KicadPCB,
    ) {
        this.version = data.version;
        this.generator = data.generator;
        this.general = data.general;
        this.paper = new Paper(data.paper!);
        this.title_block = new TitleBlock(data.title_block);
        this.setup = data.setup ? new Setup(data.setup) : undefined;

        if (data.properties) {
            for (const [k, v] of Object.entries(data.properties)) {
                this.properties.set(k, new Property(v));
            }
        }

        let layers_data = data.layers as any;
        if (
            Array.isArray(layers_data) &&
            layers_data.length === 1 &&
            Array.isArray(layers_data[0])
        ) {
            layers_data = layers_data[0];
        }

        this.layers = (layers_data || DEFAULT_LAYERS).map(
            (l: any, i: number) => {
                return new Layer({
                    ordinal: l.ordinal ?? i,
                    canonical_name: l.canonical_name!,
                    type: l.type as any,
                    ...l,
                });
            },
        );
        this.nets = data.nets?.map((n) => new Net(n)) ?? [];
        this.footprints =
            data.footprints?.map((f) => new Footprint(f, this)) ?? [];
        this.zones = data.zones?.map((z) => new Zone(z)) ?? [];

        this.segments = [];
        if (data.segments) {
            for (const s of data.segments) {
                if ("start" in s && "mid" in s) {
                    this.segments.push(new ArcSegment(s as B.I_ArcSegment));
                } else {
                    this.segments.push(new LineSegment(s as B.I_LineSegment));
                }
            }
        }

        this.vias = data.vias?.map((v) => new Via(v)) ?? [];

        this.drawings = [];
        if (data.drawings) {
            for (const d of data.drawings) {
                // Check types based on properties usually, or if POD has type field (which checking proto, it often doesn't for shapes).
                // However, the parser for drawings separates them into collections in KicadPCB POD logic?
                // Wait, KicadPCB POD has "drawings: (I_Line | I_Circle | ... )[]".
                // Unlike S-expr which has tags.
                // I need to distinguish them.
                // I_Line has start, end.
                // I_Circle has center, end.
                // I_Arc has start, mid, end.
                // I_Poly has pts.
                // I_Rect has start, end.
                // I_GrText has text, at.
                // I_Dimension has type, layer, ...
                if ("format" in d) {
                    this.drawings.push(new Dimension(d as B.I_Dimension, this));
                } else if ("text" in d) {
                    this.drawings.push(new GrText(d as B.I_GrText, this));
                } else if ("center" in d) {
                    this.drawings.push(new GrCircle(d as B.I_Circle));
                } else if ("mid" in d) {
                    this.drawings.push(new GrArc(d as B.I_Arc));
                } else if ("pts" in d) {
                    this.drawings.push(new GrPoly(d as B.I_Poly));
                } else if ("start" in d && "end" in d) {
                    // Line or Rect.
                    // Rect usually has 'width' same as Line but semantically different.
                    // Wait, parsers distinguish them.
                    // How to distinguish I_Line from I_Rect in POD?
                    // I_Rect and I_Line both have start, end, width, stroke, layer...
                    // The current parser separates them into different lists?
                    // No, B.I_KicadPCB has `drawings: (I_Line | ... )[]`.
                    // The `BoardParser` pushes them all to `drawings`.
                    // `BoardParser` keeps the type info? No, it just returns the object.
                    // S-expr has keys like (gr_line ...).
                    // The `BoardParser` should ideally preserve the type or I should check properties.
                    // But I_Line and I_Rect are identical in structure in POD?
                    // I_Rect: start, end, width, fill, stroke.
                    // I_Line: start, end, width, stroke.
                    // So I_Rect has 'fill'. I_Line does not.
                    if ("fill" in d) {
                        this.drawings.push(new GrRect(d as B.I_Rect));
                    } else {
                        this.drawings.push(new GrLine(d as B.I_Line));
                    }
                }
            }
        }

        this.groups = data.groups?.map((g) => new Group(g)) ?? [];

        for (const net of this.nets) this.#net_names.set(net.number, net.name);
    }

    *items() {
        yield* this.drawings;
        yield* this.vias;
        yield* this.segments;
        yield* this.zones;
        yield* this.footprints;
    }

    resolve_text_var(name: string): string | undefined {
        if (name == "FILENAME") {
            return this.filename;
        }

        if (this.properties.has(name)) {
            return this.properties.get(name)!.value;
        }

        return this.title_block.resolve_text_var(name);
    }

    get bbox() {
        const bbox = this.edge_cuts_bbox;
        if (bbox.valid) {
            return bbox;
        }

        // Fallback: combine all item bboxes
        const bboxes = [];
        for (const item of this.items()) {
            bboxes.push(item.bbox);
        }
        return BBox.combine(bboxes);
    }

    get edge_cuts_bbox(): BBox {
        let bbox = new BBox(0, 0, 0, 0);
        for (const item of this.drawings) {
            if (item.layer != "Edge.Cuts" || !(item instanceof GraphicItem)) {
                continue;
            }
            bbox = BBox.combine([bbox, item.bbox]);
        }
        return bbox;
    }

    find_footprint(uuid_or_ref: string) {
        for (const fp of this.footprints) {
            if (fp.uuid == uuid_or_ref || fp.reference == uuid_or_ref) {
                return fp;
            }
        }
        return null;
    }
}

export class Property {
    name: string;
    value: string;

    constructor(data: { name: string; value: string }) {
        this.name = data.name;
        this.value = data.value;
    }
}

export class LineSegment implements BoardNode {
    typeId: BoardNodeType = "LineSegment";
    start: Vec2;
    end: Vec2;
    width: number;
    layer: string;
    net: number;
    locked = false;
    tstamp: string;
    uuid?: string;

    get bbox() {
        return BBox.from_points([this.start, this.end]);
    }

    get routed_length() {
        return Math.sqrt(
            (this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2,
        );
    }

    constructor(data: B.I_LineSegment) {
        this.start = new Vec2(data.start.x, data.start.y);
        this.end = new Vec2(data.end.x, data.end.y);
        this.width = data.width;
        this.layer = data.layer;
        this.net = data.net;
        this.locked = data.locked;
        this.tstamp = data.tstamp ?? "";
        this.uuid = data.uuid;
    }
}

export class ArcSegment implements BoardNode {
    typeId: BoardNodeType = "ArcSegment";
    start: Vec2;
    mid: Vec2;
    end: Vec2;
    width: number;
    layer: string;
    net: number;
    locked = false;
    tstamp: string;

    constructor(data: B.I_ArcSegment) {
        this.start = new Vec2(data.start.x, data.start.y);
        this.mid = new Vec2(data.mid.x, data.mid.y);
        this.end = new Vec2(data.end.x, data.end.y);
        this.width = data.width;
        this.layer = data.layer;
        this.net = data.net;
        this.locked = data.locked;
        this.tstamp = data.tstamp ?? "";
    }

    get bbox() {
        const arc = MathArc.from_three_points(
            this.start,
            this.mid,
            this.end,
            this.width,
        );
        return arc.bbox;
    }
}

export class Via implements BoardNode {
    typeId: BoardNodeType = "Via";
    type: "blind" | "micro" | "through-hole" = "through-hole";
    at: At;
    size: number;
    drill: number;
    layers: string[];
    remove_unused_layers = false;
    keep_end_layers = false;
    locked = false;
    free = false;
    net: number;
    tstamp: string;
    uuid?: string;

    get bbox() {
        return new BBox(
            this.at.position.x,
            this.at.position.y,
            this.size,
            this.size,
        ).move(-this.size / 2, -this.size / 2);
    }

    constructor(data: B.I_Via) {
        this.type = data.type;
        this.at = new At(data.at);
        this.size = data.size;
        this.drill = data.drill;
        this.layers = data.layers;
        this.remove_unused_layers = data.remove_unused_layers;
        this.keep_end_layers = data.keep_end_layers;
        this.locked = data.locked;
        this.free = data.free;
        this.net = data.net;
        this.tstamp = data.tstamp ?? "";
        this.uuid = data.uuid;
    }
}

export class Zone implements BoardNode {
    typeId: BoardNodeType = "Zone";
    locked = false;
    net: number;
    net_name: string;
    name: string;
    layer: string;
    layers: string[];
    hatch: { style: "none" | "edge" | "full"; pitch: number };
    priority: number;
    connect_pads: {
        type?: "yes" | "thru_hole_only" | "full" | "no";
        clearance: number;
    };
    min_thickness: number;
    filled_areas_thickness: boolean;
    keepout?: ZoneKeepout;
    fill?: ZoneFill;
    polygons: Poly[];
    filled_polygons?: FilledPolygon[];
    tstamp: string;
    uuid?: string;

    get bbox() {
        try {
            let bbox: BBox | undefined = undefined;
            for (const poly of this.polygons) {
                if (!bbox) bbox = poly.bbox;
                else bbox = BBox.combine([bbox, poly.bbox]);
            }
            if (this.filled_polygons)
                for (const poly of this.filled_polygons) {
                    if (!bbox) bbox = poly.bbox;
                    else bbox = BBox.combine([bbox, poly.bbox]);
                }
            if (!bbox) return new BBox();
            return bbox;
        } catch (e) {
            console.log(e);
            return new BBox();
        }
    }

    constructor(
        data: B.I_Zone,
        public parent?: KicadPCB | Footprint,
    ) {
        this.locked = data.locked;
        this.net = data.net;
        this.net_name = data.net_name;
        this.name = data.name;
        this.layer = data.layer;
        this.layers = data.layers;
        this.hatch = data.hatch;
        this.priority = data.priority;
        this.connect_pads = data.connect_pads;
        this.min_thickness = data.min_thickness;
        this.filled_areas_thickness = data.filled_areas_thickness;
        this.keepout = data.keepout ? new ZoneKeepout(data.keepout) : undefined;
        this.fill = data.fill ? new ZoneFill(data.fill) : undefined;
        this.polygons = data.polygons?.map((p) => new Poly(p)) ?? [];
        this.filled_polygons =
            data.filled_polygons?.map((p) => new FilledPolygon(p)) ?? undefined;
        this.tstamp = data.tstamp ?? "";
        this.uuid = data.uuid;
    }
}

export class ZoneKeepout implements BoardNode {
    typeId: BoardNodeType = "ZoneKeepout";
    tracks: "allowed" | "not_allowed";
    vias: "allowed" | "not_allowed";
    pads: "allowed" | "not_allowed";
    copperpour: "allowed" | "not_allowed";
    footprints: "allowed" | "not_allowed";
    uuid?: string;

    constructor(data?: B.I_ZoneKeepout) {
        if (data) {
            this.tracks = data.tracks ?? "not_allowed";
            this.vias = data.vias ?? "not_allowed";
            this.pads = data.pads ?? "not_allowed";
            this.copperpour = data.copperpour ?? "not_allowed";
            this.footprints = data.footprints ?? "not_allowed";
            this.uuid = data.uuid;
        } else {
            this.tracks = "not_allowed";
            this.vias = "not_allowed";
            this.pads = "not_allowed";
            this.copperpour = "not_allowed";
            this.footprints = "not_allowed";
        }
    }
}

export class ZoneFill implements BoardNode {
    typeId: BoardNodeType = "ZoneFill";
    fill = false;
    mode: "solid" | "hatch" = "solid";
    thermal_gap = 0.508;
    thermal_bridge_width = 0.508;
    smoothing: {
        style: "none" | "chamfer" | "fillet";
        radius: number;
    } = { style: "none", radius: 0 };
    radius = 0;
    island_removal_mode: 0 | 1 | 2 = 0;
    island_area_min = 0;
    hatch_thickness = 0.1;
    hatch_gap = 0.254;
    hatch_orientation = 0;
    hatch_smoothing_level: 0 | 1 | 2 | 3 = 0;
    hatch_smoothing_value = 0;
    hatch_border_algorithm: "hatch_thickness" | "min_thickness" =
        "hatch_thickness";
    hatch_min_hole_area = 0;
    uuid?: string;

    constructor(data?: B.I_ZoneFill) {
        if (data) {
            this.fill = data.fill ?? false;
            this.mode = data.mode ?? "solid";
            this.thermal_gap = data.thermal_gap ?? 0.508;
            this.thermal_bridge_width = data.thermal_bridge_width ?? 0.508;
            this.smoothing = {
                style: data.smoothing?.style ?? "none",
                radius: data.smoothing?.radius ?? 0,
            };
            this.radius = data.radius ?? 0;
            this.island_removal_mode = data.island_removal_mode ?? 0;
            this.island_area_min = data.island_area_min ?? 0;
            this.hatch_thickness = data.hatch_thickness ?? 0.1;
            this.hatch_gap = data.hatch_gap ?? 0.254;
            this.hatch_orientation = data.hatch_orientation ?? 0;
            this.hatch_smoothing_level = data.hatch_smoothing_level ?? 0;
            this.hatch_smoothing_value = data.hatch_smoothing_value ?? 0;
            this.hatch_border_algorithm =
                data.hatch_border_algorithm ?? "hatch_thickness";
            this.hatch_min_hole_area = data.hatch_min_hole_area ?? 0;
            this.uuid = data.uuid;
        }
    }
}

export class Layer implements BoardNode {
    typeId: BoardNodeType = "Layer";
    ordinal: number = 0;
    canonical_name: string = LayerNames.f_cu;
    type: "jumper" | "mixed" | "power" | "signal" | "user" = "signal";
    user_name?: string;
    uuid?: string;

    constructor(data: B.I_Layer) {
        this.ordinal = data.ordinal;
        this.canonical_name = data.canonical_name;
        this.type = data.type;
        this.user_name = data.user_name;
        this.uuid = data.uuid;
    }
}

export class Setup implements BoardNode {
    // stackup: Stackup;
    typeId: BoardNodeType = "Setup";
    pad_to_mask_clearance: number;
    solder_mask_min_width: number;
    pad_to_paste_clearance: number;
    pad_to_paste_clearance_ratio: number;
    aux_axis_origin: Vec2;
    grid_origin: Vec2;
    pcbplotparams: PCBPlotParams;
    stackup: Stackup;
    uuid?: string;
    allow_soldermask_bridges_in_footprints?: boolean;

    constructor(data: B.I_Setup) {
        this.pad_to_mask_clearance = data.pad_to_mask_clearance;
        this.solder_mask_min_width = data.solder_mask_min_width;
        this.pad_to_paste_clearance = data.pad_to_paste_clearance;
        this.pad_to_paste_clearance_ratio = data.pad_to_paste_clearance_ratio;
        this.aux_axis_origin = new Vec2(
            data.aux_axis_origin?.x ?? 0,
            data.aux_axis_origin?.y ?? 0,
        );
        this.grid_origin = new Vec2(
            data.grid_origin?.x ?? 0,
            data.grid_origin?.y ?? 0,
        );
        this.uuid = data.uuid;
        this.allow_soldermask_bridges_in_footprints =
            data.allow_soldermask_bridges_in_footprints;
        this.pcbplotparams = new PCBPlotParams(data.pcbplotparams);
        this.stackup = new Stackup(data.stackup);
    }
}

export class PCBPlotParams implements BoardNode {
    typeId: BoardNodeType = "PCBPlotParams";
    layerselection: number;
    disableapertmacros = false;
    usegerberextensions = false;
    usegerberattributes = false;
    usegerberadvancedattributes = false;
    creategerberjobfile = false;
    gerberprecision: number;
    svguseinch = false;
    svgprecision: number;
    excludeedgelayer = false;
    plotframeref = false;
    viasonmask = false;
    mode: number;
    useauxorigin = false;
    hpglpennumber: number;
    hpglpenspeed: number;
    hpglpendiameter: number;
    dxfpolygonmode = false;
    dxfimperialunits = false;
    dxfusepcbnewfont = false;
    psnegative = false;
    psa4output = false;
    plotreference = false;
    plotvalue = false;
    plotinvisibletext = false;
    sketchpadsonfab = false;
    subtractmaskfromsilk = false;
    outputformat: number;
    mirror = false;
    drillshape: number;
    scaleselection: number;
    outputdirectory: string;
    plot_on_all_layers_selection: number;
    dashed_line_dash_ratio: number;
    dashed_line_gap_ratio: number;
    pdf_front_fp_property_popups = false;
    pdf_back_fp_property_popups = false;
    plotfptext = false;
    uuid?: string;

    constructor(data: B.I_PCBPlotParams) {
        Object.assign(this, data);
    }
}

export class Stackup implements BoardNode {
    typeId: BoardNodeType = "Stackup";
    layers: StackupLayer[];
    copper_finish: string;
    dielectric_constraints = false;
    edge_connector: string;
    castellated_pads = false;
    edge_plating = false;

    constructor(data: B.I_Stackup) {
        this.layers = data?.layers?.map((l) => new StackupLayer(l)) ?? [];
        this.copper_finish = data?.copper_finish ?? "";
        this.dielectric_constraints = data?.dielectric_constraints ?? false;
        this.edge_connector = data?.edge_connector ?? "";
        this.castellated_pads = data?.castellated_pads ?? false;
        this.edge_plating = data?.edge_plating ?? false;
    }
}

export class StackupLayer implements BoardNode {
    typeId: BoardNodeType = "StackupLayer";
    name: string;
    type: string;
    color: string;
    thickness: number;
    material: string;
    epsilon_r: number;
    loss_tangent: number;
    uuid?: string;

    constructor(data: B.I_StackupLayer) {
        this.name = data.name;
        this.type = data.type;
        this.color = data.color;
        this.thickness = data.thickness;
        this.material = data.material;
        this.epsilon_r = data.epsilon_r;
        this.loss_tangent = data.loss_tangent;
        this.uuid = data.uuid;
    }
}

export class Net implements BoardNode {
    typeId: BoardNodeType = "Net";
    number: number;
    name: string;

    constructor(data: B.I_Net) {
        if (data) {
            this.number = data.number ?? 0;
            this.name = data.name ?? "";
        } else {
            this.number = 0;
            this.name = "";
        }
    }
}

export class Dimension implements BoardNode {
    typeId: BoardNodeType = "Dimension";
    locked = false;
    type: "aligned" | "leader" | "center" | "orthogonal" | "radial";
    layer: string;
    tstamp: string;
    pts: Vec2[];
    height: number;
    orientation: number;
    leader_length: number;
    gr_text: GrText;
    format: DimensionFormat;
    style: DimensionStyle;

    constructor(
        data: B.I_Dimension,
        public parent: KicadPCB,
    ) {
        this.locked = data.locked;
        this.type = data.type;
        this.layer = data.layer;
        this.tstamp = data.tstamp ?? "";
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
        this.height = data.height;
        this.orientation = data.orientation;
        this.leader_length = data.leader_length;
        this.gr_text = new GrText(data.gr_text, this);
        this.format = new DimensionFormat(data.format);
        this.style = new DimensionStyle(data.style);
    }

    resolve_text_var(name: string): string | undefined {
        return this.parent.resolve_text_var(name);
    }

    get start(): Vec2 {
        return this.pts.at(0) ?? new Vec2(0, 0);
    }

    get end(): Vec2 {
        return this.pts.at(-1) ?? new Vec2(0, 0);
    }

    get bbox() {
        return BBox.from_points([this.start, this.end]);
    }
}

export enum DimensionFormatUnits {
    inches,
    mils,
    millimeters,
    automatic,
}

export enum DimensionFormatUnitsFormat {
    none,
    bare,
    parenthesis,
}

export class DimensionFormat implements BoardNode {
    typeId: BoardNodeType = "DimensionFormat";
    prefix: string;
    suffix: string;
    units: DimensionFormatUnits;
    units_format: DimensionFormatUnitsFormat;
    precision: number;
    override_value: string;
    suppress_zeroes = false;

    constructor(data: B.I_DimensionFormat) {
        this.prefix = data.prefix;
        this.suffix = data.suffix;
        this.units = data.units;
        this.units_format = data.units_format;
        this.precision = data.precision;
        this.override_value = data.override_value;
        this.suppress_zeroes = data.suppress_zeroes;
    }
}

export enum DimensionStyleTextPositionMode {
    outside,
    inline,
    manual,
}

export enum DimensionStyleTextFrame {
    none,
    rect,
    circle,
    roundrect,
}

export class DimensionStyle implements BoardNode {
    typeId: BoardNodeType = "DimensionStyle";
    thickness: number;
    arrow_length: number;
    text_position_mode: DimensionStyleTextPositionMode;
    extension_height: number;
    text_frame: DimensionStyleTextFrame;
    extension_offset: number;
    keep_text_aligned: boolean;

    constructor(data: B.I_DimensionStyle) {
        this.thickness = data.thickness;
        this.arrow_length = data.arrow_length;
        this.text_position_mode = data.text_position_mode;
        this.extension_height = data.extension_height;
        this.text_frame = data.text_frame;
        this.extension_offset = data.extension_offset;
        this.keep_text_aligned = data.keep_text_aligned;
    }
}

type FootprintDrawings = FpLine | FpCircle | FpArc | FpPoly | FpRect;

export class Footprint implements BoardNode {
    typeId: BoardNodeType = "Footprint";
    at: At;
    reference: string = "";
    value: string = "";
    library_link: string;
    version: number;
    generator: string;
    locked = false;
    placed = false;
    layer: string;
    tedit: string;
    tstamp: string;
    descr: string;
    tags: string;
    path: string;
    autoplace_cost90: number;
    autoplace_cost180: number;
    solder_mask_margin: number;
    solder_paste_margin: number;
    solder_paste_ratio: number;
    clearance: number;
    zone_connect: number;
    thermal_width: number;
    thermal_gap: number;
    attr: {
        through_hole: boolean;
        smd: boolean;
        virtual: boolean;
        board_only: boolean;
        exclude_from_pos_files: boolean;
        exclude_from_bom: boolean;
        allow_solder_mask_bridges: boolean;
        allow_missing_courtyard: boolean;
    } = {
        through_hole: false,
        smd: false,
        virtual: false,
        board_only: false,
        exclude_from_pos_files: false,
        exclude_from_bom: false,
        allow_solder_mask_bridges: false,
        allow_missing_courtyard: false,
    };
    properties: Record<string, string> = {};
    drawings: FootprintDrawings[] = [];
    pads: Pad[] = [];
    #pads_by_number = new Map<string, Pad>();
    zones: Zone[] = [];
    models: Model[] = [];
    #bbox: BBox;
    sheetname: string = "";
    sheetfile: string = "";
    fp_texts: FpText[] = [];
    _uuid?: string;
    properties_kicad_8: Property_Kicad_8[] = [];

    // Graphics items
    public getChildren() {
        return [...this.pads, ...this.drawings, ...this.zones];
    }

    constructor(
        data: B.I_Footprint,
        public parent: KicadPCB,
    ) {
        this.library_link = data.library_link;
        this.version = data.version;
        this.generator = data.generator;
        this.locked = data.locked;
        this.placed = data.placed;
        this.layer = data.layer;
        this.tedit = data.tedit;
        this.tstamp = data.tstamp ?? "";
        this.at = new At(data.at);
        this.uuid = data.uuid;
        this.descr = data.descr;
        this.tags = data.tags;
        this.sheetname = data.sheetname;
        this.sheetfile = data.sheetfile;
        this.path = data.path;
        this.autoplace_cost90 = data.autoplace_cost90;
        this.autoplace_cost180 = data.autoplace_cost180;
        this.solder_mask_margin = data.solder_mask_margin;
        this.solder_paste_margin = data.solder_paste_margin;
        this.solder_paste_ratio = data.solder_paste_ratio;
        this.clearance = data.clearance;
        this.zone_connect = data.zone_connect;
        this.thermal_width = data.thermal_width;
        this.thermal_gap = data.thermal_gap;
        this.attr = data.attr || this.attr;
        this.properties = data.properties || {};

        this.drawings = [];
        if (data.drawings) {
            for (const d of data.drawings) {
                if ("center" in d) {
                    this.drawings.push(new FpCircle(d as B.I_Circle, this));
                } else if ("mid" in d) {
                    this.drawings.push(new FpArc(d as B.I_Arc, this));
                } else if ("pts" in d) {
                    this.drawings.push(new FpPoly(d as B.I_Poly, this));
                } else if ("fill" in d) {
                    this.drawings.push(new FpRect(d as B.I_Rect, this));
                } else {
                    this.drawings.push(new FpLine(d as B.I_Line, this));
                }
            }
        }

        this.fp_texts = data.fp_texts?.map((t) => new FpText(t, this)) ?? [];
        this.zones = data.zones?.map((z) => new Zone(z, this)) ?? [];
        this.models = data.models?.map((m) => new Model(m)) ?? [];
        this.pads = data.pads?.map((p) => new Pad(p, this)) ?? [];
        this.properties_kicad_8 =
            data.properties_kicad_8?.map(
                (p) => new Property_Kicad_8(p, this),
            ) ?? [];

        for (const pad of this.pads) {
            this.#pads_by_number.set(pad.number, pad);
        }

        //Remove duplicated properties
        Object.entries(this.properties).forEach(([k, v]) => {
            if (k == "Reference") {
                this.reference = v;
                delete this.properties[k];
            } else if (k == "Value") {
                this.value = v;
                delete this.properties[k];
            }
        });

        if (!this.reference?.length || !this.value?.length) {
            // Kicad 8.0 reference and value
            for (const pro of this.properties_kicad_8) {
                if (pro.name === "Reference") {
                    this.reference = pro.value;
                } else if (pro.name === "Value") {
                    this.value = pro.value;
                }
            }
        }

        // Kicad 7.0 reference and value
        if (!this.reference?.length || !this.value?.length) {
            for (const d of this.fp_texts) {
                if (d.type == "reference") {
                    this.reference = d.text;
                }
                if (d.type == "value") {
                    this.value = d.text;
                }
            }
        }
    }

    get uuid() {
        return this._uuid ?? this.tstamp;
    }

    set uuid(id: string | undefined) {
        this._uuid = id;
    }

    *items() {
        yield* this.drawings ?? [];
        yield* this.zones ?? [];
        yield* this.pads.values() ?? [];
        yield* this.fp_texts ?? [];
        yield* this.properties_kicad_8 ?? [];
    }

    get Reference() {
        return this.reference ?? this.properties["Reference"] ?? "";
    }

    get Value() {
        return this.value ?? this.properties["Value"] ?? "";
    }

    get Footprint() {
        return this.properties["Footprint"] ?? this.library_link ?? "";
    }

    get Datasheet() {
        return this.properties["Datasheet"] ?? "";
    }

    get Description() {
        return this.descr ?? this.properties["Description"] ?? "";
    }

    resolve_text_var(name: string): string | undefined {
        switch (name) {
            case "REFERENCE":
                return this.reference;
            case "VALUE":
                return this.value;
            case "LAYER":
                return this.layer;
            case "FOOTPRINT_LIBRARY":
                return this.library_link.split(":").at(0);
            case "FOOTPRINT_NAME":
                return this.library_link.split(":").at(-1);
        }

        const pad_expr = /^(NET_NAME|NET_CLASS|PIN_NAME)\(.+?\)$/.exec(name);

        if (pad_expr?.length == 3) {
            const [_, expr_type, pad_name] = pad_expr as unknown as [
                string,
                string,
                string,
            ];
            switch (expr_type) {
                case "NET_NAME":
                    return this.pad_by_number(pad_name)?.net?.number.toString();
                case "NET_CLASS":
                    return this.pad_by_number(pad_name)?.net?.name;
                case "PIN_NAME":
                    return this.pad_by_number(pad_name)?.pinfunction;
            }
        }

        if (this.properties[name] !== undefined) {
            return this.properties[name]!;
        }
        if (this.parent) return this.parent.resolve_text_var(name);
        return;
    }

    pad_by_number(number: string): Pad {
        return this.#pads_by_number.get(number)!;
    }

    /**
     * Get the nominal bounding box for this footprint.
     *
     * This does not take into account text drawings.
     */
    get bbox() {
        if (!this.#bbox) {
            // Based on FOOTPRINT::GetBoundingBox, excludes text items.

            // start with a small bbox centered on the footprint's position,
            // so that even if there aren't any items there's still *some*
            // footprint.
            let bbox = new BBox(
                this.at.position.x - 0.25,
                this.at.position.y - 0.25,
                0.5,
                0.5,
            );

            const matrix = Matrix3.translation(
                this.at.position.x,
                this.at.position.y,
            ).rotate_self(Angle.deg_to_rad(this.at.rotation));

            for (const item of this.drawings) {
                if (item instanceof FpText) {
                    continue;
                }

                bbox = BBox.combine([bbox, item.bbox.transform(matrix)]);
            }

            bbox.context = this;
            this.#bbox = bbox;
        }
        return this.#bbox;
    }
}

// The filled flag represents if a solid fill is present on Circle,
// rectangles and polygons
export type GraphicsFill = "none" | "solid" | "hatch" | "yes" | "no";
export const should_fill = (T: { fill?: GraphicsFill }) =>
    typeof T.fill !== "undefined" && (T.fill === "solid" || T.fill === "yes");

export class GraphicItem implements BoardNode {
    typeId: BoardNodeType = "GraphicItem";
    parent?: Footprint | Pad | Dimension | KicadPCB;
    layer: string;
    tstamp: string;
    locked = false;

    /**
     * Get the nominal bounding box for the item. This does not include any
     * stroke or other expansion.
     */
    get bbox() {
        return new BBox(0, 0, 0, 0);
    }
}

export class Line extends GraphicItem {
    static expr_start = "unset";

    start: Vec2;
    end: Vec2;
    width: number;
    stroke: Stroke;
    uuid?: string;

    constructor(
        data: B.I_Line,
        public override parent?: Footprint | Pad | Dimension | KicadPCB,
    ) {
        super();
        this.locked = data.locked;
        this.layer = data.layer;
        this.start = new Vec2(data.start.x, data.start.y);
        this.end = new Vec2(data.end.x, data.end.y);
        this.uuid = data.uuid;
        this.width = data.width;
        this.tstamp = data.tstamp ?? "";
        this.stroke = new Stroke(data.stroke);
        this.width ??= this.stroke?.width || 0;
    }

    override get bbox() {
        return BBox.from_points([this.start, this.end]);
    }
}

export class GrLine extends Line {
    static override expr_start = "gr_line";
}

export class FpLine extends Line {
    static override expr_start = "fp_line";
}

export class Circle extends GraphicItem {
    static expr_start = "unset";
    center: Vec2;
    end: Vec2;
    width: number;
    fill: GraphicsFill = "none";
    stroke: Stroke;
    uuid?: string;

    constructor(
        data: B.I_Circle,
        public override parent?: Footprint | Pad | Dimension | KicadPCB,
    ) {
        super();
        this.locked = data.locked;
        this.center = new Vec2(data.center.x, data.center.y);
        this.end = new Vec2(data.end.x, data.end.y);
        this.uuid = data.uuid;
        this.width = data.width;
        this.fill = data.fill;
        this.layer = data.layer;
        this.tstamp = data.tstamp ?? "";
        this.stroke = new Stroke(data.stroke);
        this.width ??= this.stroke?.width || 0;
    }

    override get bbox() {
        const radius = this.center.sub(this.end).magnitude;
        const radial = new Vec2(radius, radius);
        return BBox.from_points([
            this.center.sub(radial),
            this.center.add(radial),
        ]);
    }
}

export class GrCircle extends Circle {
    static override expr_start = "gr_circle";
}

export class FpCircle extends Circle {
    static override expr_start = "fp_circle";
}

export class Arc extends GraphicItem {
    static expr_start = "unset";
    start: Vec2;
    mid: Vec2;
    end: Vec2;
    width: number;
    stroke: Stroke;
    #arc: MathArc;
    uuid?: string;

    constructor(
        data: B.I_Arc,
        public override parent?: Footprint | Pad | Dimension | KicadPCB,
    ) {
        super();

        this.locked = data.locked;
        this.layer = data.layer;
        this.uuid = data.uuid;
        this.width = data.width;
        this.tstamp = data.tstamp ?? "";
        this.stroke = new Stroke(data.stroke);

        // Handle old format.
        // See LEGACY_ARC_FORMATTING and EDA_SHAPE::SetArcAngleAndEnd
        if (data?.angle !== undefined) {
            const angle = Angle.from_degrees(data.angle).normalize720();
            const center = new Vec2(data.start.x, data.start.y);
            let start = new Vec2(data.end.x, data.end.y);

            let end = angle.negative().rotate_point(start, center);

            if (angle.degrees < 0) {
                [start, end] = [end, start];
            }

            this.#arc = MathArc.from_center_start_end(
                center,
                start,
                end,
                data.width,
            );

            this.start = this.#arc.start_point;
            this.mid = this.#arc.mid_point;
            this.end = this.#arc.end_point;
        } else {
            this.start = new Vec2(data.start.x, data.start.y);
            this.mid = new Vec2(data.mid.x, data.mid.y);
            this.end = new Vec2(data.end.x, data.end.y);

            this.#arc = MathArc.from_three_points(
                this.start,
                this.mid,
                this.end,
                data.width,
            );
        }

        this.width ??= this.stroke?.width ?? this.#arc.width;
        this.#arc.width = this.width;
    }

    get arc() {
        return this.#arc;
    }

    override get bbox() {
        return this.arc.bbox;
    }
}

export class GrArc extends Arc {
    static override expr_start = "gr_arc";
}

export class FpArc extends Arc {
    static override expr_start = "fp_arc";
}

export class PolyArc extends Arc {
    static override expr_start = "arc";
}

export class Poly extends GraphicItem {
    static expr_start = "polygon";

    pts: (Vec2 | Arc)[];
    width: number;
    fill: GraphicsFill;
    island: boolean;
    stroke: Stroke;
    uuid?: string;

    constructor(
        data: B.I_Poly,
        public override parent?: Footprint | Pad | Dimension | KicadPCB,
    ) {
        super();
        this.locked = data.locked;
        this.layer = data.layer;
        this.island = data.island;
        this.uuid = data.uuid;
        this.width = data.width;
        this.fill = data.fill;
        this.tstamp = data.tstamp ?? "";
        this.stroke = new Stroke(data.stroke);

        // Convert pts array - can contain both Vec2 points and Arc objects
        this.pts = [];
        if (data.pts) {
            for (const pt of data.pts) {
                if ("mid" in pt) {
                    // It's an arc
                    this.pts.push(new Arc(pt, this.parent));
                } else {
                    // It's a Vec2
                    this.pts.push(new Vec2(pt.x, pt.y));
                }
            }
        }

        this.width ??= this.stroke?.width || 0;
    }

    get points() {
        const pts: Vec2[] = [];

        for (const it of this.pts) {
            if (it instanceof Vec2) {
                pts.push(it);
            } else {
                pts.push(...[it.start, it.mid, it.end]);
            }
        }

        return pts;
    }

    override get bbox(): BBox {
        return BBox.from_points(this.points);
    }
}

export class FilledPolygon extends Poly {
    static override expr_start = "filled_polygon";
}

export class GrPoly extends Poly {
    static override expr_start = "gr_poly";
}

export class FpPoly extends Poly {
    static override expr_start = "fp_poly";
}

export class Rect extends GraphicItem {
    static expr_start = "rect";

    start: Vec2;
    end: Vec2;
    width: number;
    fill: GraphicsFill = "none";
    stroke: Stroke;
    uuid?: string;

    constructor(
        data: B.I_Rect,
        public override parent?: Footprint | Pad | Dimension | KicadPCB,
    ) {
        super();
        this.locked = data.locked;
        this.start = new Vec2(data.start.x, data.start.y);
        this.end = new Vec2(data.end.x, data.end.y);
        this.uuid = data.uuid;
        this.layer = data.layer;
        this.width = data.width;
        this.fill = data.fill;
        this.tstamp = data.tstamp ?? "";
        this.stroke = new Stroke(data.stroke);
        this.width ??= this.stroke?.width || 0;
    }

    override get bbox(): BBox {
        return BBox.from_points([this.start, this.end]);
    }
}

export class GrRect extends Rect {
    static override expr_start = "gr_rect";
}

export class FpRect extends Rect {
    static override expr_start = "fp_rect";
}

export class TextRenderCache implements BoardNode {
    typeId: BoardNodeType = "TextRenderCache";
    text: string;
    angle: number;
    polygons: Poly[];
    uuid?: string;

    constructor(data?: B.I_TextRenderCache) {
        if (data) {
            this.text = data.text ?? "";
            this.angle = data.angle ?? 0;
            this.polygons = data.polygons?.map((p) => new Poly(p)) ?? [];
            this.uuid = data.uuid;
        } else {
            this.text = "";
            this.angle = 0;
            this.polygons = [];
        }

        for (const poly of this.polygons) {
            poly.fill = "solid";
        }
    }
}

export class Text implements BoardNode {
    typeId: BoardNodeType = "Text";
    parent?: Footprint | Dimension | KicadPCB;
    text: string;
    at: At;
    layer: { name: string; knockout: boolean };
    unlocked = false;
    hide = false;
    effects = new Effects();
    tstamp: string;
    render_cache?: TextRenderCache;
    uuid?: string;

    get shown_text() {
        // FIXME : AD HOC , for kicad 5.x design file
        if (!this.text) return "";
        return expand_text_vars(this.text, this.parent);
    }

    get bbox() {
        return new BBox(this.at.position.x, this.at.position.y, 0, 0);
    }
}

export class FpText extends Text {
    type: "reference" | "value" | "user";
    locked: boolean = false;

    constructor(
        data: B.I_FpText,
        public override parent?: Footprint,
    ) {
        super();
        this.type = data.type;
        this.locked = data.locked;
        this.text = data.text;
        this.at = new At(data.at);
        this.hide = data.hide;
        this.unlocked = data.unlocked;
        this.uuid = data.uuid;
        this.layer = data.layer;
        this.tstamp = data.tstamp ?? "";
        this.effects = new Effects(data.effects);
        this.render_cache = data.render_cache
            ? new TextRenderCache(data.render_cache)
            : undefined;
    }
}

export class Property_Kicad_8 {
    name: string;
    value: string;
    at: At;
    layer: string;
    unlocked = false;
    hide = false;
    effects = new Effects();
    tstamp: string;
    render_cache?: TextRenderCache;
    uuid?: string;
    locked: boolean = false;

    constructor(
        data: B.I_Property_Kicad_8,
        public parent?: Footprint,
    ) {
        this.name = data.name;
        this.value = data.value;
        this.layer = data.layer;
        this.at = new At(data.at);
        this.hide = data.hide;
        this.unlocked = data.unlocked;
        this.uuid = data.uuid;
        this.tstamp = data.tstamp ?? "";
        this.effects = new Effects(data.effects);
        this.render_cache = data.render_cache
            ? new TextRenderCache(data.render_cache)
            : undefined;
    }

    get shown_text() {
        return expand_text_vars(this.value, this.parent);
    }

    static readonly reference = "Reference";
    static readonly value = "Value";

    get type() {
        switch (this.name) {
            case Property_Kicad_8.reference:
                return "reference";
            case Property_Kicad_8.value:
                return "value";
            default:
                return "user";
        }
    }
}

export class GrText extends Text {
    locked: boolean = false;

    constructor(
        data: B.I_GrText,
        public override parent: Footprint | Dimension | KicadPCB,
    ) {
        super();
        this.locked = data.locked;
        this.text = data.text;
        this.at = new At(data.at);
        this.hide = data.hide;
        this.unlocked = data.unlocked;
        this.uuid = data.uuid;
        this.layer = data.layer;
        this.tstamp = data.tstamp ?? "";
        this.effects = new Effects(data.effects);
        this.render_cache = data.render_cache
            ? new TextRenderCache(data.render_cache)
            : undefined;
    }
}

export class Pad implements CrossHightAble, BoardNode {
    typeId: BoardNodeType = "Pad";
    public static MyHighlightColor = new Color(0, 100, 100);
    public get bbox() {
        const ccc = this.#bbox();

        const fp = this.parent;
        const M1 = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y,
        ).rotate(Angle.deg_to_rad(fp.at.rotation));

        const position_mat = Matrix3.translation(
            this.at.position.x,
            this.at.position.y,
        );
        position_mat.rotate_self(-Angle.deg_to_rad(this.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(this.at.rotation));
        if (this.drill?.offset) {
            position_mat.translate_self(
                this.drill.offset.x,
                this.drill.offset.y,
            );
        }

        return ccc.transform(position_mat).transform(M1);
    }

    #bbox() {
        const position_mat = Matrix3.translation(
            this.at.position.x,
            this.at.position.y,
        );

        position_mat.rotate_self(-Angle.deg_to_rad(this.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(this.at.rotation));

        const center = new Vec2(0, 0);
        switch (this.shape) {
            case "circle": {
                const r = this.size.x / 2;
                return new BBox(-r, -r, 2 * r, 2 * r);
            }
            case "rect":
            case "roundrect":
            case "trapezoid":
                return new BBox(
                    -this.size.x / 2,
                    -this.size.y / 2,
                    this.size.x,
                    this.size.y,
                );
            case "oval": {
                const pad_pos = center.add(
                    this.drill?.offset || new Vec2(0, 0),
                );
                return new BBox(
                    pad_pos.x - this.size.x / 2,
                    pad_pos.y - this.size.y / 2,
                    this.size.x,
                    this.size.y,
                );
            }

            default:
                return new BBox();
        }
    }

    number: string; // I hate this
    type: "thru_hole" | "smd" | "connect" | "np_thru_hole" = "thru_hole";
    shape: "circle" | "rect" | "oval" | "trapezoid" | "roundrect" | "custom";
    locked = false;
    at: At;
    size: Vec2;
    rect_delta: Vec2;
    layers: string[];
    roundrect_rratio: number;
    chamfer_ratio: number;
    chamfer?: {
        top_left?: boolean;
        top_right?: boolean;
        bottom_right?: boolean;
        bottom_left?: boolean;
    };
    pinfunction: string;
    pintype: string;
    solder_mask_margin: number;
    solder_paste_margin: number;
    solder_paste_margin_ratio: number;
    clearance: number;
    thermal_width: number;
    thermal_gap: number;
    thermal_bridge_angle: number;
    zone_connect: number;
    tstamp: string;
    drill?: PadDrill;
    net?: Net;
    options?: PadOptions;
    primitives: (GrLine | GrCircle | GrArc | GrRect | GrPoly)[];

    public get highlightColor() {
        return Pad.MyHighlightColor;
    }

    public highlighted: boolean = false;

    public get index() {
        return `pad_${this.number}`;
    }

    public get cross_index() {
        return `symbol_pin_${this.number}`;
    }

    constructor(
        data: B.I_Pad,
        public parent: Footprint,
    ) {
        this.number = data.number;
        this.type = data.type;
        this.shape = data.shape;
        this.at = new At(data.at);
        this.locked = data.locked;
        this.size = new Vec2(data.size?.x ?? 0, data.size?.y ?? 0);
        this.rect_delta = data.rect_delta
            ? new Vec2(data.rect_delta.x, data.rect_delta.y)
            : new Vec2(0, 0);
        this.layers = data.layers;
        this.roundrect_rratio = data.roundrect_rratio;
        this.chamfer_ratio = data.chamfer_ratio;
        this.chamfer = data.chamfer;
        this.pinfunction = data.pinfunction;
        this.pintype = data.pintype;
        this.solder_mask_margin = data.solder_mask_margin;
        this.solder_paste_margin = data.solder_paste_margin;
        this.solder_paste_margin_ratio = data.solder_paste_margin_ratio;
        this.clearance = data.clearance;
        this.thermal_width = data.thermal_width;
        this.thermal_gap = data.thermal_gap;
        this.thermal_bridge_angle = data.thermal_bridge_angle;
        this.zone_connect = data.zone_connect;
        this.tstamp = data.tstamp ?? "";
        this.drill = data.drill ? new PadDrill(data.drill) : undefined;
        this.net = data.net ? new Net(data.net) : undefined;
        this.options = data.options ? new PadOptions(data.options) : undefined;

        // Convert primitives array - can contain GrLine, GrCircle, GrArc, GrRect, GrPoly
        this.primitives = [];
        if (data.primitives) {
            for (const prim of data.primitives) {
                if ("center" in prim) {
                    this.primitives.push(new GrCircle(prim, this));
                } else if ("mid" in prim) {
                    this.primitives.push(new GrArc(prim, this));
                } else if ("pts" in prim) {
                    this.primitives.push(new GrPoly(prim, this));
                } else if ("fill" in prim) {
                    this.primitives.push(new GrRect(prim, this));
                } else {
                    this.primitives.push(new GrLine(prim, this));
                }
            }
        }
    }
}

export class PadDrill implements BoardNode {
    typeId: BoardNodeType = "PadDrill";
    oval = false;
    diameter = 0;
    width = 0;
    offset: Vec2 = new Vec2(0, 0);

    constructor(data?: B.I_PadDrill) {
        if (data) {
            this.oval = data.oval ?? false;
            this.diameter = data.diameter ?? 0;
            this.width = data.width ?? 0;
            this.offset = new Vec2(data.offset?.x ?? 0, data.offset?.y ?? 0);
        }
    }
}

export class PadOptions {
    clearance: "outline" | "convexhull";
    anchor: "rect" | "circle";

    constructor(data?: B.I_PadOptions) {
        if (data) {
            this.clearance = data.clearance ?? "outline";
            this.anchor = data.anchor ?? "rect";
        } else {
            this.clearance = "outline";
            this.anchor = "rect";
        }
    }
}

export class Model {
    filename: string;
    offset: { xyz: number[] };
    scale: { xyz: number[] };
    rotate: { xyz: number[] };
    hide = false;
    opacity = 1;

    constructor(data: B.I_Model) {
        this.filename = data.filename;
        this.offset = data.offset;
        this.scale = data.scale;
        this.rotate = data.rotate;
        this.hide = data.hide;
        this.opacity = data.opacity;
    }
}

export class Group {
    name: string;
    id: string;
    locked = false;
    members: string[];

    constructor(data: B.I_Group) {
        this.name = data.name;
        this.id = data.id;
        this.locked = data.locked;
        this.members = data.members;
    }
}
