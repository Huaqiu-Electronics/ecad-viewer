/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DrawingSheet } from ".";
import { Color } from "../base/color";
import type { CrossHightAble } from "../base/cross_highlight_able";
import type { HighlightAble } from "../base/highlightable";
import type { IndexAble } from "../base/index_able";
import { BBox, Matrix3, Vec2 } from "../base/math";
import { html } from "../base/web-components";
import {
    At,
    Effects,
    Paper,
    Stroke,
    TitleBlock,
    expand_text_vars,
    unescape_string,
} from "./common";
import { get_image_ppi } from "./get_image_ppi";
import * as S from "../parser/proto/schematic";

/* Default values for various things found in schematics
 * From EESchema's default_values.h, converted from mils to mm. */
export const DefaultValues = {
    /* The size of the rectangle indicating an unconnected wire or label */
    dangling_symbol_size: 0.3048, // 12 mils

    /* The size of the rectangle indicating a connected, unselected wire end */
    unselected_end_size: 0.1016, // 4 mils

    pin_length: 2.54, // 100 mils
    pinsymbol_size: 0.635, // 25 mils
    pinnum_size: 1.27, // 50 mils
    pinname_size: 1.27, // 50 mils
    selection_thickness: 0.0762, // 3 mils
    line_width: 0.1524, // 6 mils
    wire_width: 0.1524, // 6 mils
    bus_width: 0.3048, // 12 mils
    noconnect_size: 1.2192, // 48 mils
    junction_diameter: 0.9144, // 36 mils
    target_pin_radius: 0.381, // 15 mils

    /* The default bus and wire entry size. */
    sch_entry_size: 2.54, // 100 mils

    text_size: 1.27, // 50 mils

    /* Ratio of the font height to the baseline of the text above the wire. */
    text_offset_ratio: 0.15, // unitless ratio

    /* Ratio of the font height to space around global labels */
    label_size_ratio: 0.375, // unitless ratio

    /* The offset of the pin name string from the end of the pin in mils. */
    pin_name_offset: 0.508, // 20 mils
};

export class KicadSch {
    version: number;
    generator?: string;
    uuid: string;
    paper?: Paper;
    title_block = new TitleBlock();
    lib_symbols?: LibSymbols;
    generator_version: string;
    wires: Wire[] = [];
    buses: Bus[] = [];
    bus_entries: BusEntry[] = [];
    bus_aliases: BusAlias[] = [];
    junctions: Junction[] = [];
    net_labels: NetLabel[] = [];
    global_labels: GlobalLabel[] = [];
    hierarchical_labels: HierarchicalLabel[] = [];
    symbols = new Map<string, SchematicSymbol>();
    no_connects: NoConnect[] = [];
    drawings: Drawing[] = [];
    images: Image[] = [];
    sheet_instances?: SheetInstances;
    symbol_instances?: SymbolInstances;
    sheets: SchematicSheet[] = [];
    is_converted_from_ad = false;

    public get bbox() {
        return DrawingSheet.default().page_bbox;
    }

    constructor(
        public filename: string,
        data: S.I_KicadSch,
    ) {
        this.version = data.version;
        this.generator = data.generator;
        this.generator_version = data.generator_version;
        this.uuid = data.uuid;
        this.paper = data.paper ? new Paper(data.paper) : undefined;
        this.title_block = new TitleBlock(data.title_block);
        this.lib_symbols = data.lib_symbols
            ? new LibSymbols(data.lib_symbols, this)
            : undefined;
        this.wires = data.wires?.map((w) => new Wire(w)) ?? [];
        this.buses = data.buses?.map((b) => new Bus(b)) ?? [];
        this.bus_entries = data.bus_entries?.map((e) => new BusEntry(e)) ?? [];
        this.bus_aliases = data.bus_aliases?.map((a) => new BusAlias(a)) ?? [];
        this.junctions = data.junctions?.map((j) => new Junction(j)) ?? [];
        this.no_connects = data.no_connects?.map((n) => new NoConnect(n)) ?? [];
        this.net_labels =
            data.net_labels?.map((l) => new NetLabel(l, this)) ?? [];
        this.global_labels =
            data.global_labels?.map((l) => new GlobalLabel(l, this)) ?? [];
        this.hierarchical_labels =
            data.hierarchical_labels?.map(
                (l) => new HierarchicalLabel(l, this),
            ) ?? [];

        this.symbols = new Map();
        if (data.symbols) {
            for (const sym of data.symbols) {
                this.symbols.set(sym.uuid, new SchematicSymbol(sym, this));
            }
        }

        this.drawings = [];
        if (data.drawings) {
            for (const d of data.drawings) {
                if ("pts" in d && "start" in (d as any)) {
                    this.drawings.push(new Bezier(d as any, this));
                } else if ("pts" in d) {
                    this.drawings.push(new Polyline(d as any, this));
                } else if ("start" in d) {
                    this.drawings.push(new Rectangle(d as any, this));
                } else if ("mid" in d) {
                    this.drawings.push(new Arc(d as any, this));
                } else if ("text" in d) {
                    this.drawings.push(new Text(d as any, this));
                } else if ("center" in d) {
                    this.drawings.push(new Circle(d as any, this));
                } else if ("size" in d) {
                    this.drawings.push(new TextBox(d as any, this));
                }
            }
        }

        this.images = data.images?.map((i) => new Image(i)) ?? [];
        this.sheet_instances = data.sheet_instances
            ? new SheetInstances(data.sheet_instances)
            : undefined;
        this.symbol_instances = data.symbol_instances
            ? new SymbolInstances(data.symbol_instances)
            : undefined;
        this.sheets =
            data.sheets?.map((s) => new SchematicSheet(s, this)) ?? [];
    }

