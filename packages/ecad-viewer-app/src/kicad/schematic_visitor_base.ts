import type { SchematicNode } from "./schematic";

export interface SchematicVisitContext {
    sheet_path?: string;
}

export class SchematicVisitorBase {
    public visit(board_node: SchematicNode, ctx: SchematicVisitContext = {}) {
        // @ts-expect-error 7053
        if (typeof this[`visit${board_node.constructor.name}`] === "function") {
            // @ts-expect-error 7053
            this[`visit${board_node.constructor.name}`](board_node, ctx);
        }
        // @ts-expect-error 7053

        if (typeof board_node["getChildren"] === "function")
            // @ts-expect-error 7053
            for (const c of board_node["getChildren"]()) this.visit(c, ctx);
    }
}
