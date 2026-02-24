import type {
    I_At,
    I_Effects,
    I_Stroke,
    I_TitleBlock,
    I_Paper,
} from "./common";

export interface I_Layer {
    ordinal: number;
    canonical_name: string;
    type: "jumper" | "mixed" | "power" | "signal" | "user";
    user_name?: string;
    uuid?: string;
}

export interface I_StackupLayer {
    name: string;
    type: string;
    color: string;
    thickness: number;
    material: string;
    epsilon_r: number;
    loss_tangent: number;
    uuid?: string;
}

export interface I_Stackup {
    layers?: I_StackupLayer[];
    copper_finish?: string;
    dielectric_constraints?: boolean;
    edge_connector?: string;
    castellated_pads?: boolean;
    edge_plating?: boolean;
}

export interface I_PCBPlotParams {
    layerselection: number;
    disableapertmacros: boolean;
    usegerberextensions: boolean;
    usegerberattributes: boolean;
    usegerberadvancedattributes: boolean;
    creategerberjobfile: boolean;
    gerberprecision: number;
    svguseinch: boolean;
    svgprecision: number;
    excludeedgelayer: boolean;
    plotframeref: boolean;
    viasonmask: boolean;
    mode: number;
    useauxorigin: boolean;
    hpglpennumber: number;
    hpglpenspeed: number;
    hpglpendiameter: number;
    dxfpolygonmode: boolean;
    dxfimperialunits: boolean;
    dxfusepcbnewfont: boolean;
    psnegative: boolean;
    psa4output: boolean;
    plotreference: boolean;
    plotvalue: boolean;
    plotinvisibletext: boolean;
    sketchpadsonfab: boolean;
    subtractmaskfromsilk: boolean;
    outputformat: number;
    mirror: boolean;
    drillshape: number;
    scaleselection: number;
    outputdirectory: string;
    plot_on_all_layers_selection: number;
    dashed_line_dash_ratio: number;
    dashed_line_gap_ratio: number;
    pdf_front_fp_property_popups: boolean;
    pdf_back_fp_property_popups: boolean;
    plotfptext: boolean;
    uuid?: string;
}

export interface I_Setup {
    pad_to_mask_clearance: number;
    solder_mask_min_width: number;
    pad_to_paste_clearance: number;
    pad_to_paste_clearance_ratio: number;
    aux_axis_origin: { x: number; y: number };
    grid_origin: { x: number; y: number };
    pcbplotparams: I_PCBPlotParams;
    stackup: I_Stackup;
    uuid?: string;
    allow_soldermask_bridges_in_footprints?: boolean;
}

export interface I_Net {
    number: number;
    name: string;
}

export interface I_GraphicItem {
    layer: string;
    tstamp: string;
    locked: boolean;
    uuid?: string;
}

export interface I_Line extends I_GraphicItem {
    start: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    stroke: I_Stroke;
}

export interface I_Circle extends I_GraphicItem {
    center: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    fill: "none" | "solid" | "hatch" | "yes" | "no";
    stroke: I_Stroke;
}

export interface I_Arc extends I_GraphicItem {
    start: { x: number; y: number };
    mid: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    stroke: I_Stroke;
    angle?: number;
}

export interface I_Poly extends I_GraphicItem {
    pts: ({ x: number; y: number } | I_Arc)[];
    width: number;
    fill: "none" | "solid" | "hatch" | "yes" | "no";
    island: boolean;
    stroke: I_Stroke;
}

export interface I_Rect extends I_GraphicItem {
    start: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    fill: "none" | "solid" | "hatch" | "yes" | "no";
    stroke: I_Stroke;
}

export interface I_TextRenderCache {
    text?: string;
    angle?: number;
    polygons?: I_Poly[];
    uuid?: string;
}

export interface I_Text {
    text: string;
    at: I_At;
    layer: { name: string; knockout: boolean };
    unlocked: boolean;
    hide: boolean;
    effects: I_Effects;
    tstamp: string;
    render_cache?: I_TextRenderCache;
    uuid?: string;
}

export interface I_FpText extends I_Text {
    type: "reference" | "value" | "user";
    locked: boolean;
}

export interface I_GrText extends I_Text {
    locked: boolean;
}

export interface I_PadDrill {
    oval?: boolean;
    diameter?: number;
    width?: number;
    offset?: { x: number; y: number };
}

export interface I_PadOptions {
    clearance?: "outline" | "convexhull";
    anchor?: "rect" | "circle";
}

export interface I_Pad {
    number: string;
    type: "thru_hole" | "smd" | "connect" | "np_thru_hole";
    shape: "circle" | "rect" | "oval" | "trapezoid" | "roundrect" | "custom";
    locked: boolean;
    at: I_At;
    size: { x: number; y: number };
    rect_delta: { x: number; y: number };
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
    drill?: I_PadDrill;
    net?: I_Net;
    options?: I_PadOptions;
    primitives: (I_Line | I_Circle | I_Arc | I_Rect | I_Poly)[];
    tstamp: string;
}

