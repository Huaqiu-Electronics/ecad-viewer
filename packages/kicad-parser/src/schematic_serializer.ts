
/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type * as S from "./proto/schematic";
import type * as C from "./proto/common";

function indentString(level: number): string {
    return ' '.repeat(level * 8);
}

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

function serializeEffects(effects: C.I_Effects | undefined, level: number = 0): string {
    if (!effects) {
        return "";
    }
    const indent = indentString(level);
    let result = "(effects";
    if (effects.font) {
        result += `\n${indentString(level + 1)}(font`;
        result += `\n${indentString(level + 2)}(size ${formatDouble(effects.font.size?.x || 0)} ${formatDouble(effects.font.size?.y || 0)})`;
        if (effects.font.face) {
            result += `\n${indentString(level + 2)}(name "${escapeString(effects.font.face)}")`;
        }
        if (effects.font.thickness != null) {
            result += `\n${indentString(level + 2)}(thickness ${formatDouble(effects.font.thickness)})`;
        }
        if (effects.font.bold) {
            result += `\n${indentString(level + 2)}(bold yes)`;
        }
        if (effects.font.italic) {
            result += `\n${indentString(level + 2)}(italic yes)`;
        }
        result += `\n${indentString(level + 1)})`;
    }
    if (effects.justify) {
        const parts: string[] = [];
        if (effects.justify.horiz && effects.justify.horiz !== "center") parts.push(effects.justify.horiz);
        if (effects.justify.vert && effects.justify.vert !== "center") parts.push(effects.justify.vert);
        if (effects.justify.mirror) parts.push("mirror");
        if (parts.length > 0) {
            result += `\n${indentString(level + 1)}(justify ${parts.join(" ")})`;
        }
    }
    if (effects.hide) {
        result += `\n${indentString(level + 1)}(hide yes)`;
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
        return "0";
    }
    return formatDouble(alpha);
}

