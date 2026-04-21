/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type * as S from "./proto/schematic";
import type * as C from "./proto/common";

function serializeAt(at: C.I_At): string {
    return `(at ${at.position?.x || 0} ${at.position?.y || 0} ${at.rotation || 0})`;
}

function serializeEffects(effects: C.I_Effects): string {
    let result = "(effects";
    if (effects.font) {
        result += ` (font (size ${effects.font.size?.x || 0} ${effects.font.size?.y || 0})`;
        if (effects.font.face) result += ` (name "${effects.font.face}")`;
        if (effects.font.bold) result += " (bold yes)";
        if (effects.font.italic) result += " (italic yes)";
        result += ")";
    }
    if (effects.justify) {
        result += ` (justify ${effects.justify.horiz || "left"} ${effects.justify.vert || "top"})`;
    }
    if (effects.hide) result += " (hide yes)";
    if (effects.justify?.mirror) result += " (mirror yes)";
    result += ")";
    return result;
}

function serializeStroke(stroke: C.I_Stroke): string {
    let result = "(stroke";
    if (stroke.width) result += ` (width ${stroke.width})`;
    if (stroke.type) result += ` (type "${stroke.type}")`;
    if (stroke.color) {
        result += ` (color ${Math.round(stroke.color.r * 255)} ${Math.round(stroke.color.g * 255)} ${Math.round(stroke.color.b * 255)} ${stroke.color.a})`;
    }
    result += ")";
    return result;
}

function serializeFill(fill: S.I_Fill): string {
    let result = `(fill ${fill.type}`;
    if (fill.color) {
        result += ` (color ${Math.round(fill.color.r * 255)} ${Math.round(fill.color.g * 255)} ${Math.round(fill.color.b * 255)} ${fill.color.a})`;
    }
    result += ")";
    return result;
}

function serializePaper(paper: C.I_Paper): string {
    return `(paper "${paper.size}")`;
}

function serializeTitleBlock(titleBlock: C.I_TitleBlock): string {
    let result = "(title_block";
    if (titleBlock.title) result += ` (title "${titleBlock.title}")`;
    if (titleBlock.company) result += ` (company "${titleBlock.company}")`;
    if (titleBlock.date) result += ` (date "${titleBlock.date}")`;
    if (titleBlock.rev) result += ` (rev "${titleBlock.rev}")`;
    for (const [key, value] of Object.entries(titleBlock.comment)) {
        result += ` (comment ${key} "${value}")`;
    }
    result += ")";
    return result;
}

function serializeVec2(vec: { x: number; y: number }): string {
    return `${vec.x} ${vec.y}`;
}

function serializeProperty(property: S.I_Property): string {
    let result = `(property "${property.name}" "${property.text}" ${property.id}`;
    result += ` ${serializeAt(property.at)}`;
    result += ` ${serializeEffects(property.effects)}`;
    if (property.show_name) result += " (show_name yes)";
    if (property.do_not_autoplace) result += " (do_not_autoplace yes)";
    if (property.hide) result += " (hide yes)";
    result += ")";
    return result;
}

function serializePinAlternate(alternate: S.I_PinAlternate): string {
    return `(alternate "${alternate.name}" "${alternate.type}" "${alternate.shape}")`;
}

function serializePin(pin: S.I_Pin): string {
    let result = `(pin "${pin.type}" "${pin.shape}"`;
    if (pin.hide) result += " hide";
    result += ` ${serializeAt(pin.at)}`;
    result += ` (length ${pin.length})`;
    result += ` (name "${pin.name.text}" ${serializeEffects(pin.name.effects)})`;
    result += ` (number "${pin.number.text}" ${serializeEffects(pin.number.effects)})`;
    if (pin.alternates && pin.alternates.length > 0) {
        for (const alternate of pin.alternates) {
            result += ` ${serializePinAlternate(alternate)}`;
        }
    }
    result += ")";
    return result;
}