export interface I_Model {
    filename: string;
    offset: { xyz: number[] };
    scale: { xyz: number[] };
    rotate: { xyz: number[] };
    hide: boolean;
    opacity: number;
}

export interface I_Footprint {
    library_link: string;
    version: number;
    generator: string;
    locked: boolean;
    placed: boolean;
    layer: string;
    tedit: string;
    tstamp: string;
    at: I_At;
    uuid?: string;
    descr: string;
    tags: string;
    sheetname: string;
    sheetfile: string;
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
    };
    properties: Record<string, string>;
    drawings: (I_Line | I_Circle | I_Arc | I_Poly | I_Rect)[];
    fp_texts: I_FpText[];
    zones: I_Zone[];
    models: I_Model[];
    pads: I_Pad[];
    properties_kicad_8: I_Property_Kicad_8[];
}

export interface I_Property_Kicad_8 {
    name: string;
    value: string;
    at: I_At;
    layer: string;
    unlocked: boolean;
    hide: boolean;
    effects: I_Effects;
    tstamp: string;
    render_cache?: I_TextRenderCache;
    uuid?: string;
    text: string;
}

export interface I_ZoneKeepout {
    tracks?: "allowed" | "not_allowed";
    vias?: "allowed" | "not_allowed";
    pads?: "allowed" | "not_allowed";
    copperpour?: "allowed" | "not_allowed";
    footprints?: "allowed" | "not_allowed";
    uuid?: string;
}

export interface I_ZoneFill {
    fill?: boolean;
    mode?: "solid" | "hatch";
    thermal_gap?: number;
    thermal_bridge_width?: number;
    smoothing?: {
        style?: "none" | "chamfer" | "fillet";
        radius?: number;
    };
    radius?: number;
    island_removal_mode?: 0 | 1 | 2;
    island_area_min?: number;
    hatch_thickness?: number;
    hatch_gap?: number;
    hatch_orientation?: number;
    hatch_smoothing_level?: 0 | 1 | 2 | 3;
    hatch_smoothing_value?: number;
    hatch_border_algorithm?: "hatch_thickness" | "min_thickness";
    hatch_min_hole_area?: number;
    uuid?: string;
}

export interface I_Zone {
    locked: boolean;
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
    keepout?: I_ZoneKeepout;
    fill?: I_ZoneFill;
    polygons: I_Poly[];
    filled_polygons?: I_Poly[];
    tstamp: string;
    uuid?: string;
}

export interface I_LineSegment {
    start: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    layer: string;
    net: number;
    locked: boolean;
    tstamp: string;
    uuid?: string;
}

export interface I_ArcSegment {
    start: { x: number; y: number };
    mid: { x: number; y: number };
    end: { x: number; y: number };
    width: number;
    layer: string;
    net: number;
    locked: boolean;
    tstamp: string;
    uuid?: string;
}

export interface I_Via {
    type: "blind" | "micro" | "through-hole";
    at: I_At;
    size: number;
    drill: number;
    layers: string[];
    remove_unused_layers: boolean;
    keep_end_layers: boolean;
    locked: boolean;
    free: boolean;
    net: number;
    tstamp: string;
    uuid?: string;
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

export interface I_DimensionFormat {
    prefix: string;
    suffix: string;
    units: DimensionFormatUnits;
    units_format: DimensionFormatUnitsFormat;
    precision: number;
    override_value: string;
    suppress_zeroes: boolean;
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

export interface I_DimensionStyle {
    thickness: number;
    arrow_length: number;
    text_position_mode: DimensionStyleTextPositionMode;
    extension_height: number;
    text_frame: DimensionStyleTextFrame;
    extension_offset: number;
    keep_text_aligned: boolean;
}

export interface I_Dimension {
    locked: boolean;
    type: "aligned" | "leader" | "center" | "orthogonal" | "radial";
    layer: string;
    tstamp: string;
    pts: { x: number; y: number }[];
    height: number;
    orientation: number;
    leader_length: number;
    gr_text: I_GrText;
    format: I_DimensionFormat;
    style: I_DimensionStyle;
}

export interface I_Group {
    name: string;
    id: string;
    locked: boolean;
    members: string[];
}

export interface I_KicadPCB {
    version: number;
    generator?: string;
    general?: { thickness: number; legacy_teardrops?: boolean };
    paper?: I_Paper;
    title_block: I_TitleBlock;
    setup?: I_Setup;
    properties?: Record<string, { name: string; value: string }>;
    layers: I_Layer[];
    nets: I_Net[];
    footprints: I_Footprint[];
    zones: I_Zone[];
    segments: (I_LineSegment | I_ArcSegment)[];
    vias: I_Via[];
    drawings: (
        | I_Line
        | I_Circle
        | I_Arc
        | I_Poly
        | I_Rect
        | I_GrText
        | I_Dimension
    )[];
    groups: I_Group[];
}
