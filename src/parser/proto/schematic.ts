import type {
    I_At,
    I_Color,
    I_Effects,
    I_Stroke,
    I_TitleBlock,
    I_Paper,
} from "./common";

export interface I_Fill {
    type: "none" | "outline" | "background" | "color";
    color?: I_Color;
}

export interface I_GraphicItem {
    private?: boolean;
    stroke?: I_Stroke;
    fill?: I_Fill;
    uuid?: string;
}

export interface I_Wire {
    pts: { x: number; y: number }[];
    uuid: string;
    stroke: I_Stroke;
}

export interface I_Bus {
    pts: { x: number; y: number }[];
    uuid: string;
    stroke: I_Stroke;
}

export interface I_BusEntry {
    at: I_At;
    size: { x: number; y: number };
    uuid: string;
    stroke: I_Stroke;
}

export interface I_BusAlias {
    name: string;
    members: string[];
}

export interface I_Junction {
    at: I_At;
    diameter?: number;
    color?: I_Color;
    uuid: string;
}

export interface I_NoConnect {
    at: I_At;
    uuid: string;
}

export interface I_Arc extends I_GraphicItem {
    start: { x: number; y: number };
    mid: { x: number; y: number };
    end: { x: number; y: number };
}

export interface I_Bezier extends I_GraphicItem {
    pts: { x: number; y: number }[];
}

export interface I_Circle extends I_GraphicItem {
    center: { x: number; y: number };
    radius: number;
}

export interface I_Polyline extends I_GraphicItem {
    pts: { x: number; y: number }[];
}

export interface I_Rectangle extends I_GraphicItem {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

export interface I_Image {
    uuid?: string;
    at: I_At;
    data: string;
    scale: number;
    ppi: number | null;
}

export interface I_Text {
    text: string;
    at: I_At;
    effects: I_Effects;
    uuid?: string;
    exclude_from_sim?: boolean;
}

export interface I_TextBox extends I_GraphicItem {
    text: string;
    at: I_At;
    size: { x: number; y: number };
    effects: I_Effects;
}

export interface I_Label {
    text: string;
    at: I_At;
    effects: I_Effects;
    fields_autoplaced: boolean;
    uuid?: string;
}

export interface I_NetLabel extends I_Label {}

export type LabelShapes =
    | "input"
    | "output"
    | "bidirectional"
    | "tri_state"
    | "passive"
    | "dot"
    | "round"
    | "diamond"
    | "rectangle";

export interface I_Property {
    name: string;
    text: string;
    id: number;
    at: I_At;
    show_name: boolean;
    do_not_autoplace: boolean;
    hide: boolean;
    effects: I_Effects;
}

export interface I_GlobalLabel extends I_Label {
    shape: LabelShapes;
    properties: I_Property[];
}

export interface I_HierarchicalLabel extends I_Label {
    shape: LabelShapes;
}

export interface I_HierarchicalSheetPin extends I_HierarchicalLabel {}

export type PinElectricalType =
    | "input"
    | "output"
    | "bidirectional"
    | "tri_state"
    | "passive"
    | "unspecified"
    | "power_in"
    | "power_out"
    | "open_collector"
    | "open_emitter"
    | "unconnected"
    | "no_connect"
    | "free";

export type PinShape =
    | "line"
    | "inverted"
    | "clock"
    | "inverted_clock"
    | "input_low"
    | "clock_low"
    | "output_low"
    | "edge_clock_high"
    | "non_logic";

export interface I_PinAlternate {
    name: string;
    type: PinElectricalType;
    shape: PinShape;
}

export interface I_PinInfo {
    text: string;
    effects: I_Effects;
}

export interface I_Pin {
    type: PinElectricalType;
    shape: PinShape;
    hide: boolean;
    at: I_At;
    length: number;
    name: I_PinInfo;
    number: I_PinInfo;
    alternates?: I_PinAlternate[];
}

export interface I_LibSymbol {
    name: string;
    power: boolean;
    pin_numbers: {
        hide: boolean;
    };
    pin_names: {
        offset: number;
        hide: boolean;
    };
    in_bom: boolean;
    on_board: boolean;
    embedded_fonts: boolean;
    embedded_files: string | undefined;
    properties: I_Property[];
    children: I_LibSymbol[];
    drawings: (
        | I_Arc
        | I_Bezier
        | I_Circle
        | I_Polyline
        | I_Rectangle
        | I_Text
        | I_TextBox
    )[];
    pins: I_Pin[];
    exclude_from_sim: boolean;
}

export interface I_PinInstance {
    number: string;
    uuid: string;
    alternate: string;
}

export interface I_SchematicSymbolInstance {
    path: string;
    project?: string;
    reference?: string;
    value?: string;
    unit?: number;
    footprint?: string;
}

export interface I_SchematicSymbol {
    uuid: string;
    lib_name?: string;
    lib_id: string;
    at: I_At;
    mirror?: "x" | "y";
    unit: number;
    convert: number;
    in_bom: boolean;
    on_board: boolean;
    dnp: boolean;
    fields_autoplaced: boolean;
    properties: I_Property[];
    pins: I_PinInstance[];
    exclude_from_sim: boolean;
    default_instance: {
        reference: string;
        unit: string;
        value: string;
        footprint: string;
    };
    instances: {
        projects: { name: string; paths: I_SchematicSymbolInstance[] }[];
    };
}

export interface I_SchematicSheetPin {
    at: I_At;
    name: string;
    shape: LabelShapes;
    effects: I_Effects;
    uuid: string;
}

export interface I_SchematicSheetInstance {
    path: string;
    page?: string;
}

export interface I_SchematicSheet {
    at: I_At;
    size: { x: number; y: number };
    fields_autoplaced: boolean;
    stroke: I_Stroke;
    fill: I_Fill;
    properties: I_Property[];
    pins: I_SchematicSheetPin[];
    uuid: string;
    instances: {
        projects: { name: string; paths: I_SchematicSheetInstance[] }[];
    };
}

export interface I_SheetInstance {
    page: string;
    path: string;
}

export interface I_SymbolInstance {
    path: string;
    reference: string;
    unit: number;
    value: string;
    footprint: string;
}

export interface I_KicadSch {
    version: number;
    generator?: string;
    generator_version: string;
    uuid: string;
    paper?: I_Paper;
    title_block: I_TitleBlock;
    lib_symbols: I_LibSymbol[];
    wires: I_Wire[];
    buses: I_Bus[];
    bus_entries: I_BusEntry[];
    bus_aliases: I_BusAlias[];
    junctions: I_Junction[];
    net_labels: I_NetLabel[];
    global_labels: I_GlobalLabel[];
    hierarchical_labels: I_HierarchicalLabel[];
    symbols: I_SchematicSymbol[];
    no_connects: I_NoConnect[];
    drawings: (I_Polyline | I_Rectangle | I_Arc | I_Text)[];
    images: I_Image[];
    sheet_instances?: I_SheetInstance[];
    symbol_instances?: I_SymbolInstance[];
    sheets: I_SchematicSheet[];
}
