import type { BomItem } from "./bom_item";

export class ItemsGroupedByFpValueDNP implements BomItem {
    #references: string[] = [];

    public get Price() {
        return 0;
    }

    public get Qty() {
        return this.#references.length;
    }

    public get Reference() {
        return this.#references.filter((i) => i.length).join(",\n");
    }

    public addReference(ref: string) {
        this.#references.push(ref);
    }

    public constructor(
        public Name: string,
        public Datasheet: string,
        public Description: string,
        public Footprint: string,
        public DNP: boolean,
    ) {}
}
