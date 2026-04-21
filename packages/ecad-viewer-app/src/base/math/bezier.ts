import { Vec2 } from "./vec2";

/**
 * Represents a cubic Bezier curve.
 */
export class BezierCurve {
    controlPoints: Vec2[];

    /**
     * @param controlPoints Array of Vec2, typically 4 points for cubic Bezier.
     */
    constructor(controlPoints: Vec2[]) {
        if (controlPoints.length !== 4) {
            throw new Error(
                "BezierCurve requires exactly 4 control points (cubic Bezier).",
            );
        }
        this.controlPoints = controlPoints;
    }

    /**
     * Evaluate the Bezier curve at parameter t (0 <= t <= 1).
     */
    getPoint(t: number): Vec2 {
        const [p0, p1, p2, p3] = this.controlPoints;
        const u = 1 - t;
        // Cubic Bezier formula
        return p0!
            .mul(u * u * u)
            .add(p1!.mul(3 * u * u * t))
            .add(p2!.mul(3 * u * t * t))
            .add(p3!.mul(t * t * t));
    }

    /**
     * Returns an array of Vec2 points approximating the curve as a polyline.
     * @param segments Number of segments (default 32)
     */
    toPolyline(segments: number = 32): Vec2[] {
        const points: Vec2[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            points.push(this.getPoint(t));
        }
        return points;
    }
}
