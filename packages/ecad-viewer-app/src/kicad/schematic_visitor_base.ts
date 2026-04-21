import type { SchematicNode } from "./schematic";

export class SchematicVisitorBase {
    public visit(board_node: SchematicNode) {
        // @ts-expect-error 7053
        if (typeof this[`visit${board_node.constructor.name}`] === "function") {
            // @ts-expect-error 7053
            this[`visit${board_node.constructor.name}`](board_node);
        }
        // @ts-expect-error 7053

        if (typeof board_node["getChildren"] === "function")
            // @ts-expect-error 7053
            for (const c of board_node["getChildren"]()) this.visit(c);
    }
}
