/*
    原理图网络高亮：按网络名找出属于该网络的导线、标签与电源符号。

    查看器原本没有"按网络名高亮"的能力：doc.wires 只有几何点、不带 net 字段；
    标签索引的 key 是 uuid 而非网络名；PCB 侧的 highlight_net 也不适用于原理图。

    因此这里做确定性连通性追踪：
      1) 种子：同名标签（net / global / hierarchical）+ 同名电源符号
         （Reference 以 # 开头，Value 即网络名，引脚在符号原点）；
      2) 连通：并查集，导线端点落在另一段导线上（端点重合是特例）即合并；
      3) 取包含种子的连通分量。
*/

import { Color } from "../../base/color";
import { BBox, Vec2 } from "../../base/math";
import type {
    KicadSch,
    Label,
    SchematicSymbol,
    Wire,
} from "../../kicad/schematic";

/** 判定点是否落在线段上的容差（毫米） */
const EPSILON = 0.02;

/** 一段线段：起点与终点 */
type Segment = [Vec2, Vec2];

/**
 * 网络高亮的视觉参数。
 *
 * 只描边目标网络、**不调暗其余图层**，与 KiCad 自身的网络高亮行为一致：
 * 靠紫色（对齐 KiCad 内部网络高亮的默认色，与原理图的浅绿导线、白色文字都不撞色）
 * 加粗亮芯 + 柔晕把目标网络凸出来。
 * 别再改成调暗其余图层——那样整张图会暗到看不清周围器件。
 */
export const NET_HIGHLIGHT = {
    /** 亮芯颜色（紫），白底与黑底上都醒目 */
    color: new Color(0.76, 0.3, 1, 1),
    /** 外发光颜色：同色半透明，垫在亮芯下面 */
    glow: new Color(0.76, 0.3, 1, 0.22),
    /** 亮芯线宽（毫米），约为导线默认线宽 0.1524 的 4.6 倍 */
    width: 0.7,
    /** 外发光线宽（毫米），柔晕垫底 */
    glow_width: 2.4,
} as const;

/** 一条网络的追踪结果：属于它的导线、接入点，以及同名的标签与电源符号 */
export interface NetHighlightTrace {
    wires: Wire[];
    /** 接入点坐标，既是连通性追踪的起点，也是亮斑的落点 */
    points: Vec2[];
    labels: Label[];
    power_symbols: SchematicSymbol[];
}

export interface NetHighlightResult {
    ok: boolean;
    /** 失败原因，成功时为空 */
    reason?: string;
    /** 追踪到的导线数量 */
    wires?: number;
    /** 命中的标签数量 */
    labels?: number;
    /** 命中的电源符号数量 */
    power_symbols?: number;
}

/** 一组导线的外接框，用于把相机收到高亮范围 */
export function net_bbox(wires: Wire[]): BBox {
    let min_x = Infinity;
    let min_y = Infinity;
    let max_x = -Infinity;
    let max_y = -Infinity;

    for (const wire of wires) {
        for (const point of wire.pts) {
            min_x = Math.min(min_x, point.x);
            min_y = Math.min(min_y, point.y);
            max_x = Math.max(max_x, point.x);
            max_y = Math.max(max_y, point.y);
        }
    }

    return new BBox(min_x, min_y, max_x - min_x, max_y - min_y);
}

/** 网络名归一化：去首尾空白、去前导斜杠、统一大写 */
function normalize_name(value: string | undefined): string {
    return String(value ?? "")
        .trim()
        .replace(/^\/+/, "")
        .toUpperCase();
}

/**
 * 点是否落在线段上（含两端点）。
 *
 * 叉积绝对值等于"线段长 × 垂直距离"，必须先除以长度归一化成垂直距离再比较，
 * 否则容差会随导线变长而收紧，与端点判定用的 0.02mm 对不上。
 */
function point_on_segment(p: Vec2, [a, b]: Segment): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);

    if (!length) {
        return Math.hypot(p.x - a.x, p.y - a.y) <= EPSILON;
    }

    const cross = dx * (p.y - a.y) - dy * (p.x - a.x);

    if (Math.abs(cross) / length > EPSILON) {
        return false;
    }

    // 投影需落在线段范围内（沿线方向同样留 EPSILON 容差）
    const dot = (p.x - a.x) * dx + (p.y - a.y) * dy;

    return dot >= -EPSILON && dot <= length * length + EPSILON;
}

