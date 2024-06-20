import type { Color } from "./color";
import type { BBox } from "./math";

export interface HighlightAble {
    highlightColor: Color;

    highlighted: boolean;

    bbox: BBox;
}