    *getChildren() {
        for (const i of this.items()) yield i;
    }

    get labels() {
        return [
            ...this.global_labels,
            ...this.net_labels,
            ...this.hierarchical_labels,
        ];
    }

    get sheet_pins() {
        const pins = new Map<string, HierarchicalSheetPin[]>();
        for (const it of this.sheets)
            pins.set(it.sheetfile!, it.hierarchicalSheetPins);
        return pins;
    }

    *items() {
        yield new BBox(0, 0, this.paper?.width, this.paper?.height);
        yield* this.wires;
        yield* this.buses;
        yield* this.bus_entries;
        yield* this.junctions;
        yield* this.net_labels;
        yield* this.global_labels;
        yield* this.hierarchical_labels;
        yield* this.no_connects;
        yield* this.symbols.values();
        yield* this.drawings;
        yield* this.images;
        yield* this.sheets;

        for (const it of this.symbols) {
            for (const i of it[1].unit_pins) yield i;
        }

        for (const it of this.sheets)
            for (const i of it.hierarchicalSheetPins) {
                yield i;
            }
    }

    find_symbol(uuid_or_ref: string) {
        if (this.symbols.has(uuid_or_ref)) {
            return this.symbols.get(uuid_or_ref)!;
        }
        for (const sym of this.symbols.values()) {
            if (sym.uuid == uuid_or_ref || sym.reference == uuid_or_ref) {
                return sym;
            }
        }
        return null;
    }

    find_sheet(uuid: string) {
        for (const sheet of this.sheets) {
            if (sheet.uuid == uuid) {
                return sheet;
            }
        }
        return null;
    }

    resolve_text_var(name: string): string | undefined {
        if (name == "FILENAME") {
            return this.filename;
        }

        // Cross-reference
        if (name.includes(":")) {
            const [uuid, field_name] = name.split(":") as [string, string];
            const symbol = this.symbols.get(uuid);

            if (symbol) {
                return symbol.resolve_text_var(field_name);
            }
        }

        return this.title_block.resolve_text_var(name);
    }
}

export class Fill {
    type: "none" | "outline" | "background" | "color";
    color: Color;

    constructor(data: S.I_Fill) {
        this.type = data.type;
        if (data.color) {
            this.color = new Color(
                data.color.r,
                data.color.g,
                data.color.b,
                data.color.a,
            );
        } else {
            this.color = Color.transparent_black;
        }
    }
}

export class GraphicItem {
    parent?: LibSymbol | SchematicSymbol | KicadSch;
    private = false;
    stroke?: Stroke;
    fill?: Fill;
    uuid?: string;

    constructor(
        parent?: LibSymbol | SchematicSymbol | KicadSch,
        data?: S.I_GraphicItem,
    ) {
        this.parent = parent;
        if (data) {
            this.private = data.private ?? false;
            this.stroke = data.stroke ? new Stroke(data.stroke) : undefined;
            this.fill = data.fill ? new Fill(data.fill) : undefined;
            this.uuid = data.uuid;
        }
    }

    static common_expr_defs = [];
}

export class Wire {
    pts: Vec2[];
    uuid: string;
    stroke: Stroke;

    constructor(data: S.I_Wire) {
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
        this.stroke = new Stroke(data.stroke);
        this.uuid = data.uuid;
    }
}

export class Bus {
    pts: Vec2[];
    uuid: string;
    stroke: Stroke;

    constructor(data: S.I_Bus) {
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
        this.stroke = new Stroke(data.stroke);
        this.uuid = data.uuid;
    }
}

export class BusEntry {
    at: At;
    size: Vec2;
    uuid: string;
    stroke: Stroke;

    constructor(data: S.I_BusEntry) {
        this.at = new At(data.at);
        this.size = new Vec2(data.size.x, data.size.y);
        this.stroke = new Stroke(data.stroke);
        this.uuid = data.uuid;
    }
}

export class BusAlias {
    name: string;
    members: string[] = [];

    constructor(data: S.I_BusAlias) {
        this.name = data.name;
        this.members = data.members;
    }
}

export class Junction {
    at: At;
    diameter?: number;
    color?: Color;
    uuid: string;

    constructor(data: S.I_Junction) {
        this.at = new At(data.at);
        this.diameter = data.diameter;
        if (data.color) {
            this.color = new Color(
                data.color.r,
                data.color.g,
                data.color.b,
                data.color.a,
            );
        }
        this.uuid = data.uuid;
    }
}

