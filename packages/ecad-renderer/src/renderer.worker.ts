import type { RendererRequest, RendererResponse } from "./worker";

// This entrypoint intentionally owns the package protocol. Hosts that transfer
// an OffscreenCanvas can replace this adapter without changing their requests.
self.addEventListener("message", (event: MessageEvent<RendererRequest>) => {
    const response: RendererResponse = {
        id: event.data.id,
        ok: false,
        error: "This renderer build requires a browser canvas on the main thread. Pass a canvas to renderSymbol, renderFootprint, renderSchematic, or renderPcb.",
    };
    self.postMessage(response);
});
