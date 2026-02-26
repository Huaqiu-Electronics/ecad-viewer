import { expose } from "comlink";
import { BoardParser } from "../parser/board_parser";
import { SchematicParser } from "../parser/schematic_parser";

export class ParserWorker {
    parse_board(content: string) {
        return new BoardParser().parse(content);
    }

    parse_schematic(content: string) {
        return new SchematicParser().parse(content);
    }
}

expose(ParserWorker);