export class NoConnect {
    at: At;
    uuid: string;

    constructor(data: S.I_NoConnect) {
        this.at = new At(data.at);
        this.uuid = data.uuid;
    }
}

type Drawing = Arc | Bezier | Circle | Polyline | Rectangle | Text | TextBox;

export class Arc extends GraphicItem {
    start: Vec2;
    mid: Vec2;
    end: Vec2;

    constructor(
        data: S.I_Arc,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        super(parent, data);
        this.start = new Vec2(data.start.x, data.start.y);
        this.mid = new Vec2(data.mid.x, data.mid.y);
        this.end = new Vec2(data.end.x, data.end.y);
    }
}

export class Bezier extends GraphicItem {
    pts: Vec2[];

    constructor(
        data: S.I_Bezier,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        /* TODO: this was added in KiCAD 7 */
        super(parent, data);
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
    }

    get start() {
        return this.pts[0];
    }

    get c1() {
        return this.pts[1];
    }

    get c2() {
        return this.pts[2];
    }

    get end() {
        return this.pts[3];
    }
}

export class Circle extends GraphicItem {
    center: Vec2;
    radius: number;

    constructor(
        data: S.I_Circle,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        super(parent, data);
        this.center = new Vec2(data.center.x, data.center.y);
        this.radius = data.radius;
    }
}

export class Polyline extends GraphicItem {
    pts: Vec2[];

    constructor(
        data: S.I_Polyline,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        super(parent, data);
        this.pts = data.pts?.map((p) => new Vec2(p.x, p.y)) ?? [];
    }
}

export class Rectangle extends GraphicItem {
    start: Vec2;
    end: Vec2;

    constructor(
        data: S.I_Rectangle,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        super(parent, data);
        this.start = new Vec2(data.start.x, data.start.y);
        this.end = new Vec2(data.end.x, data.end.y);
    }

    get bbox() {
        return BBox.from_points([this.start, this.end]);
    }
}

export class Image {
    uuid?: string;
    at: At;
    data: string;
    scale: number = 1;
    ppi: number | null = null;
    #img: HTMLImageElement;

    get img() {
        return this.#img;
    }

    constructor(
        data: S.I_Image,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        this.at = new At(data.at);
        this.data = data.data;
        this.scale = data.scale;
        this.uuid = data.uuid;

        if (this.data) {
            this.ppi = get_image_ppi(this.data);
        }

        this.#img = html` <img
            src="data:image/png;base64,  ${this
                .data}  " />` as HTMLImageElement;
    }
}

export class Text {
    private = false;
    text: string;
    at: At;
    effects = new Effects();
    uuid?: string;
    exclude_from_sim?: boolean;

    constructor(
        data: S.I_Text,
        public parent: KicadSch | LibSymbol | SchematicSymbol,
        post_validation?: (i: string) => void,
    ) {
        this.text = data.text;
        this.at = new At(data.at);
        this.effects = new Effects(data.effects);
        this.exclude_from_sim = data.exclude_from_sim;
        this.uuid = data.uuid;

        // Remove trailing \n on text
        if (this.text.endsWith("\n")) {
            this.text = this.text.slice(0, this.text.length - 1);
        }

        if (post_validation) post_validation(this.text);
    }

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }
}

export class LibText extends Text {
    constructor(
        data: S.I_Text,
        public override parent: LibSymbol | SchematicSymbol,
    ) {
        super(data, parent);

        // From sch_sexpr_parser.cpp:LIB_TEXT* SCH_SEXPR_PARSER::parseText()
        // "Yes, LIB_TEXT is really decidegrees even though all the others are degrees. :("
        // motherfuck.
        this.at.rotation /= 10;
    }
}

export class TextBox extends GraphicItem {
    text: string;
    at: At;
    size: Vec2;
    effects = new Effects();

    constructor(
        data: S.I_TextBox,
        parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        /* TODO: This was added in KiCAD 7 */
        super(parent, data);
        this.text = data.text;
        this.at = new At(data.at);
        this.size = new Vec2(data.size.x, data.size.y);
        this.effects = new Effects(data.effects);
    }

    get bbox() {
        return new BBox(
            this.at.position.x,
            this.at.position.y,
            this.size.x,
            this.size.y,
        );
    }
}

export class Label {
    private = false;
    text: string;
    at: At = new At();
    effects = new Effects();
    fields_autoplaced = false;
    uuid?: string;

    constructor(public parent?: KicadSch) {}

    resolve_text_var(name: string): string | undefined {
        return this.parent?.resolve_text_var(name);
    }

    static common_expr_defs = [];

    get shown_text() {
        return unescape_string(this.text);
    }
}

export class NetLabel extends Label {
    constructor(data: S.I_Label, parent?: KicadSch) {
        super(parent);
        this.text = data.text;
        this.at = new At(data.at);
        this.effects = new Effects(data.effects);
        this.fields_autoplaced = data.fields_autoplaced ?? false;
        this.uuid = data.uuid;
    }
}

type LabelShapes =
    | "input"
    | "output"
    | "bidirectional"
    | "tri_state"
    | "passive"
    | "dot"
    | "round"
    | "diamond"
    | "rectangle";