function serializeStroke(stroke: C.I_Stroke | undefined, level: number = 0): string {
    if (!stroke) return "";
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(stroke`;
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

function serializeFill(fill: S.I_Fill | undefined, level: number = 0): string {
    if (!fill) return "";
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(fill`;
    result += `\n${indent2}(type ${fill.type || "none"})`;
    if (fill.color) {
        result += `\n${indent2}(color ${Math.round(fill.color.r * 255)} ${Math.round(fill.color.g * 255)} ${Math.round(fill.color.b * 255)} ${formatColorAlpha(fill.color.a)})`;
    }
    result += `\n${indent})`;
    return result;
}

function serializeStrokeInline(stroke: C.I_Stroke | undefined): string {
    let result = "";
    result += ` (width ${formatDouble(stroke?.width || 0)})`;
    result += ` (type ${stroke?.type || "default"})`;
    if (stroke?.color) {
        result += ` (color ${Math.round(stroke.color.r * 255)} ${Math.round(stroke.color.g * 255)} ${Math.round(stroke.color.b * 255)} ${formatColorAlpha(stroke.color.a)})`;
    }
    return result;
}

function serializeFillInline(fill: S.I_Fill | undefined): string {
    let result = "";
    if (fill?.type && fill.type !== "none") {
        result += ` (type ${fill.type})`;
    }
    if (fill?.color) {
        result += ` (color ${Math.round(fill.color.r * 255)} ${Math.round(fill.color.g * 255)} ${Math.round(fill.color.b * 255)} ${formatColorAlpha(fill.color.a)})`;
    }
    return result;
}

function serializePaper(paper: C.I_Paper, level: number = 0): string {
    return `(paper "${paper.size}")`;
}

function serializeTitleBlock(titleBlock: C.I_TitleBlock, level: number = 0): string {
    const indent = indentString(level);
    let result = `${indent}(title_block`;
    if (titleBlock.title) {
        result += `\n${indentString(level + 1)}(title "${escapeString(titleBlock.title)}")`;
    }
    if (titleBlock.company) {
        result += `\n${indentString(level + 1)}(company "${escapeString(titleBlock.company)}")`;
    }
    if (titleBlock.date) {
        result += `\n${indentString(level + 1)}(date "${escapeString(titleBlock.date)}")`;
    }
    if (titleBlock.rev) {
        result += `\n${indentString(level + 1)}(rev "${escapeString(titleBlock.rev)}")`;
    }
    if (titleBlock.comment) {
        for (const [key, value] of Object.entries(titleBlock.comment)) {
            result += `\n${indentString(level + 1)}(comment ${key} "${escapeString(value as string)}")`;
        }
    }
    result += `\n${indent})`;
    return result;
}

function serializeProperty(property: S.I_Property, level: number = 0): string {
    const indent = indentString(level);
    let result = indent + '(property "' + escapeString(property.name || "") + '" "' + escapeString(property.text || "") + '"';
    if (property.id) {
        result += " " + property.id;
    }
    result += `\n${indentString(level + 1)}${serializeAt(property.at, 0, true)}`;
    result += `\n${indentString(level + 1)}${serializeEffects(property.effects, level + 1)}`;
    if (property.show_name) {
        result += `\n${indentString(level + 1)}(show_name yes)`;
    }
    if (property.do_not_autoplace) {
        result += `\n${indentString(level + 1)}(do_not_autoplace yes)`;
    }
    if (property.hide) {
        result += `\n${indentString(level + 1)}(hide yes)`;
    }
    result += `\n${indent})`;
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
    result += `\n${indentString(level + 2)}(effects`;
    result += `\n${indentString(level + 3)}(font`;
    result += `\n${indentString(level + 4)}(size ${formatDouble(pin.name.effects?.font?.size?.x || 1.0)} ${formatDouble(pin.name.effects?.font?.size?.y || 1.0)})`;
    result += `\n${indentString(level + 3)})`;
    result += `\n${indentString(level + 2)})`;
    result += `\n${indent2})`;
    result += `\n${indent2}(number "${escapeString(pin.number.text)}"`;
    result += `\n${indentString(level + 2)}(effects`;
    result += `\n${indentString(level + 3)}(font`;
    result += `\n${indentString(level + 4)}(size ${formatDouble(pin.number.effects?.font?.size?.x || 1.0)} ${formatDouble(pin.number.effects?.font?.size?.y || 1.0)})`;
    result += `\n${indentString(level + 3)})`;
    result += `\n${indentString(level + 2)})`;
    result += `\n${indent2})`;
    if (pin.alternates && pin.alternates.length > 0) {
        for (const alternate of pin.alternates) {
            result += `\n${indent2}${serializePinAlternate(alternate)}`;
        }
    }
    result += `\n${indent})`;
    return result;
}

export function serializeLibSymbol(symbol: S.I_LibSymbol, level: number = 0): string {
    const indent = indentString(level);
    let result = `${indent}(symbol "${escapeString(symbol.name)}"`;

    if (symbol.power) result += `\n${indentString(level + 1)}(power)`;
    if (symbol.pin_names?.hide) {
        result += `\n${indentString(level + 1)}(pin_names`;
        result += `\n${indentString(level + 2)}(hide yes)`;
        result += `\n${indentString(level + 1)})`;
    } else if (symbol.pin_names) {
        result += `\n${indentString(level + 1)}(pin_names`;
        if (symbol.pin_names.offset !== undefined)
            result += `\n${indentString(level + 2)}(offset ${symbol.pin_names.offset})`;
        if (symbol.pin_names.hide) result += `\n${indentString(level + 2)}(hide yes)`;
        result += `\n${indentString(level + 1)})`;
    }
    if (symbol.exclude_from_sim !== undefined) result += `\n${indentString(level + 1)}(exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})`;
    if (symbol.in_bom !== undefined) result += `\n${indentString(level + 1)}(in_bom ${symbol.in_bom ? "yes" : "no"})`;
    if (symbol.on_board !== undefined) result += `\n${indentString(level + 1)}(on_board ${symbol.on_board ? "yes" : "no"})`;

    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += `\n${serializeProperty(property, level + 1)}`;
        }
    }

    if (symbol.children && symbol.children.length > 0) {
        for (const child of symbol.children) {
            result += `\n${serializeLibSymbol(child, level + 1)}`;
        }
    }

    if (symbol.drawings && symbol.drawings.length > 0) {
        for (const drawing of symbol.drawings) {
            if (drawing.type === "arc") {
                const arc = drawing as S.I_Arc;
                result += `\n${indentString(level + 1)}(arc`;
                result += `\n${indentString(level + 2)}(start ${formatDouble(arc.start.x)} ${formatDouble(arc.start.y)})`;
                if (arc.mid) {
                    result += `\n${indentString(level + 2)}(mid ${formatDouble(arc.mid.x)} ${formatDouble(arc.mid.y)})`;
                }
                result += `\n${indentString(level + 2)}(end ${formatDouble(arc.end.x)} ${formatDouble(arc.end.y)})`;
                if (arc.radius) {
                    result += `\n${indentString(level + 2)}(radius`;
                    result += `\n${indentString(level + 3)}(xy ${formatDouble(arc.radius.at.x)} ${formatDouble(arc.radius.at.y)})`;
                    result += `\n${indentString(level + 3)}(length ${formatDouble(arc.radius.length)})`;
                    result += `\n${indentString(level + 3)}(angles ${formatDouble(arc.radius.angles.x)} ${formatDouble(arc.radius.angles.y)})`;
                    result += `\n${indentString(level + 2)})`;
                }
                const strokeStr = serializeStroke(arc.stroke, level + 2);
                if (strokeStr) {
                    result += `\n${strokeStr}`;
                }
                const fillStr = serializeFill(arc.fill, level + 2);
                if (fillStr) {
                    result += `\n${fillStr}`;
                }
                if (arc.uuid) result += `\n${indentString(level + 2)}(uuid "${escapeString(arc.uuid)}")`;
                result += `\n${indentString(level + 1)})`;
            } else if (drawing.type === "bezier") {
                const bezier = drawing as S.I_Bezier;
                result += `\n${indentString(level + 1)}(bezier`;
                result += `\n${indentString(level + 2)}(pts`;
                for (const pt of bezier.pts) {
                    result += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
                }
                result += `)`;
                const strokeStr = serializeStroke(bezier.stroke, level + 2);
                if (strokeStr) {
                    result += `\n${strokeStr}`;
                }
                const fillStr = serializeFill(bezier.fill, level + 2);
                if (fillStr) {
                    result += `\n${fillStr}`;
                }
                if (bezier.uuid) result += `\n${indentString(level + 2)}(uuid "${escapeString(bezier.uuid)}")`;
                result += `\n${indentString(level + 1)})`;
            } else if (drawing.type === "circle") {
                const circle = drawing as S.I_Circle;
                result += `\n${indentString(level + 1)}(circle`;
                result += `\n${indentString(level + 2)}(center ${formatDouble(circle.center.x)} ${formatDouble(circle.center.y)})`;
                result += `\n${indentString(level + 2)}(radius ${formatDouble(circle.radius)})`;
                const strokeStr = serializeStroke(circle.stroke, level + 2);
                if (strokeStr) {
                    result += `\n${strokeStr}`;
                }
                const fillStr = serializeFill(circle.fill, level + 2);
                if (fillStr) {
                    result += `\n${fillStr}`;
                }
                if (circle.uuid) result += `\n${indentString(level + 2)}(uuid "${escapeString(circle.uuid)}")`;
                result += `\n${indentString(level + 1)})`;
            } else if (drawing.type === "polyline") {
                        const polyline = drawing as S.I_Polyline;
                        const indent2 = indentString(level + 1);
                        const indent3 = indentString(level + 2);
                        const indent4 = indentString(level + 3);
                        result += `\n${indent2}(polyline`;
                        result += `\n${indent3}(pts`;
                        result += `\n${indent4}`;
                        for (const pt of polyline.pts) {
                            result += `(xy ${formatDouble(pt.x)} ${formatDouble(pt.y)}) `;
                        }
                        result = result.trim();
                        result += `\n${indent3})`;
                        const strokeStr = serializeStroke(polyline.stroke, level + 2);
                        if (strokeStr) {
                            result += `\n${strokeStr}`;
                        }
                        const fillStr = serializeFill(polyline.fill, level + 2);
                        if (fillStr) {
                            result += `\n${fillStr}`;
                        }
                        if (polyline.uuid) result += `\n${indent3}(uuid "${escapeString(polyline.uuid)}")`;
                        result += `\n${indent2})`;
            } else if (drawing.type === "rectangle") {
                const rectangle = drawing as S.I_Rectangle;
                result += `\n${indentString(level + 1)}(rectangle`;
                result += `\n${indentString(level + 2)}(start ${formatDouble(rectangle.start.x)} ${formatDouble(rectangle.start.y)})`;
                result += `\n${indentString(level + 2)}(end ${formatDouble(rectangle.end.x)} ${formatDouble(rectangle.end.y)})`;
                const strokeStr = serializeStroke(rectangle.stroke, level + 2);
                if (strokeStr) {
                    result += `\n${strokeStr}`;
                }
                const fillStr = serializeFill(rectangle.fill, level + 2);
                if (fillStr) {
                    result += `\n${fillStr}`;
                }
                if (rectangle.uuid) result += `\n${indentString(level + 2)}(uuid "${escapeString(rectangle.uuid)}")`;
                result += `\n${indentString(level + 1)})`;
            } else if (drawing.type === "text") {
                const text = drawing as S.I_Text;
                result += `\n${indentString(level + 1)}(text "${escapeString(text.text)}"`;
                if (text.exclude_from_sim !== undefined) {
                    result += ` (exclude_from_sim ${text.exclude_from_sim ? "yes" : "no"})`;
                }
                result += ` ${serializeAt(text.at, 0, true)} ${serializeEffects(text.effects)}`;
                if (text.uuid) result += ` (uuid "${escapeString(text.uuid)}")`;
                result += ")";
            } else if (drawing.type === "text_box") {
                const textbox = drawing as S.I_TextBox;
                result += `\n${indentString(level + 1)}(text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at, 0, true)} (size ${formatDouble(textbox.size.x)} ${formatDouble(textbox.size.y)})`;
                if (textbox.exclude_from_sim)
                    result += ` (exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})`;
                if (textbox.margins)
                    result += ` (margins ${formatDouble(textbox.margins.x)} ${formatDouble(textbox.margins.y)} ${formatDouble(textbox.margins.z)} ${formatDouble(textbox.margins.w)})`;
                result += ` ${serializeEffects(textbox.effects)}`;
                const strokeStr = serializeStroke(textbox.stroke, level + 2);
                if (strokeStr) {
                    result += `\n${strokeStr}`;
                }
                const fillStr = serializeFill(textbox.fill, level + 2);
                if (fillStr) {
                    result += `\n${fillStr}`;
                }
                if (textbox.uuid) result += `\n${indentString(level + 2)}(uuid "${escapeString(textbox.uuid)}")`;
                result += `\n${indentString(level + 1)})`;
            }
        }
    }

    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += `\n${serializePin(pin, level + 1)}`;
        }
    }

    result += `\n${indent})`;
    return result;
}

