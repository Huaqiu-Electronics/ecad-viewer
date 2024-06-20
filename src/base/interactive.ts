import type { Vec2 } from "./math";

export interface Interactive {
    contains(pos: Vec2): boolean;
}