export class GlobalLabel extends Label {
    shape: LabelShapes = "input";
    properties: Property[] = [];

    constructor(data: S.I_GlobalLabel, parent?: KicadSch) {
        super(parent);
        this.text = data.text;
        this.at = new At(data.at);
        this.effects = new Effects(data.effects);
        this.fields_autoplaced = data.fields_autoplaced ?? false;
        this.uuid = data.uuid;
        this.shape = data.shape as LabelShapes;
        this.properties =
            data.properties?.map((p) => new Property(p, this)) ?? [];
    }
}

export class HierarchicalLabel extends Label {
    shape: LabelShapes = "input";

    constructor(data?: S.I_HierarchicalLabel, parent?: KicadSch) {
        super(parent);
        if (data) {
            this.text = data.text;
            this.at = new At(data.at);
            this.effects = new Effects(data.effects);
            this.fields_autoplaced = data.fields_autoplaced ?? false;
            this.uuid = data.uuid;
            this.shape = data.shape as LabelShapes;
        }
    }
}

export class HierarchicalSheetPin extends HierarchicalLabel {}

export class LibSymbols {
    *getChildren() {
        for (const i of this.symbols) yield i;
    }
    symbols: LibSymbol[] = [];
    #symbols_by_name: Map<string, LibSymbol> = new Map();

    constructor(
        data: S.I_LibSymbol[],
        public parent?: KicadSch,
    ) {
        this.symbols = data.map((s) => new LibSymbol(s, this));

        for (const symbol of this.symbols) {
            this.#symbols_by_name.set(symbol.name, symbol);
        }
    }

    by_name(name: string) {
        return this.#symbols_by_name.get(name);
    }
}

export class LibSymbol {
    *getChildren() {
        for (const i of this.children) yield i;
    }
    name: string;
    power = false;
    pin_numbers: {
        hide: boolean;
    } = { hide: false };
    pin_names: {
        offset: number;
        hide: boolean;
    } = {
        offset: DefaultValues.pin_name_offset,
        hide: false,
    };
    in_bom = false;
    on_board = false;
    embedded_fonts = false;
    embedded_files: string | undefined;
    properties: Map<string, Property> = new Map();
    children: LibSymbol[] = [];
    drawings: Drawing[] = [];
    pins: PinDefinition[] = [];
    units: Map<number, LibSymbol[]> = new Map();
    libPins: LibSymbolPin[] = [];
    exclude_from_sim: boolean = false;

    get bbox() {
        return BBox.combine(
            [...this.drawings, ...this.pins].map((d) => (d as any).bbox),
        );
    }

    #pins_by_number: Map<string, PinDefinition> = new Map();
    #properties_by_id: Map<number, Property> = new Map();

    constructor(
        data: S.I_LibSymbol,
        public parent: LibSymbols | LibSymbol,
    ) {
        this.name = data.name;
        this.power = data.power ?? false;
        this.pin_numbers = data.pin_numbers ?? { hide: false };
        this.pin_names = data.pin_names ?? {
            offset: DefaultValues.pin_name_offset,
            hide: false,
        };
        this.in_bom = data.in_bom ?? false;
        this.on_board = data.on_board ?? false;
        this.embedded_fonts = data.embedded_fonts ?? false;
        this.embedded_files = data.embedded_files;
        this.exclude_from_sim = data.exclude_from_sim ?? false;

        this.properties = new Map(
            data.properties?.map((p) => [p.name, new Property(p, this)]),
        );
        this.children = data.children?.map((c) => new LibSymbol(c, this)) ?? [];
        this.pins = data.pins?.map((p) => new PinDefinition(p, this)) ?? [];

        this.drawings = [];
        if (data.drawings) {
            for (const d of data.drawings) {
                if ("pts" in d && (d as S.I_Polyline).pts) {
                    this.drawings.push(new Polyline(d as S.I_Polyline, this));
                } else if ("start" in d && (d as S.I_Rectangle).start) {
                    this.drawings.push(new Rectangle(d as S.I_Rectangle, this));
                } else if ("center" in d && (d as S.I_Circle).center) {
                    this.drawings.push(new Circle(d as S.I_Circle, this));
                } else if ("mid" in d && (d as S.I_Arc).mid) {
                    this.drawings.push(new Arc(d as S.I_Arc, this));
                } else if ("text" in d && (d as S.I_Text).text) {
                    this.drawings.push(new LibText(d as S.I_Text, this));
                } else if ("size" in d && (d as S.I_TextBox).size) {
                    this.drawings.push(new TextBox(d as S.I_TextBox, this));
                } else if ("pts" in d && (d as S.I_Bezier).pts) {
                    this.drawings.push(new Bezier(d as S.I_Bezier, this));
                }
            }
        }

        for (const pin of this.pins) {
            this.#pins_by_number.set(pin.number.text, pin);
        }

        for (const property of this.properties.values()) {
            this.#properties_by_id.set(property.id, property);
        }

        for (const child of this.children) {
            const unit_num = child.unit;
            if (unit_num !== null) {
                const list = this.units.get(unit_num) ?? [];
                list.push(child);
                this.units.set(unit_num, list);
            }
        }

        for (const pin of this.pins) {
            this.libPins.push(
                new LibSymbolPin(
                    pin.number.text,
                    `${this.name}:${pin.number}`,
                    "",
                    pin,
                    pin.unit,
                    this,
                ),
            );
        }
    }

