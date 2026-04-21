/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listify, type List } from "./tokenizer";
import type { I_Color } from "./proto/common";
import { Logger } from "../base/log";

const log = new Logger("kicanvas:parser");

const is_string = (e: any): e is string => typeof e === "string";
const is_number = (e: any): e is number => typeof e === "number";

enum Kind {
    start,
    positional,
    pair,
    list,
    atom,
    item_list,
    expr,
}

type ListOrAtom = number | string | List;
type Obj = Record<string, any>;
type ItemFactory = (e: Parseable, ...args: any[]) => any;

type TypeProcessor = (obj: Obj, name: string, e: ListOrAtom) => any;
type PropertyDefinition = {
    name: string;
    kind: Kind;
    accepts?: string[];
    fn: TypeProcessor;
};

export const T = {
    any(obj: Obj, name: string, e: ListOrAtom): any {
        return e;
    },
    boolean(obj: Obj, name: string, e: ListOrAtom): boolean {
        switch (e) {
            case "false":
            case "no":
                return false;
            case "true":
            case "yes":
                return true;
            default:
                return e ? true : false;
        }
    },
    string(obj: Obj, name: string, e: ListOrAtom): string | undefined {
        if (is_string(e)) {
            return e;
        } else {
            return undefined;
        }
    },
    number(obj: Obj, name: string, e: ListOrAtom): number | undefined {
        if (is_number(e)) {
            return e;
        } else {
            return undefined;
        }
    },
    item(factory: ItemFactory, ...args: any[]): TypeProcessor {
        return (obj: Obj, name: string, e: ListOrAtom): any => {
            return factory(e as Parseable, ...args);
        };
    },
    object(start: any, ...defs: PropertyDefinition[]): TypeProcessor {
        return (obj: Obj, name: string, e: ListOrAtom) => {
            let existing = {};
            if (start !== null) {
                existing = obj[name] ?? start ?? {};
            }
            return {
                ...existing,
                ...parse_expr(e as List, P.start(name), ...defs),
            };
        };
    },
    vec2(obj: Obj, name: string, e: ListOrAtom): { x: number; y: number } {
        const el = e as number[];
        return { x: el[1], y: el[2] };
    },
    color(obj: Obj, name: string, e: ListOrAtom): I_Color {
        const el = e as [string, number, number, number, number?];
        return {
            r: el[1] / 255,
            g: el[2] / 255,
            b: el[3] / 255,
            a: el[4] ?? 1,
        };
    },
};

export const P = {
    start(name: string): PropertyDefinition {
        return {
            kind: Kind.start,
            name: name,
            fn: T.string,
        };
    },
    positional(
        name: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.positional,
            name: name,
            fn: typefn,
        };
    },
    pair(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.pair,
            name: name,
            accepts: [name],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                return typefn(obj, name, (e as any[])[1]);
            },
        };
    },
    list(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.list,
            name: name,
            accepts: [name],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                return (e as List[]).slice(1).map((n) => typefn(obj, name, n));
            },
        };
    },
    collection(
        name: string,
        accept: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const list = obj[name] ?? [];
                list.push(typefn(obj, name, e));
                return list;
            },
        };
    },
    mapped_collection(
        name: string,
        accept: string,
        keyfn: (obj: any) => string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const map = obj[name] ?? {}; // Use object map for POD, not Map class
                const val = typefn(obj, name, e);
                const key = keyfn(val);
                map[key] = val;
                return map;
            },
        };
    },
    dict(
        name: string,
        accept: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const el = e as [string, string, any];
                const rec = obj[name] ?? {};
                rec[el[1]] = typefn(obj, name, el[2]);
                return rec;
            },
        };
    },
    atom(name: string, values?: string[]): PropertyDefinition {
        let typefn: TypeProcessor;

        if (values) {
            typefn = T.string;
        } else {
            typefn = T.boolean;
            values = [name];
        }

        return {
            kind: Kind.atom,
            name: name,
            accepts: values,
            fn(obj: Obj, name: string, e: ListOrAtom) {
                if (Array.isArray(e) && e.length == 1) {
                    e = e[0]!;
                }
                return typefn(obj, name, e);
            },
        };
    },
    expr(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.expr,
            name: name,
            accepts: [name],
            fn: typefn,
        };
    },
    object(
        name: string,
        start: any,
        ...defs: PropertyDefinition[]
    ): PropertyDefinition {
        return P.expr(name, T.object(start, ...defs));
    },
    item(
        name: string,
        factory: ItemFactory,
        ...args: any[]
    ): PropertyDefinition {
        return P.expr(name, T.item(factory, ...args));
    },
    vec2(name: string) {
        return P.expr(name, T.vec2);
    },
    color(name = "color") {
        return P.expr(name, T.color);
    },
};

export type Parseable = string | List;

function as_array<T>(v: T | T[]): T[] {
    if (Array.isArray(v)) {
        return v;
    } else {
        return [v];
    }
}

export function parse_expr(expr: string | List, ...defs: PropertyDefinition[]) {
    if (is_string(expr)) {
        expr = listify(expr);
        if (expr.length == 1 && Array.isArray(expr[0])) {
            expr = expr[0];
        }
    }

    const defs_map = new Map();

    let start_def;
    let n = 0;

    for (const def of defs) {
        if (def.kind == Kind.start) {
            start_def = def;
        } else if (def.kind == Kind.positional) {
            defs_map.set(n, def);
            n++;
        } else {
            for (const a of def.accepts!) {
                defs_map.set(a, def);
            }
        }
    }

    if (start_def) {
        const acceptable_start_strings = as_array(start_def.name);
        const first = (expr as any).at(0) as string;

        if (!acceptable_start_strings.includes(first)) {
            throw new Error(
                `Expression must start with ${start_def.name} found ${first} in ${expr}`,
            );
        }

        expr = expr.slice(1);
    }

    const out: Record<string, any> = {};

    n = 0;
    for (const element of expr) {
        let def: PropertyDefinition | null = null;

        if (is_string(element)) {
            def = defs_map.get(element);
        }

        if (!def && (is_string(element) || is_number(element))) {
            def = defs_map.get(n);
            if (!def) {
                log.warn(
                    `no def for bare element ${element} at position ${n} in expression ${expr}`,
                );
                continue;
            }
            n++;
        }

        if (!def && Array.isArray(element)) {
            def = defs_map.get(element[0]);
        }

        if (!def) {
            log.warn(
                `No def found for element ${element} in expression ${expr}`,
            );
            continue;
        }

        const value = def.fn(out, def.name, element);
        out[def.name] = value;
    }

    return out;
}

export function parse_expr_partial(
    expr: string | List,
    ...defs: PropertyDefinition[]
) {
    return parse_expr(expr, ...defs); // Logic is essentially same with loop skip
}
