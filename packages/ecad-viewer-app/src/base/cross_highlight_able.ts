import type { HighlightAble } from "./highlightable";
import type { IndexAble } from "./index_able";

export interface CrossHightAble extends HighlightAble, IndexAble {
    cross_index: string;
}