    get root(): LibSymbol {
        if (this.parent instanceof LibSymbol) {
            return this.parent.root;
        }
        return this;
    }

    has_pin(number: string) {
        return this.#pins_by_number.has(number);
    }

    pin_by_number(number: string, style = 1): PinDefinition {
        if (this.has_pin(number)) {
            return this.#pins_by_number.get(number)!;
        }
        for (const child of this.children) {
            if (
                (child.style == 0 || child.style == style) &&
                child.has_pin(number)
            ) {
                return child.pin_by_number(number);
            }
        }
        throw new Error(
            `No pin numbered ${number} on library symbol ${this.name}`,
        );
    }

    has_property_with_id(id: number) {
        return this.#properties_by_id.has(id);
    }

    property_by_id(id: number): Property | null {
        if (this.#properties_by_id.has(id)) {
            return this.#properties_by_id.get(id)!;
        }
        for (const child of this.children) {
            if (child.has_property_with_id(id)) {
                return child.property_by_id(id);
            }
        }
        return null;
    }

    get library_name() {
        if (this.name.includes(":")) {
            return this.name.split(":").at(0)!;
        }

        return "";
    }

    get library_item_name() {
        if (this.name.includes(":")) {
            return this.name.split(":").at(1)!;
        }

        return "";
    }

    get unit_count(): number {
        // Unit 0 is common to all units, so it doesn't count towards
        // the total number of units.
        let count = this.units.size;

        if (this.units.has(0)) {
            count -= 1;
        }

        if (count == 0) count = 1;

        return count;
    }

    get unit(): number {
        // KiCAD encodes the symbol unit into the name, for example,
        // MCP6001_1_1 is unit 1 and MCP6001_2_1 is unit 2.
        // Unit 0 is common to all units.
        // See SCH_SEXPR_PARSER::ParseSymbol.
        const parts = this.name.split("_");
        if (parts.length < 3) {
            return 0;
        }

        return parseInt(parts.at(-2)!, 10);
    }

    get style(): number {
        // KiCAD "De Morgan" body styles are indicated with a number greater
        // than one at the end of the symbol name.
        // MCP6001_1_1 is the normal body and and MCP6001_1_2 is the alt style.
        // Style 0 is common to all styles.
        // See SCH_SEXPR_PARSER::ParseSymbol.
        const parts = this.name.split("_");
        if (parts.length < 3) {
            return 0;
        }

        return parseInt(parts.at(-1)!, 10);
    }

    get description(): string {
        return this.properties.get("ki_description")?.text ?? "";
    }

    get keywords(): string {
        return this.properties.get("ki_keywords")?.text ?? "";
    }

    get footprint_filters(): string {
        return this.properties.get("ki_fp_filters")?.text ?? "";
    }

    get units_interchangable(): boolean {
        return this.properties.get("ki_locked")?.text ? false : true;
    }

    resolve_text_var(name: string): string | undefined {
        if (this.parent instanceof LibSymbols) {
            return this.parent.parent?.resolve_text_var(name);
        }
        return this.parent?.resolve_text_var(name);
    }
}

export class Property {
    name: string;
    text: string;
    id: number;
    at: At;
    show_name = false;
    do_not_autoplace = false;
    hide = false;
    #effects?: Effects;

    constructor(
        data: S.I_Property,
        public parent: LibSymbol | SchematicSymbol | SchematicSheet | Label,
    ) {
        this.name = data.name;
        this.text = data.text;
        this.id = data.id;
        this.at = new At(data.at);
        this.show_name = data.show_name ?? false;
        this.do_not_autoplace = data.do_not_autoplace ?? false;
        this.hide = data.hide ?? false;
        this.#effects = data.effects ? new Effects(data.effects) : undefined;
    }

    get effects(): Effects {
        if (this.#effects) {
            return this.#effects;
        } else if (this.parent instanceof SchematicSymbol) {
            this.#effects = new Effects();
        } else {
            // log.warn(`Couldn't determine Effects for Property ${this.name}`); // Removed log import
        }
        return this.#effects!;
    }

    set effects(e: Effects) {
        this.#effects = e;
    }

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }

    get bbox() {
        return new BBox(this.at.position.x, this.at.position.y, 1, 1);
    }
}

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

export class PinInfo {
    text: string;
    effects: Effects;

    constructor(data: S.I_PinInfo) {
        this.text = data.text;
        this.effects = new Effects(data.effects);
    }
}

export class PinDefinition {
    type: PinElectricalType;
    shape: PinShape;
    hide = false;
    at: At;
    length: number;
    name: PinInfo;
    number: PinInfo;
    alternates?: PinAlternate[];

