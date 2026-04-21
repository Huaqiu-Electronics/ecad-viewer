import { expose } from "comlink";
import { BoardParser } from "kicad-parser/src/parser/board_parser";
import { SchematicParser } from "kicad-parser/src/parser/schematic_parser";

export class ParserWorker {
    parse_board(buf: ArrayBuffer) {
        const content = new TextDecoder().decode(buf);
        return new BoardParser().parse(content);
    }

    parse_schematic(buf: ArrayBuffer) {
        const content = new TextDecoder().decode(buf);
        return new SchematicParser().parse(content);
    }
}

expose(new ParserWorker());












