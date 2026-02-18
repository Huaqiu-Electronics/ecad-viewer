
import type { I_Vec2, I_Color, I_Paper } from "./common";

export interface I_Setup {
    linewidth?: number;
    textsize?: I_Vec2;
    textlinewidth?: number;
    top_margin?: number;
    left_margin?: number;
    bottom_margin?: number;
    right_margin?: number;
}

export interface I_Coordinate {
    x?: number;
    y?: number;
    anchor?: "ltcorner" | "lbcorner" | "rbcorner" | "rtcorner";
}

export interface I_DrawingSheetItem {
    name?: string;
    comment?: string;
    option?: "page1only" | "notonpage1" | null;
    repeat?: number;
    incrx?: number;
    incry?: number;
    linewidth?: number;
}

export interface I_Line extends I_DrawingSheetItem {
    start: I_Coordinate;
    end: I_Coordinate;
}

export interface I_Rect extends I_DrawingSheetItem {
    start: I_Coordinate;
    end: I_Coordinate;
}

export interface I_Polygon extends I_DrawingSheetItem {
    rotate: number;
    pos: I_Coordinate;
    pts: I_Vec2[];
}

export interface I_Bitmap extends I_DrawingSheetItem {
    scale?: number;
    pos?: I_Coordinate;
    pngdata?: string;
}

export interface I_Font {
    color?: I_Color;
    face?: string;
    bold?: boolean;
    italic?: boolean;
    size?: I_Vec2;
    linewidth?: number;
}

export interface I_TbText extends I_DrawingSheetItem {
    text: string;
    incrlabel?: number;
    pos?: I_Coordinate;
    maxlen?: number;
    maxheight?: number;
    font?: I_Font;
    justify?: "center" | "left" | "right" | "top" | "bottom";
    rotate?: number;
}

export interface I_DrawingSheet {
    version: number;
    generator: string;
    setup: I_Setup;
    drawings: (I_Line | I_Rect | I_Polygon | I_Bitmap | I_TbText)[];
}