    constructor(
        data: S.I_Pin,
        public parent: LibSymbol,
    ) {
        this.type = data.type as PinElectricalType;
        this.shape = data.shape as PinShape;
        this.hide = data.hide ?? false;
        this.at = new At(data.at);
        this.length = data.length;
        this.name = new PinInfo(data.name);
        this.number = new PinInfo(data.number);
        this.alternates = data.alternates?.map((a) => new PinAlternate(a));
    }

    get unit() {
        return this.parent.unit;
    }
}

export class PinAlternate {
    name: string;
    type: PinElectricalType;
    shape: PinShape;

    constructor(data: S.I_PinAlternate) {
        this.name = data.name;
        this.type = data.type as PinElectricalType;
        this.shape = data.shape as PinShape;
    }
}

export class SchematicSymbol {
    uuid: string;
    lib_name?: string;
    lib_id: string;
    at: At;
    mirror?: "x" | "y";
    unit?: number;
    convert: number;
    in_bom = false;
    on_board = false;
    dnp = false;
    fields_autoplaced = false;
    properties: Map<string, Property> = new Map();
    pins: PinInstance[] = [];
    exclude_from_sim = false;
    default_instance: {
        reference: string;
        unit: string;
        value: string;
        footprint: string;
    };

    instances: Map<string, SchematicSymbolInstance> = new Map();

    constructor(
        data: S.I_SchematicSymbol,
        public parent: KicadSch,
    ) {
        this.lib_name = data.lib_name;
        this.lib_id = data.lib_id;
        this.at = new At(data.at);
        this.mirror = data.mirror;
        this.exclude_from_sim = data.exclude_from_sim ?? false;
        this.unit = data.unit;
        this.convert = data.convert ?? 1;
        this.in_bom = data.in_bom ?? false;
        this.on_board = data.on_board ?? false;
        this.dnp = data.dnp ?? false;
        this.fields_autoplaced = data.fields_autoplaced ?? false;
        this.uuid = data.uuid;
        this.properties = new Map(
            data.properties?.map((p) => [p.name, new Property(p, this)]),
        );
        this.pins = data.pins?.map((p) => new PinInstance(p, this)) ?? [];
        this.default_instance = data.default_instance;

        // Walk through all instances and flatten them.
        for (const project of data.instances?.projects ?? []) {
            for (const path of project?.paths ?? []) {
                const inst = new SchematicSymbolInstance();
                inst.path = path.path;
                inst.reference = path.reference;
                inst.value = path.value;
                inst.unit = path.unit;
                inst.footprint = path.footprint;
                this.instances.set(inst.path, inst);
            }
        }

        // Default instance is used only to set the value and footprint, the
        // other items seem to be ignored.
        if (
            this.get_property_text("Value") == undefined &&
            this.default_instance
        ) {
            this.set_property_text("Value", this.default_instance.value);
        }

        if (
            this.get_property_text("Footprint") == undefined &&
            this.default_instance
        ) {
            this.set_property_text(
                "Footprint",
                this.default_instance.footprint,
            );
        }
    }

    get_symbol_transform() {
        const mat = Matrix3.translation(this.at.position.x, this.at.position.y);
        mat.rotate_self(this.at.rotation);
        if (this.mirror == "x") {
            mat.scale_self(-1, 1);
        } else if (this.mirror == "y") {
            mat.scale_self(1, -1);
        }
        return mat;
    }

    get_symbol_body_and_pins_bbox() {
        const bbox = this.lib_symbol.bbox;
        return bbox.transform(this.get_symbol_transform());
    }

    get lib_symbol(): LibSymbol {
        // note: skipping a lot of null checks here because unless something
        // horrible has happened, the schematic should absolutely have the
        // library symbol for this symbol instance.
        return this.parent.lib_symbols!.by_name(this.lib_name ?? this.lib_id)!;
    }

    get_property_text(name: string) {
        return this.properties.get(name)?.text;
    }

    set_property_text(name: string, val: string) {
        const prop = this.properties.get(name);
        if (prop) {
            prop.text = val;
        }
    }

    get reference() {
        return this.get_property_text("Reference") ?? "?";
    }

    set reference(val: string) {
        this.set_property_text("Reference", val);
    }

    get value() {
        return (
            this.get_property_text("ALTIUM_VALUE") ??
            this.get_property_text("Value") ??
            ""
        );
    }

    set value(val: string) {
        this.set_property_text("Value", val);
    }

    get datasheet() {
        return this.get_property_text("Datasheet") ?? "";
    }

    get footprint() {
        return this.get_property_text("Footprint") ?? "";
    }

    set footprint(val: string) {
        this.set_property_text("Footprint", val);
    }

    get unit_suffix() {
        if (!this.unit || this.lib_symbol?.unit_count <= 1) {
            return "";
        }

        const A = "A".charCodeAt(0);
        let unit = this.unit;
        let suffix = "";

        do {
            const x = (unit - 1) % 26;
            suffix = String.fromCharCode(A + x) + suffix;
            unit = Math.trunc((unit - x) / 26);
        } while (unit > 0);

        return suffix;
    }

