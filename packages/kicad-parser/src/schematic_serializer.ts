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



function serializeAt(at: C.I_At | undefined, level: number = 0, forceRotation: boolean = false): string {
    if (!at) {
        return "(at 0 0 0)";
    }
    const x = at.position?.x || 0;
    const y = at.position?.y || 0;
    const rotation = at.rotation || 0;
    if (forceRotation || rotation !== 0) {
        return `(at ${formatDouble(x)} ${formatDouble(y)} ${formatDouble(rotation)})`;
    }
    return `(at ${formatDouble(x)} ${formatDouble(y)})`;
}

function serializeEffects(effects: C.I_Effects, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    const indent3 = indentString(level + 2);
    let result = "(effects";
    if (effects.font) {
        result += `\n${indent2}(font`;
        result += `\n${indent3}(size ${formatDouble(effects.font.size?.x || 0)} ${formatDouble(effects.font.size?.y || 0)})`;
        if (effects.font.face) {
            result += `\n${indent3}(name "${escapeString(effects.font.face)}")`;
        }
        if (effects.font.thickness != null) {
            result += `\n${indent3}(thickness ${formatDouble(effects.font.thickness)})`;
        }
        if (effects.font.bold) {
            result += `\n${indent3}(bold yes)`;
        }
        if (effects.font.italic) {
            result += `\n${indent3}(italic yes)`;
        }
        result += `\n${indent2})`;
    }
    if (effects.justify) {
        const parts: string[] = [];
        if (effects.justify.horiz && effects.justify.horiz !== "center") parts.push(effects.justify.horiz);
        if (effects.justify.vert && effects.justify.vert !== "center") parts.push(effects.justify.vert);
        if (effects.justify.mirror) parts.push("mirror");
        if (parts.length > 0) {
            result += `\n${indent2}(justify ${parts.join(" ")})`;
        }
    }
    if (effects.hide) {
        result += `\n${indent2}(hide yes)`;
    }
    result += `\n${indent})`;
    return result;
}

function formatDouble(value: number): string {
    if (Number.isInteger(value)) {
        return String(value);
    }
    return value.toFixed(4).replace(/\.?0+$/, '');
}

function formatColorAlpha(alpha: number): string {
    if (alpha === 0) {
        return "0.0000";
    }
    return formatDouble(alpha);
}

function serializeStroke(stroke: C.I_Stroke, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = "(stroke";
    if (stroke.width !== undefined) {
        result += `\n${indent2}(width ${formatDouble(stroke.width)})`;
    }
    if (stroke.type) {
        result += `\n${indent2}(type ${stroke.type})`;
    }
    if (stroke.color) {
        result += `\n${indent2}(color ${Math.round(stroke.color.r * 255)} ${Math.round(stroke.color.g * 255)} ${Math.round(stroke.color.b * 255)} ${formatColorAlpha(stroke.color.a)})`;
    }
    result += `\n${indent})`;
    return result;
}

function serializeFill(fill: S.I_Fill, level: number = 0): string {
    if (!fill) return "";
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = "(fill";
    if (fill.type) {
        result += `\n${indent2}(type ${fill.type})`;
    }
    if (fill.color) {
        result += `\n${indent2}(color ${Math.round(fill.color.r * 255)} ${Math.round(fill.color.g * 255)} ${Math.round(fill.color.b * 255)} ${formatColorAlpha(fill.color.a)})`;
    }
    result += `\n${indent})`;
    return result;
}

function serializePaper(paper: C.I_Paper, level: number = 0): string {
    return `(paper "${paper.size}")`;
}

