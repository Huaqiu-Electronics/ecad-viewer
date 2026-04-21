import {
    KicadPCB,
    LineSegment,
    ArcSegment,
    Via,
    Zone,
    ZoneKeepout,
    ZoneFill,
    Layer,
    Setup,
    PCBPlotParams,
    Stackup,
    StackupLayer,
    Net,
    Dimension,
    DimensionFormat,
    DimensionStyle,
    Footprint,
    GraphicItem,
    TextRenderCache,
    Text,
    Pad,
    PadDrill,
    type BoardNode,
} from "./board";

export class BoardVisitorBase {
    public visit(board_node: BoardNode) {
        // @ts-expect-error 7053
        if (typeof this[`visit${board_node.constructor.name}`] === "function") {
            // @ts-expect-error 7053
            if (!this[`visit${board_node.constructor.name}`](board_node))
                return false;
        }

        if (board_node.getChildren)
            for (const c of board_node.getChildren())
                if (!this.visit(c)) return false;

        return true;
    }

    protected visitKicadPCB(kicadPCB: KicadPCB) {
        return true;
    }
    protected visitLineSegment(lineSegment: LineSegment) {
        return true;
    }
    protected visitArcSegment(arcSegment: ArcSegment) {
        return true;
    }
    protected visitVia(via: Via) {
        return true;
    }
    protected visitZone(zone: Zone) {
        return true;
    }
    protected visitZoneKeepout(zoneKeepout: ZoneKeepout) {
        return true;
    }
    protected visitZoneFill(zoneFill: ZoneFill) {
        return true;
    }
    protected visitLayer(layer: Layer) {
        return true;
    }
    protected visitSetup(setup: Setup) {
        return true;
    }
    protected visitPCBPlotParams(pcbPlotParams: PCBPlotParams) {
        return true;
    }
    protected visitStackup(stackup: Stackup) {
        return true;
    }
    protected visitStackupLayer(stackupLayer: StackupLayer) {
        return true;
    }
    protected visitNet(net: Net) {
        return true;
    }
    protected visitDimension(dimension: Dimension) {
        return true;
    }
    protected visitDimensionFormat(dimensionFormat: DimensionFormat) {
        return true;
    }
    protected visitDimensionStyle(dimensionStyle: DimensionStyle) {
        return true;
    }
    protected visitFootprint(footprint: Footprint) {
        return true;
    }
    protected visitGraphicItem(graphicItem: GraphicItem) {
        return true;
    }
    protected visitTextRenderCache(textRenderCache: TextRenderCache) {
        return true;
    }
    protected visitText(text: Text) {
        return true;
    }
    protected visitPad(pad: Pad) {
        return true;
    }
    protected visitPadDrill(padDrill: PadDrill) {
        return true;
    }
}