    get unit_pins() {
        return this.pins.filter((pin) => {
            if (this.unit && pin.unit && this.unit != pin.unit) {
                return false;
            }
            return true;
        });
    }

    resolve_text_var(name: string): string | undefined {
        if (this.properties.has(name)) {
            return this.properties.get(name)?.shown_text;
        }

        switch (name) {
            case "REFERENCE":
                return this.reference;
            case "VALUE":
                return this.value;
            case "FOOTPRINT":
                return this.footprint;
            case "ALTIUM_VALUE":
                return this.value;
            case "DATASHEET":
                return this.get_property_text("Datasheet");
            case "FOOTPRINT_LIBRARY":
                return this.footprint.split(":").at(0);
            case "FOOTPRINT_NAME":
                return this.footprint.split(":").at(-1);
            case "UNIT":
                return this.unit_suffix;
            case "SYMBOL_LIBRARY":
                return this.lib_symbol.library_name;
            case "SYMBOL_NAME":
                return this.lib_symbol.library_item_name;
            case "SYMBOL_DESCRIPTION":
                return this.lib_symbol.description;
            case "SYMBOL_KEYWORDS":
                return this.lib_symbol.keywords;
            case "EXCLUDE_FROM_BOM":
                return this.in_bom ? "" : "Excluded from BOM";
            case "EXCLUDE_FROM_BOARD":
                return this.on_board ? "" : "Excluded from board";
            case "DNP":
                return this.dnp ? "DNP" : "";
        }

        return this.parent.resolve_text_var(name);
    }

    get bbox() {
        const trans = this.get_symbol_transform();
        const boxes = [this.lib_symbol.bbox.transform(trans)];
        for (const it of this.properties.values()) {
            if (!it.hide) {
                boxes.push(it.bbox);
            }
        }
        return BBox.combine(boxes);
    }

    *items() {
        yield* this.unit_pins;
    }
}

export class SchematicSymbolInstance {
    path: string;
    project?: string;
    reference?: string;
    value?: string;
    unit?: number;
    footprint?: string;

    constructor() {}
}

export class PinInstance implements HighlightAble, IndexAble {
    number: string;
    uuid: string;
    alternate: string;

    constructor(
        data: S.I_PinInstance,
        public parent: SchematicSymbol,
    ) {
        this.number = data.number;
        this.uuid = data.uuid;
        this.alternate = data.alternate;
    }
    bbox: BBox;

    get definition() {
        return this.parent.lib_symbol.pin_by_number(
            this.number,
            this.parent.convert,
        );
    }

    get unit() {
        return this.definition.unit;
    }

    public get highlightColor() {
        return LibSymbolPin.MyHighlightColor;
    }

    public highlighted: boolean = false;

    public get index() {
        return `symbol_pin_${this.number}`;
    }
}

type PinOrientation = "right" | "left" | "up" | "down";

function angle_to_orientation(angle_deg: number): PinOrientation {
    switch (angle_deg) {
        case 0:
            return "right";
        case 90:
            return "up";
        case 180:
            return "left";
        case 270:
            return "down";
        default:
            throw new Error(`Unexpected pin angle ${angle_deg}`);
    }
}

export class LibSymbolPin implements CrossHightAble {
    public static MyHighlightColor = new Color(0, 100, 100);
    public orientation: PinOrientation;

    constructor(
        public number: string,
        public uuid: string,
        public alternate: string,
        public definition: PinDefinition,
        public unit: number,
        public parent: LibSymbol,
    ) {
        this.orientation = angle_to_orientation(definition.at.rotation);
    }
    public get bbox() {
        const defaultLen = 1;
        switch (this.orientation) {
            case "up":
                return new BBox(
                    this.definition.at.position.x - defaultLen / 2,
                    this.definition.at.position.y - defaultLen,
                    defaultLen,
                    this.definition.length,
                );
            case "down":
                return new BBox(
                    this.definition.at.position.x - defaultLen / 2,
                    this.definition.at.position.y -
                        this.definition.length +
                        defaultLen,
                    defaultLen,
                    this.definition.length,
                );
            case "left":
                return new BBox(
                    this.definition.at.position.x - this.definition.length,
                    this.definition.at.position.y - defaultLen / 2,
                    this.definition.length,
                    defaultLen,
                );
            case "right":
                return new BBox(
                    this.definition.at.position.x - defaultLen,
                    this.definition.at.position.y - defaultLen / 2,
                    this.definition.length,
                    defaultLen,
                );
        }
    }

    public get highlightColor() {
        return LibSymbolPin.MyHighlightColor;
    }

    public highlighted: boolean = false;

    public get index() {
        return `symbol_pin_${this.number}`;
    }

    public get cross_index() {
        return `pad_${this.number}`;
    }
}

export class SheetInstances {
    *getChildren() {
        for (const [, v] of this.sheet_instances) yield v;
    }
    sheet_instances: Map<string, SheetInstance> = new Map();

    constructor(data: S.I_SheetInstance[]) {
        this.sheet_instances = new Map(
            data.map((s) => [s.path, new SheetInstance(s)]),
        );
    }

    get(key: string) {
        return this.sheet_instances.get(key);
    }
}