function serializeTitleBlock(titleBlock: C.I_TitleBlock, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(title_block`;
    if (titleBlock.title) {
        result += `\n${indent2}(title "${escapeString(titleBlock.title)}")`;
    }
    if (titleBlock.company) {
        result += `\n${indent2}(company "${escapeString(titleBlock.company)}")`;
    }
    if (titleBlock.date) {
        result += `\n${indent2}(date "${escapeString(titleBlock.date)}")`;
    }
    if (titleBlock.rev) {
        result += `\n${indent2}(rev "${escapeString(titleBlock.rev)}")`;
    }
    if (titleBlock.comment) {
        for (const [key, value] of Object.entries(titleBlock.comment)) {
            result += `\n${indent2}(comment ${key} "${escapeString(value)}")`;
        }
    }
    result += `\n${indent})`;
    return result;
}

function serializeProperty(property: S.I_Property, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = indent + "(property \"" + escapeString(property.name || "") + "\" \"" + escapeString(property.text || "") + "\"";
    if (property.id) {
        result += " " + property.id;
    }
    result += "\n" + indent2 + serializeAt(property.at, 0, true);
    result += "\n" + indent2 + serializeEffects(property.effects, level + 1);
    if (property.show_name) {
        result += "\n" + indent2 + "(show_name yes)";
    }
    if (property.do_not_autoplace) {
        result += "\n" + indent2 + "(do_not_autoplace yes)";
    }
    if (property.hide) {
        result += "\n" + indent2 + "(hide yes)";
    }
    result += "\n" + indent + ")";
    return result;
}

function serializePinAlternate(alternate: S.I_PinAlternate, level: number = 0): string {
    return `(alternate "${escapeString(alternate.name)}" ${alternate.type} ${alternate.shape})`;
}

function serializePin(pin: S.I_Pin, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(pin ${pin.type} ${pin.shape}`;
    result += `\n${indent2}${serializeAt(pin.at, 0, true)}`;
    result += `\n${indent2}(length ${formatDouble(pin.length)})`;
    if (pin.hide) {
        result += `\n${indent2}(hide yes)`;
    }
    result += `\n${indent2}(name "${escapeString(pin.name.text)}"`;
    const nameEffectsStr = serializeEffects(pin.name.effects, level + 2);
    result += `\n${indentString(level + 2)}${nameEffectsStr}`;
    result += `\n${indent2})`;
    result += `\n${indent2}(number "${escapeString(pin.number.text)}"`;
    const numEffectsStr = serializeEffects(pin.number.effects, level + 2);
    result += `\n${indentString(level + 2)}${numEffectsStr}`;
    result += `\n${indent2})`;
    if (pin.alternates && pin.alternates.length > 0) {
        for (const alternate of pin.alternates) {
            result += `\n${indent2}${serializePinAlternate(alternate)}`;
        }
    }
    result += `\n${indent})`;
    return result;
}