function serializeWire(wire: S.I_Wire, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    const indent3 = indentString(level + 2);
    let result = `${indent}(wire`;
    result += `\n${indent2}(pts`;
    result += `\n${indent3}`;
    let ptsStr = "";
    for (const pt of wire.pts) {
        ptsStr += `(xy ${formatDouble(pt.x)} ${formatDouble(pt.y)}) `;
    }
    result += ptsStr.trim();
    result += `\n${indent2})`;
    const strokeStr = serializeStroke(wire.stroke, level + 1);
    if (strokeStr) {
        result += `\n${strokeStr}`;
    }
    result += `\n${indent2}(uuid "${escapeString(wire.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeBus(bus: S.I_Bus, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    const indent3 = indentString(level + 2);
    let result = `${indent}(bus`;
    result += `\n${indent2}(pts`;
    result += `\n${indent3}`;
    let ptsStr = "";
    for (const pt of bus.pts) {
        ptsStr += `(xy ${formatDouble(pt.x)} ${formatDouble(pt.y)}) `;
    }
    result += ptsStr.trim();
    result += `\n${indent2})`;
    const strokeStr = serializeStroke(bus.stroke, level + 1);
    if (strokeStr) {
        result += `\n${strokeStr}`;
    }
    result += `\n${indent2}(uuid "${escapeString(bus.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeBusEntry(busEntry: S.I_BusEntry, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(bus_entry`;
    if (busEntry.at) {
        const x = busEntry.at.position?.x || 0;
        const y = busEntry.at.position?.y || 0;
        result += `\n${indent2}(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `\n${indent2}(at 0 0)`;
    }
    result += `\n${indent2}(size ${formatDouble(busEntry.size.x)} ${formatDouble(busEntry.size.y)})`;
    const strokeStr = serializeStroke(busEntry.stroke, level + 1);
    if (strokeStr) {
        result += `\n${strokeStr}`;
    }
    result += `\n${indent2}(uuid "${escapeString(busEntry.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeBusAlias(busAlias: S.I_BusAlias, level: number = 0): string {
    const indent = indentString(level);
    let members = "";
    if (busAlias.members && Array.isArray(busAlias.members)) {
        for (const member of busAlias.members) {
            if (members.length > 0) {
                members += " ";
            }
            members += `"${escapeString(member)}"`;
        }
    }
    return `${indent}(bus_alias "${escapeString(busAlias.name)}" (members ${members}))`;
}

function serializeJunction(junction: S.I_Junction, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(junction`;
    if (junction.at) {
        const x = junction.at.position?.x || 0;
        const y = junction.at.position?.y || 0;
        result += `\n${indent2}(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `\n${indent2}(at 0 0)`;
    }
    if (junction.diameter) result += `\n${indent2}(diameter ${formatDouble(junction.diameter)})`;
    if (junction.color) {
        result += `\n${indent2}(color ${Math.round(junction.color.r * 255)} ${Math.round(junction.color.g * 255)} ${Math.round(junction.color.b * 255)} ${formatColorAlpha(junction.color.a)})`;
    }
    result += `\n${indent2}(uuid "${escapeString(junction.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeNoConnect(noConnect: S.I_NoConnect, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(no_connect`;
    if (noConnect.at) {
        const x = noConnect.at.position?.x || 0;
        const y = noConnect.at.position?.y || 0;
        result += `\n${indent2}(at ${formatDouble(x)} ${formatDouble(y)})`;
    } else {
        result += `\n${indent2}(at 0 0)`;
    }
    result += `\n${indent2}(uuid "${escapeString(noConnect.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeNetLabel(label: S.I_NetLabel, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(label "${escapeString(label.text)}"`;
    result += `\n${indent2}${serializeAt(label.at, 0, true)}`;
    result += `\n${indent2}${serializeEffects(label.effects, level + 1)}`;
    if (label.fields_autoplaced) result += `\n${indent2}(fields_autoplaced yes)`;
    if (label.uuid) result += `\n${indent2}(uuid "${escapeString(label.uuid)}")`;
    result += `\n${indent})`;
    return result;
}

function serializeGlobalLabel(label: S.I_GlobalLabel, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(global_label "${escapeString(label.text)}"`;
    result += `\n${indent2}${serializeAt(label.at, 0, true)}`;
    result += `\n${indent2}${serializeEffects(label.effects, level + 1)}`;
    if (label.fields_autoplaced) result += `\n${indent2}(fields_autoplaced yes)`;
    if (label.uuid) result += `\n${indent2}(uuid "${escapeString(label.uuid)}")`;
    result += `\n${indent2}(shape ${label.shape})`;
    if (label.properties && label.properties.length > 0) {
        for (const property of label.properties) {
            result += `\n${serializeProperty(property, level + 1)}`;
        }
    }
    result += `\n${indent})`;
    return result;
}

function serializeHierarchicalLabel(label: S.I_HierarchicalLabel, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(hierarchical_label "${escapeString(label.text)}"`;
    result += `\n${indent2}${serializeAt(label.at, 0, true)}`;
    result += `\n${indent2}${serializeEffects(label.effects, level + 1)}`;
    if (label.fields_autoplaced) result += `\n${indent2}(fields_autoplaced yes)`;
    if (label.uuid) result += `\n${indent2}(uuid "${escapeString(label.uuid)}")`;
    result += `\n${indent2}(shape ${label.shape})`;
    result += `\n${indent})`;
    return result;
}

export function serializePinInstance(pin: S.I_PinInstance, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(pin "${escapeString(pin.number)}"`;
    result += `\n${indent2}(uuid "${escapeString(pin.uuid)}")`;
    if (pin.alternate)
        result += `\n${indent2}(alternate "${escapeString(pin.alternate)}")`;
    result += `\n${indent})`;
    return result;
}

export function serializeSchematicSymbol(symbol: S.I_SchematicSymbol, level: number = 0): string {
    const indent = indentString(level);
    let result = `${indent}(symbol`;

    if (symbol.lib_name)
        result += `\n${indentString(level + 1)}(lib_name "${escapeString(symbol.lib_name)}")`;
    result += `\n${indentString(level + 1)}(lib_id "${escapeString(symbol.lib_id)}")`;
    result += `\n${indentString(level + 1)}${serializeAt(symbol.at, 0, true)}`;
    if (symbol.mirror) result += `\n${indentString(level + 1)}(mirror ${symbol.mirror})`;
    result += `\n${indentString(level + 1)}(unit ${symbol.unit || 1})`;
    if (symbol.exclude_from_sim !== undefined) result += `\n${indentString(level + 1)}(exclude_from_sim ${symbol.exclude_from_sim ? "yes" : "no"})`;
    if (symbol.in_bom !== undefined) {
        result += `\n${indentString(level + 1)}(in_bom ${symbol.in_bom ? "yes" : "no"})`;
    }
    if (symbol.on_board !== undefined) {
        result += `\n${indentString(level + 1)}(on_board ${symbol.on_board ? "yes" : "no"})`;
    }
    if (symbol.dnp !== undefined) result += `\n${indentString(level + 1)}(dnp ${symbol.dnp ? "yes" : "no"})`;
    if (typeof symbol.convert !== "undefined" && symbol.convert !== null) {
        result += `\n${indentString(level + 1)}(convert ${symbol.convert})`;
    }
    if (symbol.fields_autoplaced) result += `\n${indentString(level + 1)}(fields_autoplaced yes)`;
    result += `\n${indentString(level + 1)}(uuid "${escapeString(symbol.uuid)}")`;

    if (symbol.properties && symbol.properties.length > 0) {
        for (const property of symbol.properties) {
            result += `\n${serializeProperty(property, level + 1)}`;
        }
    }

    if (symbol.pins && symbol.pins.length > 0) {
        for (const pin of symbol.pins) {
            result += `\n${serializePinInstance(pin, level + 1)}`;
        }
    }

    if (symbol.default_instance) {
        result += `\n${indentString(level + 1)}(default_instance`;
        result += `\n${indentString(level + 2)}(reference "${escapeString(symbol.default_instance.reference)}")`;
        result += `\n${indentString(level + 2)}(unit "${escapeString(symbol.default_instance.unit)}")`;
        result += `\n${indentString(level + 2)}(value "${escapeString(symbol.default_instance.value)}")`;
        result += `\n${indentString(level + 2)}(footprint "${escapeString(symbol.default_instance.footprint)}")`;
        result += `\n${indentString(level + 1)})`;
    }

    if (symbol.instances) {
        result += `\n${indentString(level + 1)}(instances`;
        if (symbol.instances.projects && symbol.instances.projects.length > 0) {
            for (const project of symbol.instances.projects) {
                result += `\n${indentString(level + 2)}(project "${escapeString(project.name)}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += `\n${indentString(level + 3)}(path "${escapeString(path.path)}"`;
                        if (path.reference)
                            result += `\n${indentString(level + 4)}(reference "${escapeString(path.reference)}")`;
                        if (path.value)
                            result += `\n${indentString(level + 4)}(value "${escapeString(path.value)}")`;
                        if (path.unit) result += `\n${indentString(level + 4)}(unit ${path.unit})`;
                        if (path.footprint)
                            result += `\n${indentString(level + 4)}(footprint "${escapeString(path.footprint)}")`;
                        result += `\n${indentString(level + 3)})`;
                    }
                }
                result += `\n${indentString(level + 2)})`;
            }
        }
        result += `\n${indentString(level + 1)})`;
    }

    result += `\n${indent})`;
    return result;
}

function serializeSheetPin(pin: S.I_SchematicSheetPin, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    let result = `${indent}(pin "${escapeString(pin.name)}" ${pin.shape}`;
    result += `\n${indent2}${serializeAt(pin.at, 0, true)}`;
    result += `\n${indent2}(uuid "${escapeString(pin.uuid)}")`;
    result += `\n${indent2}${serializeEffects(pin.effects, level + 1)}`;
    result += `\n${indent})`;
    return result;
}

function serializeSchematicSheet(sheet: S.I_SchematicSheet, level: number = 0): string {
    const indent = indentString(level);
    const indent2 = indentString(level + 1);
    const sizeX = sheet.size?.x || 0;
    const sizeY = sheet.size?.y || 0;
    let result = `${indent}(sheet`;

    result += `\n${indent2}${serializeAt(sheet.at)}`;
    result += `\n${indent2}(size ${formatDouble(sizeX)} ${formatDouble(sizeY)})`;

    if (sheet.exclude_from_sim !== undefined) {
        result += `\n${indent2}(exclude_from_sim ${sheet.exclude_from_sim ? "yes" : "no"})`;
    }
    if (sheet.in_bom !== undefined) {
        result += `\n${indent2}(in_bom ${sheet.in_bom ? "yes" : "no"})`;
    }
    if (sheet.on_board !== undefined) {
        result += `\n${indent2}(on_board ${sheet.on_board ? "yes" : "no"})`;
    }
    if (sheet.dnp !== undefined) {
        result += `\n${indent2}(dnp ${sheet.dnp ? "yes" : "no"})`;
    }
    if (sheet.fields_autoplaced) result += `\n${indent2}(fields_autoplaced yes)`;

    if (sheet.stroke) {
        const strokeStr = serializeStroke(sheet.stroke, level + 1);
        result += `\n${strokeStr}`;
    }

    if (sheet.fill) {
        const fillStr = serializeFill(sheet.fill, level + 1);
        result += `\n${fillStr}`;
    }

    result += `\n${indent2}(uuid "${escapeString(sheet.uuid)}")`;

    if (sheet.properties && sheet.properties.length > 0) {
        for (const property of sheet.properties) {
            result += `\n${serializeProperty(property, level + 1)}`;
        }
    }

    if (sheet.pins && sheet.pins.length > 0) {
        for (const pin of sheet.pins) {
            result += `\n${serializeSheetPin(pin, level + 1)}`;
        }
    }

    if (sheet.instances) {
        result += `\n${indent2}(instances`;
        if (sheet.instances.projects && sheet.instances.projects.length > 0) {
            for (const project of sheet.instances.projects) {
                result += `\n${indentString(level + 2)}(project "${escapeString(project.name)}"`;
                if (project.paths && project.paths.length > 0) {
                    for (const path of project.paths) {
                        result += `\n${indentString(level + 3)}(path "${escapeString(path.path)}"`;
                        if (path.page)
                            result += `\n${indentString(level + 4)}(page "${escapeString(path.page)}")`;
                        result += `\n${indentString(level + 3)})`;
                    }
                }
                result += `\n${indentString(level + 2)})`;
            }
        }
        result += `\n${indent2})`;
    }

    result += `\n${indent})`;
    return result;
}

export function serializeSchematic(schematic: S.I_KicadSch): string {
    let result = '(kicad_sch';
    const indentLevel = 1;

    result += `\n${indentString(indentLevel)}(version ${schematic.version || 20250114})`;
    if (schematic.generator)
        result += `\n${indentString(indentLevel)}(generator "${escapeString(schematic.generator)}")`;
    result += `\n${indentString(indentLevel)}(generator_version "${escapeString(schematic.generator_version || "")}")`;
    result += `\n${indentString(indentLevel)}(uuid "${escapeString(schematic.uuid || "")}")`;
    if (schematic.paper) result += `\n${indentString(indentLevel)}${serializePaper(schematic.paper)}`;
    if (schematic.title_block)
        result += `\n${serializeTitleBlock(schematic.title_block, indentLevel)}`;
    if (schematic.lib_symbols) {
        result += `\n${indentString(indentLevel)}(lib_symbols`;
        for (const symbol of schematic.lib_symbols) {
            result += `\n${serializeLibSymbol(symbol, indentLevel + 1)}`;
        }
        result += `\n${indentString(indentLevel)})`;
    }
    if (schematic.elements && schematic.elements.length > 0) {
        for (const element of schematic.elements) {
            switch (element.type) {
                case "junction":
                    result += `\n${serializeJunction(element.data, indentLevel)}`;
                    break;
                case "wire":
                    result += `\n${serializeWire(element.data, indentLevel)}`;
                    break;
                case "bus":
                    result += `\n${serializeBus(element.data, indentLevel)}`;
                    break;
                case "bus_entry":
                    result += `\n${serializeBusEntry(element.data, indentLevel)}`;
                    break;
                case "bus_alias":
                    result += `\n${indentString(indentLevel)}${serializeBusAlias(element.data)}`;
                    break;
                case "no_connect":
                    result += `\n${serializeNoConnect(element.data, indentLevel)}`;
                    break;
                case "label":
                    result += `\n${serializeNetLabel(element.data, indentLevel)}`;
                    break;
                case "global_label":
                    result += `\n${serializeGlobalLabel(element.data, indentLevel)}`;
                    break;
                case "hierarchical_label":
                    result += `\n${serializeHierarchicalLabel(element.data, indentLevel)}`;
                    break;
                case "symbol":
                    result += `\n${serializeSchematicSymbol(element.data, indentLevel)}`;
                    break;
                case "polyline":
                    {
                        const polyline = element.data as S.I_Polyline;
                        const indent = indentString(indentLevel);
                        const indent2 = indentString(indentLevel + 1);
                        const indent3 = indentString(indentLevel + 2);
                        let polylineStr = `\n${indent}(polyline`;
                        polylineStr += `\n${indent2}(pts`;
                        polylineStr += `\n${indent3}`;
                        for (const pt of polyline.pts) {
                            polylineStr += `(xy ${formatDouble(pt.x)} ${formatDouble(pt.y)}) `;
                        }
                        polylineStr = polylineStr.trim();
                        polylineStr += `\n${indent2})`;
                        const strokeStr = serializeStroke(polyline.stroke, indentLevel + 1);
                        if (strokeStr) {
                            polylineStr += `\n${strokeStr}`;
                        }
                        const fillStr = serializeFill(polyline.fill, indentLevel + 1);
                        if (fillStr) {
                            polylineStr += `\n${fillStr}`;
                        }
                        if (polyline.uuid) polylineStr += `\n${indent2}(uuid "${escapeString(polyline.uuid)}")`;
                        polylineStr += `\n${indent})`;
                        result += polylineStr;
                    }
                    break;
                case "rectangle":
                    {
                        const rectangle = element.data as S.I_Rectangle;
                        let rectangleStr = `\n${indentString(indentLevel)}(rectangle (start ${formatDouble(rectangle.start.x)} ${formatDouble(rectangle.start.y)}) (end ${formatDouble(rectangle.end.x)} ${formatDouble(rectangle.end.y)})`;
                        rectangleStr += serializeStrokeInline(rectangle.stroke);
                        rectangleStr += serializeFillInline(rectangle.fill);
                        if (rectangle.uuid) rectangleStr += ` (uuid "${escapeString(rectangle.uuid)}")`;
                        rectangleStr += ")";
                        result += rectangleStr;
                    }
                    break;
                case "arc":
                    {
                        const arc = element.data as S.I_Arc;
                        let arcStr = `\n${indentString(indentLevel)}(arc (start ${formatDouble(arc.start.x)} ${formatDouble(arc.start.y)})`;
                        if (arc.mid) {
                            arcStr += ` (mid ${formatDouble(arc.mid.x)} ${formatDouble(arc.mid.y)})`;
                        }
                        arcStr += ` (end ${formatDouble(arc.end.x)} ${formatDouble(arc.end.y)})`;
                        if (arc.radius) {
                            arcStr += ` (radius (xy ${formatDouble(arc.radius.at.x)} ${formatDouble(arc.radius.at.y)}) (length ${formatDouble(arc.radius.length)}) (angles ${formatDouble(arc.radius.angles.x)} ${formatDouble(arc.radius.angles.y)})`;
                        }
                        arcStr += serializeStrokeInline(arc.stroke);
                        arcStr += serializeFillInline(arc.fill);
                        if (arc.uuid) arcStr += ` (uuid "${escapeString(arc.uuid)}")`;
                        arcStr += ")";
                        result += arcStr;
                    }
                    break;
                case "text":
                    {
                        const text = element.data as S.I_Text;
                        let textStr = `\n${indentString(indentLevel)}(text "${escapeString(text.text)}"`;
                        if (text.exclude_from_sim !== undefined) {
                            textStr += ` (exclude_from_sim ${text.exclude_from_sim ? "yes" : "no"})`;
                        }
                        textStr += ` ${serializeAt(text.at, 0, true)} ${serializeEffects(text.effects)}`;
                        if (text.uuid) textStr += ` (uuid "${escapeString(text.uuid)}")`;
                        textStr += ")";
                        result += textStr;
                    }
                    break;
                case "bezier":
                    {
                        const bezier = element.data as S.I_Bezier;
                        let bezierStr = `\n${indentString(indentLevel)}(bezier (pts`;
                        for (const pt of bezier.pts) {
                            bezierStr += ` (xy ${formatDouble(pt.x)} ${formatDouble(pt.y)})`;
                        }
                        bezierStr += ")";
                        bezierStr += serializeStrokeInline(bezier.stroke);
                        bezierStr += serializeFillInline(bezier.fill);
                        if (bezier.uuid) bezierStr += ` (uuid "${escapeString(bezier.uuid)}")`;
                        bezierStr += ")";
                        result += bezierStr;
                    }
                    break;
                case "text_box":
                    {
                        const textbox = element.data as S.I_TextBox;
                        let textboxStr = `\n${indentString(indentLevel)}(text_box "${escapeString(textbox.text)}" ${serializeAt(textbox.at, 0, true)} (size ${formatDouble(textbox.size.x)} ${formatDouble(textbox.size.y)})`;
                        if (textbox.exclude_from_sim) {
                            textboxStr += ` (exclude_from_sim ${textbox.exclude_from_sim ? "yes" : "no"})`;
                        }
                        if (textbox.margins) {
                            textboxStr += ` (margins ${formatDouble(textbox.margins.x)} ${formatDouble(textbox.margins.y)} ${formatDouble(textbox.margins.z)} ${formatDouble(textbox.margins.w)})`;
                        }
                        textboxStr += ` ${serializeEffects(textbox.effects)}`;
                        textboxStr += serializeStrokeInline(textbox.stroke);
                        textboxStr += serializeFillInline(textbox.fill);
                        if (textbox.uuid) textboxStr += ` (uuid "${escapeString(textbox.uuid)}")`;
                        textboxStr += ")";
                        result += textboxStr;
                    }
                    break;
                case "circle":
                    {
                        const circle = element.data as S.I_Circle;
                        let circleStr = `\n${indentString(indentLevel)}(circle (center ${formatDouble(circle.center.x)} ${formatDouble(circle.center.y)}) (radius ${formatDouble(circle.radius)})`;
                        circleStr += serializeStrokeInline(circle.stroke);
                        circleStr += serializeFillInline(circle.fill);
                        if (circle.uuid) circleStr += ` (uuid "${escapeString(circle.uuid)}")`;
                        circleStr += ")";
                        result += circleStr;
                    }
                    break;
                case "image":
                    {
                        const image = element.data;
                        const chunkSize = 76;
                        const chunks: string[] = [];
                        for (let i = 0; i < image.data.length; i += chunkSize) {
                            chunks.push(image.data.slice(i, i + chunkSize));
                        }
                        result += `\n${indentString(indentLevel)}(image`;
                        result += `\n${indentString(indentLevel + 1)}${serializeAt(image.at)}`;
                        result += `\n${indentString(indentLevel + 1)}(data ${chunks.join(" ")})`;
                        result += `\n${indentString(indentLevel + 1)}(scale ${formatDouble(image.scale)})`;
                        if (image.uuid) {
                            result += `\n${indentString(indentLevel + 1)}(uuid "${escapeString(image.uuid)}")`;
                        }
                        result += `\n${indentString(indentLevel)})`;
                    }
                    break;
                case "sheet":
                    result += `\n${serializeSchematicSheet(element.data, indentLevel)}`;
                    break;
            }
        }
    }
    if (schematic.sheet_instances && schematic.sheet_instances.length > 0) {
        result += `\n${indentString(indentLevel)}(sheet_instances`;
        for (const instance of schematic.sheet_instances) {
            result += `\n${indentString(indentLevel + 1)}(path "${escapeString(instance.path)}"`;
            if (instance.page)
                result += `\n${indentString(indentLevel + 2)}(page "${escapeString(instance.page)}")`;
            result += `\n${indentString(indentLevel + 1)})`;
        }
        result += `\n${indentString(indentLevel)})`;
    }

    if (schematic.embedded_fonts !== undefined) {
        result += `\n${indentString(indentLevel)}(embedded_fonts ${schematic.embedded_fonts ? "yes" : "no"})`;
    }

    if (schematic.symbol_instances && schematic.symbol_instances.length > 0) {
        result += `\n${indentString(indentLevel)}(symbol_instances`;
        for (const instance of schematic.symbol_instances) {
            result += `\n${indentString(indentLevel + 1)}(path "${escapeString(instance.path)}" (reference "${escapeString(instance.reference)}") (unit ${instance.unit}) (value "${escapeString(instance.value)}") (footprint "${escapeString(instance.footprint)}"))`;
        }
        result += `\n${indentString(indentLevel)})`;
    }

    result += '\n)\n';
    return result;
}

