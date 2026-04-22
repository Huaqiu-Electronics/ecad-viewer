/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type * as S from "./proto/schematic";
import type * as C from "./proto/common";

function escapeString(str: string | undefined): string {
    if (str === undefined) return "";
    return str
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\n");
}

function indent(level: number): string {
    return "\t".repeat(level);
}

function serializeWithIndent(fn: () => string, level: number): string {
    return indent(level) + fn().replace(/\n/g, "\n" + indent(level));
}

function serializeAt(at: C.I_At | undefined, level: number = 0): string {
    if (!at) {
        return "(at 0 0 0)";
    }
    return serializeWithIndent(() => {
        const x = at.position?.x || 0;
        const y = at.position?.y || 0;
        const rotation = at.rotation || 0;
        return `(at ${x} ${y} ${rotation})`;
    }, level);
}

function serializeEffects(effects: C.I_Effects, level: number = 0): string {
    return serializeWithIndent(() => {
        let result = "(effects\n";
        if (effects.font) {
            result += indent(level + 1) + `(font (size ${effects.font.size?.x || 0} ${effects.font.size?.y || 0})`;
            if (effects.font.face) {
                result += ` (name "${escapeString(effects.font.face)}")`;
            }
            if (effects.font.bold) {
                result += " (bold yes)";
            }
            if (effects.font.italic) {
                result += " (italic yes)";
            }
            result += ")\n";
        }
        if (effects.justify) {
            result += indent(level + 1) + `(justify ${effects.justify.horiz || "left"} ${effects.justify.vert || "top"})\n`;
        }
        if (effects.hide) {
            result += indent(level + 1) + "(hide yes)\n";
        }
        if (effects.justify?.mirror) {
            result += indent(level + 1) + "(mirror yes)\n";
        }
        result += ")";
        return result;
    }, level);
}

function serializeStroke(stroke: C.I_Stroke, level: number = 0): string {
    return serializeWithIndent(() => {
        let result = "(stroke\n";
        if (stroke.width !== undefined) {
            result += indent(level + 1) + `(width ${stroke.width})\n`;
        }
        if (stroke.type) {
            result += indent(level + 1) + `(type ${stroke.type})\n`;
        }
        if (stroke.color) {
            result += indent(level + 1) + `(color ${Math.round(stroke.color.r * 255)} ${Math.round(stroke.color.g * 255)} ${Math.round(stroke.color.b * 255)} ${stroke.color.a})\n`;
        }
        result += ")";
        return result;
    }, level);
}

function serializeFill(fill: S.I_Fill, level: number = 0): string {
    if (!fill) return "";
    return serializeWithIndent(() => {
        let result = "(fill\n";
        if (fill.type) {
            result += indent(level + 1) + `(type ${fill.type})\n`;
        }
        if (fill.color) {
            result += indent(level + 1) + `(color ${Math.round(fill.color.r * 255)} ${Math.round(fill.color.g * 255)} ${Math.round(fill.color.b * 255)} ${fill.color.a})\n`;
        }
        result += ")";
        return result;
    }, level);
}

function serializePaper(paper: C.I_Paper, level: number = 0): string {
    return serializeWithIndent(() => {
        return `(paper "${paper.size}")`;
    }, level);
}

function serializeTitleBlock(titleBlock: C.I_TitleBlock, level: number = 0): string {
    return serializeWithIndent(() => {
        let result = "(title_block\n";
        if (titleBlock.title) {
            result += indent(level + 1) + `(title "${escapeString(titleBlock.title)}")\n`;
        }
        if (titleBlock.company) {
            result += indent(level + 1) + `(company "${escapeString(titleBlock.company)}")\n`;
        }
        if (titleBlock.date) {
            result += indent(level + 1) + `(date "${escapeString(titleBlock.date)}")\n`;
        }
        if (titleBlock.rev) {
            result += indent(level + 1) + `(rev "${escapeString(titleBlock.rev)}")\n`;
        }
        if (titleBlock.comment) {
            for (const [key, value] of Object.entries(titleBlock.comment)) {
                result += indent(level + 1) + `(comment ${key} "${escapeString(value)}")\n`;
            }
        }
        result += ")";
        return result;
    }, level);
}