export class SheetInstance {
    page: string;
    path: string;

    constructor(data: S.I_SheetInstance) {
        this.page = data.page;
        this.path = data.path;
    }
}

export class SymbolInstances {
    *getChildren() {
        for (const [, v] of this.symbol_instances) yield v;
    }
    symbol_instances: Map<string, SymbolInstance> = new Map();

    constructor(data: S.I_SymbolInstance[]) {
        this.symbol_instances = new Map(
            data.map((s) => [s.path, new SymbolInstance(s)]),
        );
    }

    get(key: string) {
        return this.symbol_instances.get(key);
    }
}

export class SymbolInstance {
    path: string;
    reference: string;
    unit: number;
    value: string;
    footprint: string;

    constructor(data: S.I_SymbolInstance) {
        this.path = data.path;
        this.reference = data.reference;
        this.unit = data.unit;
        this.value = data.value;
        this.footprint = data.footprint;
    }
}

export class SchematicSheet {
    *getChildren() {
        for (const [, v] of this.instances) yield v;
    }
    at: At;
    size: Vec2;
    fields_autoplaced: boolean;
    stroke: Stroke;
    fill: Fill;
    properties: Map<string, Property> = new Map();
    pins: SchematicSheetPin[] = [];
    uuid: string;
    instances: Map<string, SchematicSheetInstance> = new Map();
    page?: string;
    path?: string;

    public get hierarchicalSheetPins() {
        const labels: HierarchicalSheetPin[] = [];

        for (const pin of this.pins) {
            const label = new HierarchicalSheetPin();
            label.at = pin.at.copy();
            label.effects = pin.effects;
            label.text = pin.name;
            label.shape = pin.shape;
            label.uuid = pin.uuid;

            switch (label.at.rotation) {
                case 0:
                    label.at.rotation = 180;
                    break;
                case 180:
                    label.at.rotation = 0;
                    break;
                case 90:
                    label.at.rotation = 270;
                    break;
                case 270:
                    label.at.rotation = 90;
                    break;
            }

            if (pin.shape == "input") {
                label.shape = "output";
            } else if (pin.shape == "output") {
                label.shape = "input";
            }

            labels.push(label);
        }
        return labels;
    }

    public get bbox() {
        return new BBox(
            this.at.position.x,
            this.at.position.y,
            this.size.x,
            this.size.y,
        );
    }

    constructor(
        data: S.I_SchematicSheet,
        public parent: KicadSch,
    ) {
        this.at = new At(data.at);
        this.size = new Vec2(data.size.x, data.size.y);
        this.stroke = new Stroke(data.stroke);
        this.fill = data.fill ? new Fill(data.fill) : (undefined as any);
        this.fields_autoplaced = data.fields_autoplaced ?? false;
        this.uuid = data.uuid;
        this.properties = new Map(
            data.properties?.map((p) => [p.name, new Property(p, this)]),
        );
        this.pins = data.pins?.map((p) => new SchematicSheetPin(p, this)) ?? [];

        // Walk through all instances and flatten them.
        for (const project of data.instances?.projects ?? []) {
            for (const path of project?.paths ?? []) {
                const inst = new SchematicSheetInstance();
                inst.path = path.path;
                inst.page = path.page;
                this.instances.set(inst.path, inst);
            }
        }
    }

    get_property_text(name: string) {
        return this.properties.get(name)?.text;
    }

    get sheetname() {
        return (
            this.get_property_text("Sheetname") ??
            this.get_property_text("Sheet name")
        );
    }

    get sheetfile() {
        return (
            this.get_property_text("Sheetfile") ??
            this.get_property_text("Sheet file")
        );
    }

    resolve_text_var(name: string): string | undefined {
        return this.parent?.resolve_text_var(name);
    }
}

export class SchematicSheetPin {
    at: At;
    name: string;
    shape: LabelShapes;
    effects: Effects;
    uuid: string;

    constructor(
        data: S.I_SchematicSheetPin,
        public parent: SchematicSheet,
    ) {
        this.at = new At(data.at);
        this.name = data.name;
        this.shape = data.shape as LabelShapes;
        this.effects = new Effects(data.effects);
        this.uuid = data.uuid;
    }
}

export class SchematicSheetInstance {
    path: string;
    page?: string;
}

export type SchematicNode =
    | KicadSch
    | Fill
    | GraphicItem
    | Wire
    | Bus
    | BusEntry
    | BusAlias
    | Junction
    | NoConnect
    | Arc
    | Bezier
    | Circle
    | Polyline
    | Rectangle
    | Image
    | Text
    | LibText
    | TextBox
    | Label
    | NetLabel
    | GlobalLabel
    | HierarchicalLabel
    | LibSymbols
    | LibSymbol
    | Property
    | PinDefinition
    | PinAlternate
    | SchematicSymbol
    | SchematicSymbolInstance
    | PinInstance
    | LibSymbolPin
    | SheetInstances
    | SheetInstance
    | SymbolInstances
    | SymbolInstance
    | SchematicSheet
    | SchematicSheetPin
    | SchematicSheetInstance;
