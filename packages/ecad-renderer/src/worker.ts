/**
 * Worker protocol surface. The current viewer's worker is parser-only; rendering
 * remains on the existing Canvas/WebGL pipeline until an OffscreenCanvas backend
 * is enabled by the host. Keeping this protocol public avoids a second protocol.
 */
export type RendererRequest =
    | { id: string; type: "symbol" | "footprint" | "schematic" | "pcb"; model: unknown };
export type RendererResponse =
    | { id: string; ok: true; result: unknown }
    | { id: string; ok: false; error: string };

export function createRendererWorker(url = new URL("./renderer.worker.js", import.meta.url)): Worker {
    return new Worker(url, { type: "module" });
}

export function createRendererClient(worker: Worker) {
    return {
        render(request: RendererRequest): Promise<RendererResponse> {
            return new Promise((resolve, reject) => {
                const listener = (event: MessageEvent<RendererResponse>) => {
                    if (event.data.id !== request.id) return;
                    worker.removeEventListener("message", listener);
                    resolve(event.data);
                };
                worker.addEventListener("message", listener);
                worker.addEventListener("error", () => reject(new Error("Renderer worker failed")), { once: true });
                worker.postMessage(request);
            });
        },
        dispose: () => worker.terminate(),
    };
}