function serializeLibSymbol(symbol: S.I_LibSymbol): string {
    let result = `(symbol "${symbol.name}"`;
    if (symbol.power) result += " power";
    if (symbol.pin_numbers?.hide) result += " (pin_numbers hide)";
    if (symbol.pin_names) {
        result += " (pin_names";
        if (symbol.pin_names.offset) result += ` (offset ${symbol.pin_names.offset})`;
        if (symbol.pin_names.hide) result += " (hide yes)";
        result += ")";
    }
    if (symbol.exclude_from_sim) result += " (exclude_from_sim yes)";
    if (symbol.in_bom) result += " (in_bom yes)";
    if (symbol.embedded_fonts) result += " (embedded_fonts yes)";
    if (symbol.embedded_files) result += ` (embedded_files "${symbol.embedded_files}")`;
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
            if ('start' in drawing && 'mid' in drawing && 'end' in drawing) {
                const arc = drawing as S.I_Arc;
                result += ` (arc (start (xy ${arc.start.x} ${arc.start.y})) (mid (xy ${arc.mid!.x} ${arc.mid!.y})) (end (xy ${arc.end.x} ${arc.end.y}))`;
                if (arc.radius) {
                    result += ` (radius ${serializeVec2(arc.radius.at)} (length ${arc.radius.length}) (angles ${serializeVec2(arc.radius.angles)}))`;
                }
                if (arc.stroke) result += ` ${serializeStroke(arc.stroke)}`;
                if (arc.fill) result += ` ${serializeFill(arc.fill)}`;
                if (arc.uuid) result += ` (uuid "${arc.uuid}")`;
                result += ")";
            } else if ('pts' in drawing && !('center' in drawing)) {
                const bezier = drawing as S.I_Bezier;
                result += ` (bezier (pts`;
                for (const pt of bezier.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (bezier.stroke) result += ` ${serializeStroke(bezier.stroke)}`;
                if (bezier.fill) result += ` ${serializeFill(bezier.fill)}`;
                if (bezier.uuid) result += ` (uuid "${bezier.uuid}")`;
                result += ")";
            } else if ('center' in drawing) {
                const circle = drawing as S.I_Circle;
                result += ` (circle (center (xy ${circle.center.x} ${circle.center.y})) (radius ${circle.radius})`;
                if (circle.stroke) result += ` ${serializeStroke(circle.stroke)}`;
                if (circle.fill) result += ` ${serializeFill(circle.fill)}`;
                if (circle.uuid) result += ` (uuid "${circle.uuid}")`;
                result += ")";
            } else if ('pts' in drawing) {
                const polyline = drawing as S.I_Polyline;
                result += ` (polyline (pts`;
                for (const pt of polyline.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (polyline.stroke) result += ` ${serializeStroke(polyline.stroke)}`;
                if (polyline.fill) result += ` ${serializeFill(polyline.fill)}`;
                if (polyline.uuid) result += ` (uuid "${polyline.uuid}")`;
                result += ")";
            } else if ('start' in drawing && 'end' in drawing) {
                const rectangle = drawing as S.I_Rectangle;
                result += ` (rectangle (start (xy ${rectangle.start.x} ${rectangle.start.y})) (end (xy ${rectangle.end.x} ${rectangle.end.y}))`;
                if (rectangle.stroke) result += ` ${serializeStroke(rectangle.stroke)}`;
                if (rectangle.fill) result += ` ${serializeFill(rectangle.fill)}`;
                if (rectangle.uuid) result += ` (uuid "${rectangle.uuid}")`;
                result += ")";
            } else if ('text' in drawing && !('size' in drawing)) {
                const text = drawing as S.I_Text;
                result += ` (text "${text.text}" ${serializeAt(text.at)} ${serializeEffects(text.effects)}`;
                if (text.exclude_from_sim) result += " (exclude_from_sim yes)";
                if (text.uuid) result += ` (uuid "${text.uuid}")`;
                result += ")";
            } else if ('text' in drawing && 'size' in drawing) {
                const textbox = drawing as S.I_TextBox;
                result += ` (text_box "${textbox.text}" ${serializeAt(textbox.at)} (size ${textbox.size.x} ${textbox.size.y}) ${serializeEffects(textbox.effects)}`;
                if (textbox.stroke) result += ` ${serializeStroke(textbox.stroke)}`;
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
    let result = `(bus_alias "${busAlias.name}"`;
    for (const member of busAlias.members) {
        result += ` "${member}"`;
    }
    result += ")";
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
    let result = `(label "${label.text}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ")";
    return result;
}

function serializeGlobalLabel(label: S.I_GlobalLabel): string {
    let result = `(global_label "${label.text}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ` (shape "${label.shape}")`;
    if (label.properties && label.properties.length > 0) {
        for (const property of label.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    result += ")";
    return result;
}

function serializeHierarchicalLabel(label: S.I_HierarchicalLabel): string {
    let result = `(hierarchical_label "${label.text}" ${serializeAt(label.at)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${label.uuid}")`;
    result += ` (shape "${label.shape}")`;
    result += ")";
    return result;
}

function serializePinInstance(pin: S.I_PinInstance): string {
    let result = `(pin "${pin.number}" (uuid "${pin.uuid}")`;
    if (pin.alternate) result += ` (alternate "${pin.alternate}")`;
    result += ")";
    return result;
}

function serializeSchematicSymbol(symbol: S.I_SchematicSymbol): string {
    let result = "(symbol";
    if (symbol.lib_name) result += ` (lib_name "${symbol.lib_name}")`;
    result += ` (lib_id "${symbol.lib_id}")`;
    result += ` ${serializeAt(symbol.at)}`;
    if (symbol.mirror) result += ` (mirror "${symbol.mirror}")`;
    if (symbol.exclude_from_sim) result += " (exclude_from_sim yes)";
    result += ` (unit ${symbol.unit})`;
    result += ` (convert ${symbol.convert})`;
    if (symbol.in_bom) result += " (in_bom yes)";
    if (symbol.on_board) result += " (on_board yes)";
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
        result += ` (reference "${symbol.default_instance.reference}")`;
        result += ` (unit "${symbol.default_instance.unit}")`;
        result += ` (value "${symbol.default_instance.value}")`;
        result += ` (footprint "${symbol.default_instance.footprint}")`;
        result += ")";
    }
    if (symbol.instances) {
        result += " (instances";
        if (symbol.instances.projects && symbol.instances.projects.length > 0) {
            for (const project of symbol.instances.projects) {
                result += ` (project "${project.name}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += ` (path "${path.path}"`;
                        if (path.reference) result += ` (reference "${path.reference}")`;
                        if (path.value) result += ` (value "${path.value}")`;
                        if (path.unit) result += ` (unit ${path.unit})`;
                        if (path.footprint) result += ` (footprint "${path.footprint}")`;
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
    let result = `(pin "${pin.name}" "${pin.shape}" ${serializeAt(pin.at)} ${serializeEffects(pin.effects)}`;
    result += ` (uuid "${pin.uuid}")`;
    result += ")";
    return result;
}

function serializeSchematicSheet(sheet: S.I_SchematicSheet): string {
    let result = `(sheet ${serializeAt(sheet.at)} (size ${sheet.size.x} ${sheet.size.y})`;
    if (sheet.fields_autoplaced) result += " (fields_autoplaced yes)";
    result += ` ${serializeStroke(sheet.stroke)}`;
    result += ` ${serializeFill(sheet.fill)}`;
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
                result += ` (project "${project.name}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += ` (path "${path.path}"`;
                        if (path.page) result += ` (page "${path.page}")`;
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

export function serializeSchematic(schematic: S.I_KicadSch): string {
    let result = "(kicad_sch";
    result += ` (version ${schematic.version})`;
    if (schematic.generator) result += ` (generator "${schematic.generator}")`;
    result += ` (generator_version "${schematic.generator_version}")`;
    result += ` (uuid "${schematic.uuid}")`;
    if (schematic.paper) result += ` ${serializePaper(schematic.paper)}`;
    if (schematic.embedded_fonts) result += " (embedded_fonts yes)";
    if (schematic.title_block) result += ` ${serializeTitleBlock(schematic.title_block)}`;
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
    if (schematic.hierarchical_labels && schematic.hierarchical_labels.length > 0) {
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
            if ('pts' in drawing) {
                const polyline = drawing as S.I_Polyline;
                result += ` (polyline (pts`;
                for (const pt of polyline.pts) {
                    result += ` (xy ${pt.x} ${pt.y})`;
                }
                result += ")";
                if (polyline.stroke) result += ` ${serializeStroke(polyline.stroke)}`;
                if (polyline.fill) result += ` ${serializeFill(polyline.fill)}`;
                if (polyline.uuid) result += ` (uuid "${polyline.uuid}")`;
                result += ")";
            } else if ('start' in drawing && 'end' in drawing) {
                const rectangle = drawing as S.I_Rectangle;
                result += ` (rectangle (start (xy ${rectangle.start.x} ${rectangle.start.y})) (end (xy ${rectangle.end.x} ${rectangle.end.y}))`;
                if (rectangle.stroke) result += ` ${serializeStroke(rectangle.stroke)}`;
                if (rectangle.fill) result += ` ${serializeFill(rectangle.fill)}`;
                if (rectangle.uuid) result += ` (uuid "${rectangle.uuid}")`;
                result += ")";
            } else if ('start' in drawing && 'mid' in drawing && 'end' in drawing) {
                const arc = drawing as S.I_Arc;
                result += ` (arc (start (xy ${arc.start.x} ${arc.start.y})) (mid (xy ${arc.mid!.x} ${arc.mid!.y})) (end (xy ${arc.end.x} ${arc.end.y}))`;
                if (arc.radius) {
                    result += ` (radius ${serializeVec2(arc.radius.at)} (length ${arc.radius.length}) (angles ${serializeVec2(arc.radius.angles)}))`;
                }
                if (arc.stroke) result += ` ${serializeStroke(arc.stroke)}`;
                if (arc.fill) result += ` ${serializeFill(arc.fill)}`;
                if (arc.uuid) result += ` (uuid "${arc.uuid}")`;
                result += ")";
            } else if ('text' in drawing) {
                const text = drawing as S.I_Text;
                result += ` (text "${text.text}" ${serializeAt(text.at)} ${serializeEffects(text.effects)}`;
                if (text.exclude_from_sim) result += " (exclude_from_sim yes)";
                if (text.uuid) result += ` (uuid "${text.uuid}")`;
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
    if (schematic.sheet_instances && schematic.sheet_instances.length > 0) {
        result += " (sheet_instances";
        for (const instance of schematic.sheet_instances) {
            result += ` (path "${instance.path}" (page "${instance.page}"))`;
        }
        result += ")";
    }
    if (schematic.symbol_instances && schematic.symbol_instances.length > 0) {
        result += " (symbol_instances";
        for (const instance of schematic.symbol_instances) {
            result += ` (path "${instance.path}" (reference "${instance.reference}") (unit ${instance.unit}) (value "${instance.value}") (footprint "${instance.footprint}"))`;
        }
        result += ")";
    }
    if (schematic.sheets && schematic.sheets.length > 0) {
        for (const sheet of schematic.sheets) {
            result += ` ${serializeSchematicSheet(sheet)}`;
        }
    }
    result += ")";
    return result;
}
