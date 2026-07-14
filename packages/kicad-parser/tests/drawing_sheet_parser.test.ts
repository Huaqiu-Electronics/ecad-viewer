import { parse_drawing_sheet } from "../src/drawing_sheet_parser";

describe("drawing sheet parser", () => {
    it("preserves primitive identity and joins embedded bitmap data", () => {
        const sheet = parse_drawing_sheet(`
            (kicad_wks
                (version 20231118)
                (generator "pl_editor")
                (setup (linewidth 0.15) (textsize 1.5 1.5))
                (line (start 0 0 ltcorner) (end 10 0 ltcorner))
                (rect (name "frame") (start 0 0) (end 10 10))
                (polygon (pos 2 2) (rotate 90)
                    (pts (xy 0 0) (xy 1 0) (xy 0 1))
                    (pts (xy 2 2) (xy 3 2) (xy 2 3)))
                (bitmap (pos 4 4) (data "abc" "def"))
                (tbtext "Title" (pos 5 5) (font bold))
            )
        `);

        expect(sheet.drawings.map((item) => item.kind)).toEqual([
            "line",
            "rect",
            "polygon",
            "bitmap",
            "tbtext",
        ]);
        const polygon = sheet.drawings.find((item) => item.kind === "polygon");
        expect(
            polygon && "contours" in polygon ? polygon.contours : [],
        ).toHaveLength(2);
        expect(sheet.drawings[3]).toMatchObject({
            kind: "bitmap",
            pngdata: "abcdef",
        });
    });
});