function serializeLibSymbol(symbol: S.I_LibSymbol, level: number = 0): string {
    const indent = indentString(level);
    let result = `${indent}(symbol "${escapeString(symbol.name)}"
`;
    
    if (symbol.power) result += `${indentString(level + 1)}(power)
`;
    if (symbol.pin_numbers?.hide) {
        result += `${indentString(level + 1)}(pin_numbers
`;
        result += `${indentString(level + 2)}(hide yes)
`;
        result += `${indentString(level + 1)})
`;
    }
    if (symbol.pin_names) {
        result += `${indentString(level + 1)}(pin_names
`;
        if (symbol.pin_names.offset !== undefined)
            result += `${indentString(level + 2)}(offset ${symbol.pin_names.offset})
`;
        if (symbol.pin_names.hide) result += `${indentString(level + 2)}(hide yes)
`;
        result += `${indentString(level + 1)})
`;
    }
    if (symbol.exclude_from_sim !== undefined) result += `${indentString(level + 1)}(exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})
`;
    if (symbol.in_bom !== undefined) result += `${indentString(level + 1)}(in_bom ${symbol.in_bom ? "yes" : "no"})
`;
    if (symbol.on_board !== undefined) result += `${indentString(level + 1)}(on_board ${symbol.on_board ? "yes" : "no"})
`;
    
    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += `${serializeProperty(property, level + 1)}
`;
        }
    }
    
    if (symbol.children && symbol.children.length > 0) {
        for (const child of symbol.children) {
            result += serializeLibSymbol(child, level + 1);
        }
    }
    
    if (symbol.drawings && symbol.drawings.length > 0) {
        for (const drawing of symbol.drawings) {
            if (drawing.type === "arc") {
                const arc = drawing as S.I_Arc;
                result += `${indentString(level + 1)}(arc (start ${arc.start.x} ${arc.start.y})
`;
                if (arc.mid) {
                    result += `${indentString(level + 2)}(mid ${arc.mid.x} ${arc.mid.y})
`;
                }
                result += `${indentString(level + 2)}(end ${arc.end.x} ${arc.end.y})
`;
                if (arc.radius) {
                    result += `${indentString(level + 2)}(radius (xy ${arc.radius.at.x} ${arc.radius.at.y}) (length ${arc.radius.length}) (angles ${arc.radius.angles.x} ${arc.radius.angles.y}))
`;
                }
                if (arc.stroke) result += `${indentString(level + 2)}${serializeStroke(arc.stroke, level + 2)}
`;
                if (arc.fill) result += `${indentString(level + 2)}${serializeFill(arc.fill, level + 2)}
`;
                if (arc.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(arc.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            } else if (drawing.type === "bezier") {
                const bezier = drawing as S.I_Bezier;
                result += `${indentString(level + 1)}(bezier (pts
`;
                for (const pt of bezier.pts) {
                    result += `${indentString(level + 3)}(xy ${pt.x} ${pt.y})
`;
                }
                result += `${indentString(level + 2)})
`;
                if (bezier.stroke)
                    result += `${indentString(level + 2)}${serializeStroke(bezier.stroke, level + 2)}
`;
                if (bezier.fill) result += `${indentString(level + 2)}${serializeFill(bezier.fill, level + 2)}
`;
                if (bezier.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(bezier.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            } else if (drawing.type === "circle") {
                const circle = drawing as S.I_Circle;
                result += `${indentString(level + 1)}(circle
`;
                result += `${indentString(level + 2)}(center ${circle.center.x} ${circle.center.y})
`;
                result += `${indentString(level + 2)}(radius ${circle.radius})
`;
                if (circle.stroke) {
                    result += `${indentString(level + 2)}(stroke
`;
                    const strokeStr = serializeStroke(circle.stroke!, level + 3);
                    const strokeLines = strokeStr.split("\n");
                    for (let i = 1; i < strokeLines.length -1; i++) {
                        result += strokeLines[i] + "\n";
                    }
                    result += `${indentString(level + 2)})
`;
                }
                if (circle.fill) {
                    result += `${indentString(level + 2)}(fill
`;
                    const fillStr = serializeFill(circle.fill!, level +3);
                    const fillLines = fillStr.split("\n");
                    for (let i =1; i < fillLines.length-1; i++) {
                        result += fillLines[i] + "\n";
                    }
                    result += `${indentString(level +2)})
`;
                }
                if (circle.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(circle.uuid)}")
`;
                result += `${indentString(level +1)})
`;
            } else if (drawing.type === "polyline") {
                const polyline = drawing as S.I_Polyline;
                result += `${indentString(level + 1)}(polyline
`;
                result += `${indentString(level + 2)}(pts
`;
                for (let i = 0; i < polyline.pts.length; i++) {
                    const pt = polyline.pts[i]!;
                    if (i === 0) {
                        result += `${indentString(level + 3)}(xy ${pt.x} ${pt.y})`;
                    } else {
                        result += ` (xy ${pt.x} ${pt.y})`;
                    }
                }
                result += `
`;
                result += `${indentString(level + 2)})
`;
                if (polyline.stroke) {
                    result += `${indentString(level + 2)}(stroke
`;
                    const strokeStr = serializeStroke(polyline.stroke!, level + 3);
                    const strokeLines = strokeStr.split("\n");
                    // Skip first line ("(stroke") and last line (")")
                    for (let i = 1; i < strokeLines.length - 1; i++) {
                        result += strokeLines[i] + "\n";
                    }
                    result += `${indentString(level + 2)})
`;
                }
                if (polyline.fill) {
                    result += `${indentString(level + 2)}(fill
`;
                    const fillStr = serializeFill(polyline.fill!, level + 3);
                    const fillLines = fillStr.split("\n");
                    for (let i = 1; i < fillLines.length - 1; i++) {
                        result += fillLines[i] + "\n";
                    }
                    result += `${indentString(level + 2)})
`;
                }
                if (polyline.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(polyline.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            } else if (drawing.type === "rectangle") {
                const rectangle = drawing as S.I_Rectangle;
                result += `${indentString(level + 1)}(rectangle
`;
                result += `${indentString(level + 2)}(start ${rectangle.start.x} ${rectangle.start.y})
`;
                result += `${indentString(level + 2)}(end ${rectangle.end.x} ${rectangle.end.y})
`;
                if (rectangle.stroke) {
                    result += `${indentString(level + 2)}(stroke
`;
                    const strokeStr = serializeStroke(rectangle.stroke!, level + 3);
                    const strokeLines = strokeStr.split("\n");
                    for (let i = 1; i < strokeLines.length - 1; i++) {
                        result += strokeLines[i] + "\n";
                    }
                    result += `${indentString(level + 2)})
`;
                }
                if (rectangle.fill) {
                    result += `${indentString(level + 2)}(fill
`;
                    const fillStr = serializeFill(rectangle.fill!, level + 3);
                    const fillLines = fillStr.split("\n");
                    for (let i = 1; i < fillLines.length -1; i++) {
                        result += fillLines[i] + "\n";
                    }
                    result += `${indentString(level + 2)})
`;
                }
                if (rectangle.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(rectangle.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            } else if (drawing.type === "text") {
                const text = drawing as S.I_Text;
                result += `${indentString(level + 1)}(text "${escapeString(text.text)}"`;
                if (text.exclude_from_sim != null) {
                    result += ` (exclude_from_sim ${text.exclude_from_sim ? "yes" : "no"})`;
                }
                result += ` ${serializeAt(text.at, 0, true)}
`;
                result += `${indentString(level + 2)}${serializeEffects(text.effects, level + 2)}
`;
                if (text.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(text.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            } else if (drawing.type === "text_box") {
                const textbox = drawing as S.I_TextBox;
                result += `${indentString(level + 1)}(text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at, 0, true)} (size ${textbox.size.x} ${textbox.size.y})
`;
                if (textbox.exclude_from_sim)
                    result += `${indentString(level + 2)}(exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})
`;
                if (textbox.margins)
                    result += `${indentString(level + 2)}(margins ${textbox.margins.x} ${textbox.margins.y} ${textbox.margins.z} ${textbox.margins.w})
`;
                result += `${indentString(level + 2)}${serializeEffects(textbox.effects, level + 2)}
`;
                if (textbox.stroke)
                    result += `${indentString(level + 2)}${serializeStroke(textbox.stroke, level + 2)}
`;
                if (textbox.fill) result += `${indentString(level + 2)}${serializeFill(textbox.fill, level + 2)}
`;
                if (textbox.uuid) result += `${indentString(level + 2)}(uuid "${escapeString(textbox.uuid)}")
`;
                result += `${indentString(level + 1)})
`;
            }
        }
    }
    
    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += serializePin(pin, level +1) + "\n";
        }
    }

    if (symbol.embedded_fonts !== undefined) result += `${indentString(level + 1)}(embedded_fonts ${symbol.embedded_fonts ? "yes" : "no"})
`;
    if (symbol.embedded_files)
        result += `${indentString(level + 1)}(embedded_files "${escapeString(symbol.embedded_files)}")
`;
    
    result += `${indent})
`;
    return result;
}

function serializeWire(wire: S.I_Wire): string {
    let result = "(wire (pts";
    for (const pt of wire.pts) {
        result += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
    }
    result += ")";
    result += ` ${serializeStroke(wire.stroke)}`;
    result += ` (uuid "${escapeString(wire.uuid)}")`;
    result += ")";
    return result;
}

function serializeBus(bus: S.I_Bus): string {
    let result = "(bus (pts";
    for (const pt of bus.pts) {
        result += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
    }
    result += ")";
    result += ` ${serializeStroke(bus.stroke)}`;
    result += ` (uuid "${escapeString(bus.uuid)}")`;
    result += ")";
    return result;
}

function serializeBusEntry(busEntry: S.I_BusEntry): string {
    let result = `(bus_entry `;
    if (busEntry.at) {
        const x = busEntry.at.position?.x || 0;
        const y = busEntry.at.position?.y || 0;
        result += `(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `(at 0 0)`;
    }
    result += ` (size ${formatDouble(busEntry.size.x)} ${formatDouble(busEntry.size.y)})`;
    result += ` ${serializeStroke(busEntry.stroke)}`;
    result += ` (uuid "${escapeString(busEntry.uuid)}")`;
    result += ")";
    return result;
}

function serializeBusAlias(busAlias: S.I_BusAlias): string {
    let members = "";
    if (busAlias.members && Array.isArray(busAlias.members)) {
        for (const member of busAlias.members) {
            if (members.length > 0) {
                members += " ";
            }
            members += `"${escapeString(member)}"`;
        }
    }
    return `(bus_alias "${escapeString(busAlias.name)}" (members ${members}))`;
}

function serializeJunction(junction: S.I_Junction): string {
    let result = `(junction `;
    if (junction.at) {
        const x = junction.at.position?.x || 0;
        const y = junction.at.position?.y || 0;
        result += `(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `(at 0 0)`;
    }
    if (junction.diameter) result += ` (diameter ${formatDouble(junction.diameter)})`;
    if (junction.color) {
        result += ` (color ${Math.round(junction.color.r * 255)} ${Math.round(junction.color.g * 255)} ${Math.round(junction.color.b * 255)} ${formatColorAlpha(junction.color.a)})`;
    }
    result += ` (uuid "${escapeString(junction.uuid)}")`;
    result += ")";
    return result;
}

function serializeNoConnect(noConnect: S.I_NoConnect): string {
    let result = `(no_connect `;
    if (noConnect.at) {
        const x = noConnect.at.position?.x || 0;
        const y = noConnect.at.position?.y || 0;
        result += `(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `(at 0 0)`;
    }
    result += ` (uuid "${escapeString(noConnect.uuid)}")`;
    result += ")";
    return result;
}

function serializeNetLabel(label: S.I_NetLabel): string {
    let result = `(label "${escapeString(label.text)}" ${serializeAt(label.at, 0, true)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${escapeString(label.uuid)}")`;
    result += ")";
    return result;
}

function serializeGlobalLabel(label: S.I_GlobalLabel): string {
    let result = `(global_label "${escapeString(label.text)}" ${serializeAt(label.at, 0, true)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${escapeString(label.uuid)}")`;
    result += ` (shape ${label.shape})`;
    if (label.properties && label.properties.length > 0) {
        for (const property of label.properties) {
            result += ` ${serializeProperty(property)}`;
        }
    }
    result += ")";
    return result;
}

function serializeHierarchicalLabel(label: S.I_HierarchicalLabel): string {
    let result = `(hierarchical_label "${escapeString(label.text)}" ${serializeAt(label.at, 0, true)} ${serializeEffects(label.effects)}`;
    if (label.fields_autoplaced) result += " (fields_autoplaced yes)";
    if (label.uuid) result += ` (uuid "${escapeString(label.uuid)}")`;
    result += ` (shape ${label.shape})`;
    result += ")";
    return result;
}

export function serializePinInstance(pin: S.I_PinInstance): string {
    let result = "(pin ";
    // Check if the pin number is a pin type (like power_in) that shouldn't be quoted
    const pinTypes = ["input", "output", "bidirectional", "tri_state", "passive", "dot", "round", "diamond", "rectangle", "power_in", "power_out", "open_collector", "open_emitter"];
    if (pin.number && pin.number.trim() !== "" && !pinTypes.includes(pin.number)) {
        result += `"${escapeString(pin.number)}"`;
    } else {
        // Use the pin number directly if it's a known type, or default to power_in for empty
        result += pin.number && pin.number.trim() !== "" ? pin.number : "power_in";
    }
    result += ` (uuid "${escapeString(pin.uuid)}")`;
    if (pin.alternate)
        result += ` (alternate "${escapeString(pin.alternate)}")`;
    result += ")";
    return result;
}

export function serializeSchematicSymbol(symbol: S.I_SchematicSymbol, level: number = 0): string {
    const indent = indentString(level);
    let result = `${indent}(symbol
`;
    
    if (symbol.lib_name)
        result += `${indentString(level + 1)}(lib_name "${escapeString(symbol.lib_name)}")
`;
    result += `${indentString(level + 1)}(lib_id "${escapeString(symbol.lib_id)}")
`;
    result += `${indentString(level + 1)}${serializeAt(symbol.at, 0, true)}
`;
    if (symbol.mirror) result += `${indentString(level + 1)}(mirror ${symbol.mirror})
`;
    result += `${indentString(level + 1)}(unit ${symbol.unit || 1})
`;
    if (symbol.exclude_from_sim !== undefined) result += `${indentString(level + 1)}(exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})
`;
    if (symbol.in_bom !== undefined) {
        result += `${indentString(level + 1)}(in_bom ${symbol.in_bom ? "yes" : "no"})
`;
    }
    if (symbol.on_board !== undefined) {
        result += `${indentString(level + 1)}(on_board ${symbol.on_board ? "yes" : "no"})
`;
    }
    if (symbol.dnp !== undefined) result += `${indentString(level + 1)}(dnp ${symbol.dnp ? "yes" : "no"})
`;
    if (typeof symbol.convert !== "undefined" && symbol.convert !== null) {
        result += `${indentString(level + 1)}(convert ${symbol.convert})
`;
    }
    if (symbol.fields_autoplaced) result += `${indentString(level + 1)}(fields_autoplaced yes)
`;
    result += `${indentString(level + 1)}(uuid "${escapeString(symbol.uuid)}")
`;
    
    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += `${serializeProperty(property, level + 1)}
`;
        }
    }
    
    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += `${indentString(level + 1)}${serializePinInstance(pin)}
`;
        }
    }
    
    if (symbol.default_instance) {
        result += `${indentString(level + 1)}(default_instance
`;
        result += `${indentString(level + 2)}(reference "${escapeString(symbol.default_instance.reference)}")
`;
        result += `${indentString(level + 2)}(unit "${escapeString(symbol.default_instance.unit)}")
`;
        result += `${indentString(level + 2)}(value "${escapeString(symbol.default_instance.value)}")
`;
        result += `${indentString(level + 2)}(footprint "${escapeString(symbol.default_instance.footprint)}")
`;
        result += `${indentString(level + 1)})
`;
    }
    
    if (symbol.instances) {
        result += `${indentString(level + 1)}(instances
`;
        if (symbol.instances.projects && symbol.instances.projects.length > 0) {
            for (const project of symbol.instances.projects) {
                result += `${indentString(level + 2)}(project "${escapeString(project.name)}"
`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += `${indentString(level + 3)}(path "${escapeString(path.path)}"
`;
                        if (path.reference)
                            result += `${indentString(level + 4)}(reference "${escapeString(path.reference)}")
`;
                        if (path.value)
                            result += `${indentString(level + 4)}(value "${escapeString(path.value)}")
`;
                        if (path.unit) result += `${indentString(level + 4)}(unit ${path.unit})
`;
                        if (path.footprint)
                            result += `${indentString(level + 4)}(footprint "${escapeString(path.footprint)}")
`;
                        result += `${indentString(level + 3)})
`;
                    }
                }
                result += `${indentString(level + 2)})
`;
            }
        }
        result += `${indentString(level + 1)})
`;
    }
    
    result += `${indent})
`;
    return result;
}

function serializeSheetPin(pin: S.I_SchematicSheetPin): string {
    let result = `(pin "${escapeString(pin.name)}" ${pin.shape} ${serializeAt(pin.at, 0, true)} ${serializeEffects(pin.effects)}`;
    result += ` (uuid "${escapeString(pin.uuid)}")`;
    result += ")";
    return result;
}

function serializeSchematicSheet(sheet: S.I_SchematicSheet, level: number = 0): string {
    const indent = indentString(level);
    const sizeX = sheet.size?.x || 0;
    const sizeY = sheet.size?.y || 0;
    let result = `${indent}(sheet
`;
    
    result += `${indentString(level + 1)}${serializeAt(sheet.at)}
`;
    result += `${indentString(level + 1)}(size ${formatDouble(sizeX)} ${formatDouble(sizeY)})
`;
    
    if (sheet.exclude_from_sim !== undefined) {
        result += `${indentString(level + 1)}(exclude_from_sim ${sheet.exclude_from_sim ? "yes" : "no"})
`;
    }
    if (sheet.in_bom !== undefined) {
        result += `${indentString(level + 1)}(in_bom ${sheet.in_bom ? "yes" : "no"})
`;
    }
    if (sheet.on_board !== undefined) {
        result += `${indentString(level + 1)}(on_board ${sheet.on_board ? "yes" : "no"})
`;
    }
    if (sheet.dnp !== undefined) {
        result += `${indentString(level + 1)}(dnp ${sheet.dnp ? "yes" : "no"})
`;
    }
    if (sheet.fields_autoplaced) result += `${indentString(level + 1)}(fields_autoplaced yes)
`;
    
    result += `${indentString(level + 1)}${serializeStroke(sheet.stroke)}
`;
    const fillStr = serializeFill(sheet.fill);
    if (fillStr) result += `${indentString(level + 1)}${fillStr}
`;
    
    result += `${indentString(level + 1)}(uuid "${escapeString(sheet.uuid)}")
`;
    
    if (sheet.properties && sheet.properties.length > 0) {
        for (const property of sheet.properties) {
            result += `${indentString(level + 1)}${serializeProperty(property)}
`;
        }
    }
    
    if (sheet.pins && sheet.pins.length > 0) {
        for (const pin of sheet.pins) {
            result += `${indentString(level + 1)}${serializeSheetPin(pin)}
`;
        }
    }
    
    if (sheet.instances) {
        result += `${indentString(level + 1)}(instances
`;
        if (sheet.instances.projects && sheet.instances.projects.length > 0) {
            for (const project of sheet.instances.projects) {
                result += `${indentString(level + 2)}(project "${escapeString(project.name)}"
`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += `${indentString(level + 3)}(path "${escapeString(path.path)}"
`;
                        if (path.page)
                            result += `${indentString(level + 4)}(page "${escapeString(path.page)}")
`;
                        result += `${indentString(level + 3)})
`;
                    }
                }
                result += `${indentString(level + 2)})
`;
            }
        }
        result += `${indentString(level + 1)})
`;
    }
    
    result += `${indent})
`;
    return result;
}

