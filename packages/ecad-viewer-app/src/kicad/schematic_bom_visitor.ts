import type { DesignatorRef } from "./board_bom_visitor";
import type { BomItem } from "./bom_item";
import type { KicadSch, SchematicSymbol } from "./schematic";
import { SchematicVisitorBase } from "./schematic_visitor_base";

export class SchematicBomVisitor extends SchematicVisitorBase {
    #bom_list: BomItem[] = [];
    #designator_refs = new Map<string, DesignatorRef[]>();
    #current_sch_file: string;
    #existing_designators = new Set<string>();

    public constructor() {
        super();
    }

    get bom_list() {
        return this.#bom_list;
    }

    get designator_refs() {
        return this.#designator_refs;
    }

    visitKicadSch(sheet: KicadSch) {
        this.#current_sch_file = sheet.filename;
    }

    visitSchematicSymbol(node: SchematicSymbol) {
        if (
            node.footprint.length == 0 ||
            !node.in_bom
        )
            return;

        const schematicSymbol: BomItem = {
            Reference: "",
            Name: node.value,
            Description: node.get_property_text("Description") ?? "",
            Datasheet: node.datasheet,
            Footprint: node.footprint,
            DNP: node.dnp,
            Qty: 1,
            Price: 0,
        };

        const Reference = node.reference;

        if (Reference.endsWith("?"))
            return;

        if (!this.#existing_designators.has(Reference)) {
            this.#existing_designators.add(Reference);

            this.#bom_list.push({
                ...schematicSymbol,
                Reference,
                Name: node.value ?? schematicSymbol.Name,
                Footprint: node.footprint ?? schematicSymbol.Footprint,
            });
        }

        const existing_refs = this.#designator_refs.get(Reference) ?? [];
        existing_refs.push({
            uuid: node.uuid,
            sheet_name: this.#current_sch_file,
            unit: node.unit,
        });
        this.#designator_refs.set(Reference, existing_refs);
    }
}