function serializeProperty(property: S.I_Property, level: number = 0): string {
    return serializeWithIndent(() => {
        let result = `(property "${escapeString(property.name)}" "${escapeString(property.text)}"`;
        if (property.id) {
            result += ` ${property.id}`;
        }
        result += "\n";
        result += serializeAt(property.at, level + 1) + "\n";
        result += serializeEffects(property.effects, level + 1) + "\n";
        if (property.show_name) {
            result += indent(level + 1) + "(show_name yes)\n";
        }
        if (property.do_not_autoplace) {
            result += indent(level + 1) + "(do_not_autoplace yes)\n";
        }
        if (property.hide) {
            result += indent(level + 1) + "(hide yes)\n";
        }
        result += ")";
        return result;
    }, level);
}

function serializePinAlternate(alternate: S.I_PinAlternate, level: number = 0): string {
    return serializeWithIndent(() => {
        return `(alternate "${escapeString(alternate.name)}" "${escapeString(alternate.type)}" "${escapeString(alternate.shape)}")`;
    }, level);
}

function serializePin(pin: S.I_Pin, level: number = 0): string {
    return serializeWithIndent(() => {
        let result = `(pin ${pin.type} ${pin.shape}\n`;
        result += serializeAt(pin.at, level + 1) + "\n";
        result += indent(level + 1) + `(length ${pin.length})\n`;
        if (pin.hide) {
            result += indent(level + 1) + "(hide yes)\n";
        }
        result += indent(level + 1) + `(name "${escapeString(pin.name.text)}"\n`;
        result += serializeEffects(pin.name.effects, level + 2) + "\n";
        result += indent(level + 1) + ")\n";
        result += indent(level + 1) + `(number "${escapeString(pin.number.text)}"\n`;
        result += serializeEffects(pin.number.effects, level + 2) + "\n";
        result += indent(level + 1) + ")\n";
        if (pin.alternates && pin.alternates.length > 0) {
            for (const alternate of pin.alternates) {
                result += serializePinAlternate(alternate, level + 1) + "\n";
            }
        }
        result += ")";
        return result;
    }, level);
}

