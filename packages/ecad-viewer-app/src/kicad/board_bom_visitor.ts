import { Footprint } from "./board";
import { BoardVisitorBase } from "./board_visitor_base";
import type { BomItem } from "./bom_item";

export interface DesignatorRef {
    uuid: string;
    sheet_name: string;
    unit?: number;
}

export interface DesignatorRefs {
    refs: DesignatorRef[];
}

export class BoardBomItemVisitor extends BoardVisitorBase {
    #bom_list: BomItem[] = [];

    #designator_refs = new Map<string, DesignatorRef[]>();

    get bom_list() {
        return this.#bom_list;
    }

    get designator_refs() {
        return this.#designator_refs;
    }

    protected override visitFootprint(node: Footprint) {
        const schematicSymbol: BomItem = {
            Reference: node.Reference,
            Name: node.Value,
            Description: node.Description,
            Datasheet: node.Datasheet,
            Footprint: node.Footprint,
            DNP: false,
            Qty: 1,
            Price: 0,
        };

        this.#bom_list.push(schematicSymbol);
        const existing_refs = this.designator_refs.get(node.Reference) ?? [];
        existing_refs.push({
            uuid: node.uuid,
            sheet_name: "not_available",
        });
        this.designator_refs.set(node.Reference, existing_refs);
        return true;
    }
}
