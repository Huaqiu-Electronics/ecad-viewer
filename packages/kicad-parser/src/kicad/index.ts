/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

// Board-related exports
export {
    KicadPCB,
    LineSegment,
    ArcSegment,
    Via,
    Zone,
    ZoneKeepout,
    ZoneFill,
    Layer,
    Setup,
    PCBPlotParams,
    Stackup,
    StackupLayer,
    Net,
    Dimension,
    DimensionFormatUnits,
    DimensionFormatUnitsFormat,
    DimensionFormat,
    DimensionStyleTextPositionMode,
    DimensionStyleTextFrame,
    DimensionStyle,
    Footprint,
    should_fill,
    Line,
    GrLine,
    FpLine,
    GrCircle,
    FpCircle,
    GrArc,
    FpArc,
    PolyArc,
    Poly,
    FilledPolygon,
    GrPoly,
    FpPoly,
    Rect,
    GrRect,
    FpRect,
    TextRenderCache,
    FpText,
    Property_Kicad_8,
    GrText,
    Pad,
    PadDrill,
    PadOptions,
    Model,
    type BoardNode
} from "./board";
export type { GraphicsFill, Drawing } from "./board";

// Schematic-related exports
export {
    KicadSch,
    DefaultValues,
    Fill,
    Wire,
    Bus,
    BusEntry,
    BusAlias,
    Junction,
    NoConnect,
    Bezier,
    Polyline,
    Rectangle,
    Image,
    LibText,
    TextBox,
    Label,
    NetLabel,
    GlobalLabel,
    HierarchicalLabel,
    HierarchicalSheetPin,
    LibSymbols,
    LibSymbol,
    Property,
    PinInfo,
    PinDefinition,
    PinAlternate,
    SchematicSymbol,
    SchematicSymbolInstance,
    PinInstance,
    LibSymbolPin,
    SheetInstances,
    SheetInstance,
    SymbolInstances,
    SymbolInstance,
    SchematicSheet,
    SchematicSheetPin,
    SchematicSheetInstance,
    type SchematicNode
} from "./schematic";
export type { PinElectricalType, PinShape } from "./schematic";

// Drawing sheet exports
export { DrawingSheet, type DrawingSheetDocument } from "./drawing_sheet";

// Other exports
export { ProjectSettings } from "./project-settings";
export {
    Depth,
    type BoardSelectable,
    type BoardInspectItem,
    type BoardInteractiveItem,
    BoxInteractiveItem,
    FootprintInteractiveItem,
    type BoardLine,
    LineInteractiveItem,
    type NetProperty,
    type NetInfo,
    BoardBBoxVisitor
} from "./board_bbox_visitor";
export type {
    Theme,
    BaseTheme,
    BoardTheme,
    SchematicTheme,
    BoardOrSchematicTheme,
} from "./theme";
export {
    At,
    Effects,
    Paper,
    Stroke,
    TitleBlock,
    expand_text_vars,
    Font
} from "./common";