function serializeLibSymbol(symbol: S.I_LibSymbol): string {
    let result = `(symbol "${escapeString(symbol.name)}"`;
    if (symbol.power) result += " (power)";
    if (symbol.pin_numbers?.hide) result += " (pin_numbers hide)";
    if (symbol.pin_names) {
        result += " (pin_names";
        if (symbol.pin_names.offset !== undefined)
            result += ` (offset ${symbol.pin_names.offset})`;
        if (symbol.pin_names.hide) result += " (hide yes)";
        result += ")";
    }
    if (symbol.exclude_from_sim !== undefined) result += ` (exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})`;
    if (symbol.in_bom) result += " (in_bom yes)";
    if (symbol.embedded_fonts) result += " (embedded_fonts yes)";
    if (symbol.embedded_files)
        result += ` (embedded_files "${escapeString(symbol.embedded_files)}")`;
    if (symbol.on_board) result += " (on_board yes)";
    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += ` ${serializePin(pin)}`;
        }
    }
    if (symbol.children && symbol.children.length > 0) {
        for (const child of symbol.children) {
            result += ` ${serializeLibSymbol(child)}`;
        }
    }
    if (symbol.drawings && symbol.drawings.length > 0) {
        for (const drawing of symbol.drawings) {
            if ("start" in drawing && "mid" in drawing && "end" in drawing) {
                const arc = drawing as S.I_Arc;
                result += ` (arc (start (xy ${arc.start.x} ${arc.start.y})) (mid (xy ${arc.mid?.x ?? 0} ${arc.mid?.y ?? 0})) (end (xy ${arc.end.x} ${arc.end.y}))`;
                if (arc.radius) {
                    result += ` (radius (xy ${arc.radius.at.x} ${arc.radius.at.y}) (length ${arc.radius.length}) (angles ${arc.radius.angles.x} ${arc.radius.angles.y}))`;
                }
                if (arc.stroke) result += ` ${serializeStroke(arc.stroke)}`;
                if (arc.fill) result += ` ${serializeFill(arc.fill)}`;
                if (arc.uuid) result += ` (uuid "${arc.uuid}")`;
                result += ")";
            } else if ("pts" in drawing && !("center" in drawing) && (drawing as S.I_Bezier).pts.length === 4) {
                const bezier = drawing as S.I_Bezier;
                result += ` (bezier (pts`;
                for (const pt of bezier.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (bezier.stroke)
                    result += ` ${serializeStroke(bezier.stroke)}`;
                if (bezier.fill) result += ` ${serializeFill(bezier.fill)}`;
                if (bezier.uuid) result += ` (uuid "${bezier.uuid}")`;
                result += ")";
            } else if ("center" in drawing && "radius" in drawing) {
                const circle = drawing as S.I_Circle;
                result += ` (circle (center (xy ${circle.center.x} ${circle.center.y})) (radius ${circle.radius})`;
                if (circle.stroke)
                    result += ` ${serializeStroke(circle.stroke)}`;
                if (circle.fill) result += ` ${serializeFill(circle.fill)}`;
                if (circle.uuid) result += ` (uuid "${circle.uuid}")`;
                result += ")";
            } else if ("pts" in drawing) {
                const polyline = drawing as S.I_Polyline;
                result += ` (polyline (pts`;
                for (const pt of polyline.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (polyline.stroke)
                    result += ` ${serializeStroke(polyline.stroke)}`;
                if (polyline.fill) result += ` ${serializeFill(polyline.fill)}`;
                if (polyline.uuid) result += ` (uuid "${polyline.uuid}")`;
                result += ")";
            } else if ("start" in drawing && "end" in drawing) {
                const rectangle = drawing as S.I_Rectangle;
                result += ` (rectangle (start (xy ${rectangle.start.x} ${rectangle.start.y})) (end (xy ${rectangle.end.x} ${rectangle.end.y}))`;
                if (rectangle.stroke)
                    result += ` ${serializeStroke(rectangle.stroke)}`;
                if (rectangle.fill)
                    result += ` ${serializeFill(rectangle.fill)}`;
                if (rectangle.uuid) result += ` (uuid "${rectangle.uuid}")`;
                result += ")";
            } else if ("text" in drawing && !("size" in drawing)) {
                const text = drawing as S.I_Text;
                result += ` (text "${escapeString(text.text)}" ${serializeAt(text.at)} ${serializeEffects(text.effects)}`;
                if (text.exclude_from_sim) result += " (exclude_from_sim yes)";
                if (text.uuid) result += ` (uuid "${text.uuid}")`;
                result += ")";
            } else if ("text" in drawing && "size" in drawing) {
                const textbox = drawing as S.I_TextBox;
                result += ` (text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at)} (size ${textbox.size.x} ${textbox.size.y})`;
                if (textbox.exclude_from_sim)
                    result += ` (exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})`;
                if (textbox.margins)
                    result += ` (margins ${textbox.margins.x} ${textbox.margins.y} ${textbox.margins.z} ${textbox.margins.w})`;
                result += ` ${serializeEffects(textbox.effects)}`;
                if (textbox.stroke)
                    result += ` ${serializeStroke(textbox.stroke)}`;
                if (textbox.fill) result += ` ${serializeFill(textbox.fill)}`;
                if (textbox.uuid) result += ` (uuid "${textbox.uuid}")`;
                result += ")";
            }
        }
    }
    result += ")";
    return result;
}

function serializeWire(wire: S.I_Wire): string {
    let result = "(wire (pts";
    for (const pt of wire.pts) {
        result += ` (xy ${pt.x} ${pt.y})`;
    }
    result += ")";
    result += ` ${serializeStroke(wire.stroke)}`;
    result += ` (uuid "${wire.uuid}")`;
    result += ")";
    return result;
}

function serializeBus(bus: S.I_Bus): string {
    let result = "(bus (pts";
    for (const pt of bus.pts) {
        result += ` (xy ${pt.x} ${pt.y})`;
    }
    result += ")";
    result += ` ${serializeStroke(bus.stroke)}`;
    result += ` (uuid "${bus.uuid}")`;
    result += ")";
    return result;
}

function serializeBusEntry(busEntry: S.I_BusEntry): string {
    let result = `(bus_entry ${serializeAt(busEntry.at)} (size ${busEntry.size.x} ${busEntry.size.y})`;
    result += ` ${serializeStroke(busEntry.stroke)}`;
    result += ` (uuid "${busEntry.uuid}")`;
    result += ")";
    return result;
}

function serializeBusAlias(busAlias: S.I_BusAlias): string {
    let result = `(bus_alias "${busAlias.name}" (members`;
    if (busAlias.members && Array.isArray(busAlias.members)) {
        for (const member of busAlias.members) {
            result += ` "${member}"`;
        }
    }
    result += "))";
    return result;
}

function serializeJunction(junction: S.I_Junction): string {
    let result = `(junction ${serializeAt(junction.at)}`;
    if (junction.diameter) result += ` (diameter ${junction.diameter})`;
    if (junction.color) {
        result += ` (color ${Math.round(junction.color.r * 255)} ${Math.round(junction.color.g * 255)} ${Math.round(junction.color.b * 255)} ${junction.color.a})`;
    }
    result += ` (uuid "${junction.uuid}")`;
    result += ")";
    return result;
}

function serializeNoConnect(noConnect: S.I_NoConnect): string {
    return `(no_connect ${serializeAt(noConnect.at)} (uuid "${noConnect.uuid}"))`;
}

function serializeNetLabel(label: S.I_NetLabel): string {
    let result = `(label "${escapeString(label.text)}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ")";
    return result;
}

function serializeGlobalLabel(label: S.I_GlobalLabel): string {
    let result = `(global_label "${escapeString(label.text)}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ` (shape "${escapeString(label.shape)}")`;
    if (label.properties && label.properties.length > 0) {
        for (const property of label.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    result += ")";
    return result;
}

function serializeHierarchicalLabel(label: S.I_HierarchicalLabel): string {
    let result = `(hierarchical_label "${escapeString(label.text)}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ` (shape "${escapeString(label.shape)}")`;
    result += ")";
    return result;
}

function serializePinInstance(pin: S.I_PinInstance): string {
    let result = `(pin "${escapeString(pin.number)}" (uuid "${pin.uuid}")`;
    if (pin.alternate)
        result += ` (alternate "${escapeString(pin.alternate)}")`;
    result += ")";
    return result;
}

export function serializeSchematicSymbol(symbol: S.I_SchematicSymbol): string {
    let result = "(symbol";
    if (symbol.lib_name)
        result += ` (lib_name "${escapeString(symbol.lib_name)}")`;
    result += ` (lib_id "${escapeString(symbol.lib_id)}")`;
    result += ` ${serializeAt(symbol.at)}`;
    if (symbol.mirror) result += ` (mirror "${escapeString(symbol.mirror)}")`;
    if (symbol.exclude_from_sim !== undefined) result += ` (exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})`;
    result += ` (unit ${symbol.unit})`;
    if (typeof symbol.convert !== "undefined" && symbol.convert !== null) {
        result += ` (convert ${symbol.convert})`;
    }
    if (typeof symbol.in_bom !== "undefined") {
        result += ` (in_bom ${symbol.in_bom ? "yes" : "no"})`;
    }
    if (typeof symbol.on_board !== "undefined") {
        result += ` (on_board ${symbol.on_board ? "yes" : "no"})`;
    }
    if (symbol.dnp) result += " (dnp yes)";
    if (symbol.fields_autoplaced) result += " (fields_autoplaced yes)";
    result += ` (uuid "${symbol.uuid}")`;
    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += ` ${serializePinInstance(pin)}`;
        }
    }
    if (symbol.default_instance) {
        result += " (default_instance";
        result += ` (reference "${escapeString(symbol.default_instance.reference)}")`;
        result += ` (unit "${escapeString(symbol.default_instance.unit)}")`;
        result += ` (value "${escapeString(symbol.default_instance.value)}")`;
        result += ` (footprint "${escapeString(symbol.default_instance.footprint)}")`;
        result += ")";
    }
    if (symbol.instances) {
        result += " (instances";
        if (symbol.instances.projects && symbol.instances.projects.length > 0) {
            for (const project of symbol.instances.projects) {
                result += ` (project "${escapeString(project.name)}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += ` (path "${escapeString(path.path)}"`;
                        if (path.reference)
                            result += ` (reference "${escapeString(path.reference)}")`;
                        if (path.value)
                            result += ` (value "${escapeString(path.value)}")`;
                        if (path.unit) result += ` (unit ${path.unit})`;
                        if (path.footprint)
                            result += ` (footprint "${escapeString(path.footprint)}")`;
                        result += ")";
                    }
                }
                result += ")";
            }
        }
        result += ")";
    }
    result += ")";
    return result;
}

