import type { BomItem } from "./bom_item";
import type { SchematicSymbol } from "./schematic";
import { SchematicVisitorBase } from "./schematic_visitor_base";

export class SchematicBomVisitor extends SchematicVisitorBase {
    #bom_list: BomItem[] = [];
    #designator_refs = new Map<string, string>();

    public constructor() {
        super();
    }

    get bom_list() {
        return this.#bom_list;
    }

    get designator_refs() {
        return this.#designator_refs;
    }
    visitSchematicSymbol(node: SchematicSymbol) {
        if (
            node.footprint.length == 0 ||
            !node.in_bom ||
            (node.unit && node.unit != 1) // Check if the symbol has multiple parts , count only the part 1
        )
            return;

        const schematicSymbol: BomItem = {
            Reference: "",
            Name: node.value,
            Description: node.description,
            Datasheet: node.datasheet,
            Footprint: node.footprint,
            DNP: node.dnp,
            Qty: 1,
            Price: 0,
        };

        for (const [, ins] of node.instances) {
            const Reference = ins.reference ?? schematicSymbol.Reference;
            this.#bom_list.push({
                ...schematicSymbol,
                Reference,
                Name: ins.value ?? schematicSymbol.Name,
                Footprint: ins.footprint ?? schematicSymbol.Footprint,
            });
            this.#designator_refs.set(Reference, node.uuid);
        }
    }
}