export { serializeLibSymbol };
function indentString(level: number): string {
    return '\t'.repeat(level);
}

export function serializeSchematic(schematic: S.I_KicadSch): string {
    let result = '(kicad_sch\n';
    const indent = 1;
    
    result += `${indentString(indent)}(version ${schematic.version || 20231129})\n`;
    if (schematic.generator)
        result += `${indentString(indent)}(generator "${escapeString(schematic.generator)}")\n`;
    result += `${indentString(indent)}(generator_version "${escapeString(schematic.generator_version || "")}")\n`;
    result += `${indentString(indent)}(uuid "${escapeString(schematic.uuid || "")}")\n`;
    if (schematic.paper) result += `${indentString(indent)}${serializePaper(schematic.paper)}\n`;
    if (schematic.title_block)
        result += `${serializeTitleBlock(schematic.title_block, indent)}\n`;
    if (schematic.lib_symbols) {
        result += `${indentString(indent)}(lib_symbols\n`;
        for (const symbol of schematic.lib_symbols) {
            result += serializeLibSymbol(symbol, indent + 1);
        }
        result += `${indentString(indent)})\n`;
    }
    if (schematic.wires && schematic.wires.length > 0) {
        for (const wire of schematic.wires) {
            result += `${indentString(indent)}${serializeWire(wire)}\n`;
        }
    }
    if (schematic.buses && schematic.buses.length > 0) {
        for (const bus of schematic.buses) {
            result += `${indentString(indent)}${serializeBus(bus)}\n`;
        }
    }
    if (schematic.bus_entries && schematic.bus_entries.length > 0) {
        for (const busEntry of schematic.bus_entries) {
            result += `${indentString(indent)}${serializeBusEntry(busEntry)}\n`;
        }
    }
    if (schematic.bus_aliases && schematic.bus_aliases.length > 0) {
        for (const busAlias of schematic.bus_aliases) {
            result += `${indentString(indent)}${serializeBusAlias(busAlias)}\n`;
        }
    }
    if (schematic.junctions && schematic.junctions.length > 0) {
        for (const junction of schematic.junctions) {
            result += `${indentString(indent)}${serializeJunction(junction)}\n`;
        }
    }
    if (schematic.no_connects && schematic.no_connects.length > 0) {
        for (const noConnect of schematic.no_connects) {
            result += `${indentString(indent)}${serializeNoConnect(noConnect)}\n`;
        }
    }
    if (schematic.net_labels && schematic.net_labels.length > 0) {
        for (const label of schematic.net_labels) {
            result += `${indentString(indent)}${serializeNetLabel(label)}\n`;
        }
    }
    if (schematic.global_labels && schematic.global_labels.length > 0) {
        for (const label of schematic.global_labels) {
            result += `${indentString(indent)}${serializeGlobalLabel(label)}\n`;
        }
    }
    if (
        schematic.hierarchical_labels &&
        schematic.hierarchical_labels.length > 0
    ) {
        for (const label of schematic.hierarchical_labels) {
            result += `${indentString(indent)}${serializeHierarchicalLabel(label)}\n`;
        }
    }
    if (schematic.symbols && schematic.symbols.length > 0) {
        for (const symbol of schematic.symbols) {
            result += serializeSchematicSymbol(symbol, indent);
        }
    }
    if (schematic.drawings && schematic.drawings.length > 0) {
        for (const drawing of schematic.drawings) {
            if (drawing.type === "arc") {
                const arc = drawing as S.I_Arc;
                result += `${indentString(indent)}(arc (start ${formatDouble(arc.start.x)} ${formatDouble(arc.start.y)})`;
                if (arc.mid) {
                    result += ` (mid ${formatDouble(arc.mid.x)} ${formatDouble(arc.mid.y)})`;
                }
                result += ` (end ${formatDouble(arc.end.x)} ${formatDouble(arc.end.y)})`;
                if (arc.radius) {
                    result += ` (radius (xy ${formatDouble(arc.radius.at.x)} ${formatDouble(arc.radius.at.y)}) (length ${formatDouble(arc.radius.length)}) (angles ${formatDouble(arc.radius.angles.x)} ${formatDouble(arc.radius.angles.y)}))`;
                }
                if (arc.stroke) result += ` ${serializeStroke(arc.stroke)}`;
                if (arc.fill) result += ` ${serializeFill(arc.fill)}`;
                if (arc.uuid) result += ` (uuid "${escapeString(arc.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "bezier") {
                const bezier = drawing as S.I_Bezier;
                result += `${indentString(indent)}(bezier (pts`;
                for (const pt of bezier.pts) {
                    result += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
                }
                result += `)`;
                if (bezier.stroke)
                    result += ` ${serializeStroke(bezier.stroke)}`;
                if (bezier.fill) result += ` ${serializeFill(bezier.fill)}`;
                if (bezier.uuid) result += ` (uuid "${escapeString(bezier.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "circle") {
                const circle = drawing as S.I_Circle;
                result += `${indentString(indent)}(circle (center ${formatDouble(circle.center.x)} ${formatDouble(circle.center.y)}) (radius ${formatDouble(circle.radius)})`;
                if (circle.stroke)
                    result += ` ${serializeStroke(circle.stroke)}`;
                if (circle.fill) result += ` ${serializeFill(circle.fill)}`;
                if (circle.uuid) result += ` (uuid "${escapeString(circle.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "polyline") {
                const polyline = drawing as S.I_Polyline;
                result += `${indentString(indent)}(polyline (pts`;
                for (const pt of polyline.pts) {
                    result += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
                }
                result += `)`;
                if (polyline.stroke)
                    result += ` ${serializeStroke(polyline.stroke)}`;
                if (polyline.fill) result += ` ${serializeFill(polyline.fill)}`;
                if (polyline.uuid) result += ` (uuid "${escapeString(polyline.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "rectangle") {
                const rectangle = drawing as S.I_Rectangle;
                result += `${indentString(indent)}(rectangle (start ${formatDouble(rectangle.start.x)} ${formatDouble(rectangle.start.y)}) (end ${formatDouble(rectangle.end.x)} ${formatDouble(rectangle.end.y)})`;
                if (rectangle.stroke)
                    result += ` ${serializeStroke(rectangle.stroke)}`;
                if (rectangle.fill)
                    result += ` ${serializeFill(rectangle.fill)}`;
                if (rectangle.uuid) result += ` (uuid "${escapeString(rectangle.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "text") {
                const text = drawing as S.I_Text;
                result += `${indentString(indent)}(text "${escapeString(text.text)}"`;
                if (text.exclude_from_sim != null) {
                    result += ` (exclude_from_sim ${text.exclude_from_sim ? "yes" : "no"})`;
                }
                result += ` ${serializeAt(text.at, 0, true)} ${serializeEffects(text.effects)}`;
                if (text.uuid) result += ` (uuid "${escapeString(text.uuid)}")`;
                result += `)\n`;
            } else if (drawing.type === "text_box") {
                const textbox = drawing as S.I_TextBox;
                result += `${indentString(indent)}(text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at, 0, true)} (size ${formatDouble(textbox.size.x)} ${formatDouble(textbox.size.y)})`;
                if (textbox.exclude_from_sim)
                    result += ` (exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})`;
                if (textbox.margins)
                    result += ` (margins ${formatDouble(textbox.margins.x)} ${formatDouble(textbox.margins.y)} ${formatDouble(textbox.margins.z)} ${formatDouble(textbox.margins.w)})`;
                result += ` ${serializeEffects(textbox.effects)}`;
                if (textbox.stroke)
                    result += ` ${serializeStroke(textbox.stroke)}`;
                if (textbox.fill) result += ` ${serializeFill(textbox.fill)}`;
                if (textbox.uuid) result += ` (uuid "${escapeString(textbox.uuid)}")`;
                result += `)\n`;
            }
        }
    }
    if (schematic.images && schematic.images.length > 0) {
        for (const image of schematic.images) {
            // Split base64 data into chunks of ~76 characters (KiCad style)
            const chunkSize = 76;
            const chunks: string[] = [];
            for (let i = 0; i < image.data.length; i += chunkSize) {
                chunks.push(image.data.slice(i, i + chunkSize));
            }
            result += `${indentString(indent)}(image\n`;
            result += `${indentString(indent + 1)}${serializeAt(image.at)}\n`;
            result += `${indentString(indent + 1)}(data ${chunks.join(" ")})\n`;
            result += `${indentString(indent + 1)}(scale ${formatDouble(image.scale)})\n`;
            if (image.uuid) {
                result += `${indentString(indent + 1)}(uuid "${escapeString(image.uuid)}")\n`;
            }
            result += `${indentString(indent)})\n`;
        }
    }
    if (schematic.sheets && schematic.sheets.length > 0) {
        for (const sheet of schematic.sheets) {
            result += serializeSchematicSheet(sheet, indent);
        }
    }
    if (schematic.sheet_instances && schematic.sheet_instances.length > 0) {
        result += `${indentString(indent)}(sheet_instances\n`;
        for (const instance of schematic.sheet_instances) {
            result += `${indentString(indent + 1)}(path "${escapeString(instance.path)}"`;
            if (instance.page)
                result += ` (page "${escapeString(instance.page)}")`;
            result += `)\n`;
        }
        result += `${indentString(indent)})\n`;
    }
    if (schematic.symbol_instances && schematic.symbol_instances.length > 0) {
        result += `${indentString(indent)}(symbol_instances\n`;
        for (const instance of schematic.symbol_instances) {
            result += `${indentString(indent + 1)}(path "${escapeString(instance.path)}" (reference "${escapeString(instance.reference)}") (unit ${instance.unit}) (value "${escapeString(instance.value)}") (footprint "${escapeString(instance.footprint)}"))\n`;
        }
        result += `${indentString(indent)})\n`;
    }
    if (schematic.embedded_fonts !== undefined) {
        result += `${indentString(indent)}(embedded_fonts ${schematic.embedded_fonts ? "yes" : "no"})\n`;
    }
    result += `)\n`;
    return result;
}