function serializeSheetPin(pin: S.I_SchematicSheetPin): string {
    let result = `(pin "${escapeString(pin.name)}" "${escapeString(pin.shape)}" ${serializeAt(pin.at)} ${serializeEffects(pin.effects)}`;
    result += ` (uuid "${pin.uuid}")`;
    result += ")";
    return result;
}

function serializeSchematicSheet(sheet: S.I_SchematicSheet): string {
    const sizeX = sheet.size?.x || 0;
    const sizeY = sheet.size?.y || 0;
    let result = `(sheet ${serializeAt(sheet.at)} (size ${sizeX} ${sizeY})`;
    if (sheet.exclude_from_sim !== undefined) {
        result += ` (exclude_from_sim ${sheet.exclude_from_sim ? "yes" : "no"})`;
    }
    if (sheet.in_bom !== undefined) {
        result += ` (in_bom ${sheet.in_bom ? "yes" : "no"})`;
    }
    if (sheet.on_board !== undefined) {
        result += ` (on_board ${sheet.on_board ? "yes" : "no"})`;
    }
    if (sheet.dnp !== undefined) {
        result += ` (dnp ${sheet.dnp ? "yes" : "no"})`;
    }
    if (sheet.fields_autoplaced) result += " (fields_autoplaced yes)";
    result += ` ${serializeStroke(sheet.stroke)}`;
    const fillStr = serializeFill(sheet.fill);
    if (fillStr) result += ` ${fillStr}`;
    result += ` (uuid "${sheet.uuid}")`;
    if (sheet.properties && sheet.properties.length > 0) {
        for (const property of sheet.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    if (sheet.pins && sheet.pins.length > 0) {
        for (const pin of sheet.pins) {
            result += ` ${serializeSheetPin(pin)}`;
        }
    }
    if (sheet.instances) {
        result += " (instances";
        if (sheet.instances.projects && sheet.instances.projects.length > 0) {
            for (const project of sheet.instances.projects) {
                result += ` (project "${escapeString(project.name)}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += ` (path "${escapeString(path.path)}"`;
                        if (path.page)
                            result += ` (page "${escapeString(path.page)}")`;
                        result += ")";
                    }
                }
                result += ")";
            }
        }
        result += ")";
    }
    result += ")";
    return result;
}

export { serializeLibSymbol };
export function serializeSchematic(schematic: S.I_KicadSch): string {
    let result = "(kicad_sch";
    result += ` (version ${schematic.version})`;
    if (schematic.generator)
        result += ` (generator "${escapeString(schematic.generator)}")`;
    result += ` (generator_version "${escapeString(schematic.generator_version)}")`;
    result += ` (uuid "${schematic.uuid}")`;
    if (schematic.paper) result += ` ${serializePaper(schematic.paper)}`;
    if (schematic.title_block)
        result += ` ${serializeTitleBlock(schematic.title_block)}`;
    if (schematic.lib_symbols && schematic.lib_symbols.length > 0) {
        result += " (lib_symbols";
        for (const symbol of schematic.lib_symbols) {
            result += ` ${serializeLibSymbol(symbol)}`;
        }
        result += ")";
    }
    if (schematic.wires && schematic.wires.length > 0) {
        for (const wire of schematic.wires) {
            result += ` ${serializeWire(wire)}`;
        }
    }
    if (schematic.buses && schematic.buses.length > 0) {
        for (const bus of schematic.buses) {
            result += ` ${serializeBus(bus)}`;
        }
    }
    if (schematic.bus_entries && schematic.bus_entries.length > 0) {
        for (const busEntry of schematic.bus_entries) {
            result += ` ${serializeBusEntry(busEntry)}`;
        }
    }
    if (schematic.bus_aliases && schematic.bus_aliases.length > 0) {
        for (const busAlias of schematic.bus_aliases) {
            result += ` ${serializeBusAlias(busAlias)}`;
        }
    }
    if (schematic.junctions && schematic.junctions.length > 0) {
        for (const junction of schematic.junctions) {
            result += ` ${serializeJunction(junction)}`;
        }
    }
    if (schematic.no_connects && schematic.no_connects.length > 0) {
        for (const noConnect of schematic.no_connects) {
            result += ` ${serializeNoConnect(noConnect)}`;
        }
    }
    if (schematic.net_labels && schematic.net_labels.length > 0) {
        for (const label of schematic.net_labels) {
            result += ` ${serializeNetLabel(label)}`;
        }
    }
    if (schematic.global_labels && schematic.global_labels.length > 0) {
        for (const label of schematic.global_labels) {
            result += ` ${serializeGlobalLabel(label)}`;
        }
    }
    if (
        schematic.hierarchical_labels &&
        schematic.hierarchical_labels.length > 0
    ) {
        for (const label of schematic.hierarchical_labels) {
            result += ` ${serializeHierarchicalLabel(label)}`;
        }
    }
    if (schematic.symbols && schematic.symbols.length > 0) {
        for (const symbol of schematic.symbols) {
            result += ` ${serializeSchematicSymbol(symbol)}`;
        }
    }
    if (schematic.drawings && schematic.drawings.length > 0) {
        for (const drawing of schematic.drawings) {
            if ("start" in drawing && "mid" in drawing && "end" in drawing) {
                const arc = drawing as S.I_Arc;
                result += ` (arc (start (xy ${arc.start.x} ${arc.start.y})) (mid (xy ${arc.mid?.x ?? 0} ${arc.mid?.y ?? 0})) (end (xy ${arc.end.x} ${arc.end.y}))`;
                if (arc.radius) {
                    result += ` (radius (xy ${arc.radius.at.x} ${arc.radius.at.y}) (length ${arc.radius.length}) (angles ${arc.radius.angles.x} ${arc.radius.angles.y}))`;
                }
                if (arc.stroke) result += ` ${serializeStroke(arc.stroke)}`;
                if (arc.fill) result += ` ${serializeFill(arc.fill)}`;
                if (arc.uuid) result += ` (uuid "${arc.uuid}")`;
                result += ")";
            } else if (
                "pts" in drawing &&
                !("center" in drawing) &&
                "pts" in drawing &&
                (drawing as S.I_Bezier).pts.length === 4
            ) {
                const bezier = drawing as S.I_Bezier;
                result += ` (bezier (pts`;
                for (const pt of bezier.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (bezier.stroke)
                    result += ` ${serializeStroke(bezier.stroke)}`;
                if (bezier.fill) result += ` ${serializeFill(bezier.fill)}`;
                if (bezier.uuid) result += ` (uuid "${bezier.uuid}")`;
                result += ")";
            } else if ("center" in drawing && "radius" in drawing) {
                const circle = drawing as S.I_Circle;
                result += ` (circle (center (xy ${circle.center.x} ${circle.center.y})) (radius ${circle.radius})`;
                if (circle.stroke)
                    result += ` ${serializeStroke(circle.stroke)}`;
                if (circle.fill) result += ` ${serializeFill(circle.fill)}`;
                if (circle.uuid) result += ` (uuid "${circle.uuid}")`;
                result += ")";
            } else if ("pts" in drawing) {
                const polyline = drawing as S.I_Polyline;
                result += ` (polyline (pts`;
                for (const pt of polyline.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (polyline.stroke)
                    result += ` ${serializeStroke(polyline.stroke)}`;
                if (polyline.fill) result += ` ${serializeFill(polyline.fill)}`;
                if (polyline.uuid) result += ` (uuid "${polyline.uuid}")`;
                result += ")";
            } else if (
                "start" in drawing &&
                "end" in drawing &&
                !("mid" in drawing)
            ) {
                const rectangle = drawing as S.I_Rectangle;
                result += ` (rectangle (start (xy ${rectangle.start.x} ${rectangle.start.y})) (end (xy ${rectangle.end.x} ${rectangle.end.y}))`;
                if (rectangle.stroke)
                    result += ` ${serializeStroke(rectangle.stroke)}`;
                if (rectangle.fill)
                    result += ` ${serializeFill(rectangle.fill)}`;
                if (rectangle.uuid) result += ` (uuid "${rectangle.uuid}")`;
                result += ")";
            } else if ("text" in drawing && !("size" in drawing)) {
                const text = drawing as S.I_Text;
                result += ` (text "${escapeString(text.text)}" ${serializeAt(text.at)} ${serializeEffects(text.effects)}`;
                if (text.exclude_from_sim) result += " (exclude_from_sim yes)";
                if (text.uuid) result += ` (uuid "${text.uuid}")`;
                result += ")";
            } else if ("text" in drawing && "size" in drawing) {
                const textbox = drawing as S.I_TextBox;
                result += ` (text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at)} (size ${textbox.size.x} ${textbox.size.y})`;
                if (textbox.exclude_from_sim)
                    result += ` (exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})`;
                if (textbox.margins)
                    result += ` (margins ${textbox.margins.x} ${textbox.margins.y} ${textbox.margins.z} ${textbox.margins.w})`;
                result += ` ${serializeEffects(textbox.effects)}`;
                if (textbox.stroke)
                    result += ` ${serializeStroke(textbox.stroke)}`;
                if (textbox.fill) result += ` ${serializeFill(textbox.fill)}`;
                if (textbox.uuid) result += ` (uuid "${textbox.uuid}")`;
                result += ")";
            }
        }
    }
    if (schematic.images && schematic.images.length > 0) {
        for (const image of schematic.images) {
            result += ` (image ${serializeAt(image.at)} (data ${image.data}) (scale ${image.scale})`;
            if (image.uuid) result += ` (uuid "${image.uuid}")`;
            result += ")";
        }
    }
    if (schematic.sheets && schematic.sheets.length > 0) {
        for (const sheet of schematic.sheets) {
            result += ` ${serializeSchematicSheet(sheet)}`;
        }
    }
    if (schematic.sheet_instances && schematic.sheet_instances.length > 0) {
        result += " (sheet_instances";
        for (const instance of schematic.sheet_instances) {
            result += ` (path "${escapeString(instance.path)}"`;
            if (instance.page)
                result += ` (page "${escapeString(instance.page)}")`;
            result += ")";
        }
        result += ")";
    }
    if (schematic.symbol_instances && schematic.symbol_instances.length > 0) {
        result += " (symbol_instances";
        for (const instance of schematic.symbol_instances) {
            result += ` (path "${escapeString(instance.path)}" (reference "${escapeString(instance.reference)}") (unit ${instance.unit}) (value "${escapeString(instance.value)}") (footprint "${escapeString(instance.footprint)}"))`;
        }
        result += ")";
    }
    if (schematic.embedded_fonts !== undefined) {
        result += ` (embedded_fonts ${schematic.embedded_fonts ? "yes" : "no"})`;
    }
    result += ")";
    // Add a newline at the end of the file to make KiCad happy
    result += "\n";
    // Format the S-expression with proper indentation
    const formatted = formatSExpression(result);
    return formatted;
}

// Format the serialized S-expression with proper indentation
function formatSExpression(sexpr: string): string {
    let result = '';
    let indentLevel = 0;
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < sexpr.length; i++) {
        const char = sexpr[i];
        
        if (escape) {
            result += char;
            escape = false;
            continue;
        }
        
        if (char === '\\') {
            result += char;
            escape = true;
            continue;
        }
        
        if (char === '"') {
            result += char;
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '(') {
                result += '\n' + '\t'.repeat(indentLevel) + '(';
                indentLevel++;
            } else if (char === ')') {
                indentLevel--;
                result += '\n' + '\t'.repeat(indentLevel) + ')';
            } else if (char === ' ') {
                // Skip spaces outside strings
                continue;
            } else {
                result += char;
            }
        } else {
            result += char;
        }
    }
    
    return result.trim() + '\n';
}