function symbol_property(
    symbol: SchematicSymbol,
    name: string,
): string | undefined {
    return symbol.properties.get(name)?.text;
}

/** [所属导线下标, 线段] */
type WireSegment = [wire: number, segment: Segment];

/** [所属导线下标, 端点] */
type WireEnd = [wire: number, point: Vec2];

/**
 * 把导线的点串摊平成线段表与端点表。
 *
 * 摊平后两趟遍历都直接解构元组，不用按下标取数组，也就省掉了
 * noUncheckedIndexedAccess 强制的层层空判断；缺端点的异常导线在此跳过。
 */
function flatten(wires: Wire[]): {
    segments: WireSegment[];
    ends: WireEnd[];
} {
    const segments: WireSegment[] = [];
    const ends: WireEnd[] = [];

    for (const [index, wire] of wires.entries()) {
        for (let k = 0; k + 1 < wire.pts.length; k += 1) {
            const start = wire.pts[k];
            const end = wire.pts[k + 1];

            if (start && end) {
                segments.push([index, [start, end]]);
            }
        }

        for (const point of [wire.pts[0], wire.pts[wire.pts.length - 1]]) {
            if (point) {
                ends.push([index, point]);
            }
        }
    }

    return { segments, ends };
}

/**
 * 找出与任一网络名同名的标签和电源符号，作为连通性追踪的起点。
 *
 * 多个网络名合并成一次扫描，同一网络的导线因此不会被重复收集。
 */
export function find_net(doc: KicadSch, names: string[]): NetHighlightTrace {
    const targets = new Set(names.map(normalize_name));

    const labels: Label[] = [
        ...(doc.net_labels ?? []),
        ...(doc.global_labels ?? []),
        ...(doc.hierarchical_labels ?? []),
    ].filter((label) => targets.has(normalize_name(label.text)));

    const power_symbols: SchematicSymbol[] = [];

    for (const symbol of doc.symbols.values()) {
        if (!(symbol_property(symbol, "Reference") ?? "").startsWith("#")) {
            continue;
        }

        if (targets.has(normalize_name(symbol_property(symbol, "Value")))) {
            power_symbols.push(symbol);
        }
    }

    const points: Vec2[] = [
        ...labels.map((label) => label.at.position),
        ...power_symbols.map((symbol) => symbol.at.position),
    ];

    return {
        wires: trace(doc.wires ?? [], points),
        points,
        labels,
        power_symbols,
    };
}

/**
 * 从种子出发做连通性追踪，返回属于该网络的导线。
 *
 * 两根导线只要"其中一根的端点落在另一根上"就算连通。端点重合是这一判定的
 * 特例——重合点必然落在对方线段上——因此不必再单独跑一遍端点两两比对。
 */
function trace(wires: Wire[], seeds: Vec2[]): Wire[] {
    if (!wires.length || !seeds.length) {
        return [];
    }

    const parent = wires.map((_, index) => index);

    const find = (index: number): number => {
        const parent_index = parent[index];

        if (parent_index === undefined || parent_index === index) {
            return index;
        }

        return (parent[index] = find(parent_index));
    };

    const union = (a: number, b: number) => {
        const root_a = find(a);
        const root_b = find(b);

        if (root_a !== root_b) {
            parent[root_b] = root_a;
        }
    };

    const { segments, ends } = flatten(wires);

    // 连通性：a 的端点落在 b 的任一段上 → 合并（同一根导线的自比对跳过）
    for (const [i, point] of ends) {
        for (const [j, segment] of segments) {
            if (i !== j && point_on_segment(point, segment)) {
                union(i, j);
            }
        }
    }

    // 种子落在哪段导线上，就取那个连通分量
    const roots = new Set<number>();

    for (const [i, segment] of segments) {
        for (const seed of seeds) {
            if (point_on_segment(seed, segment)) {
                roots.add(find(i));
            }
        }
    }

    return wires.filter((_, index) => roots.has(find(index)));
}
