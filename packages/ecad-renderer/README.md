# @huaqiu/ecad-renderer

Browser rendering entrypoints for the PODs emitted by
`@huaqiu/kicad-sexpr-parser`. This package bundles the ECAD Viewer canvas,
WebGL, viewport, symbol, footprint, schematic, PCB, and stroke/CJK glyph
implementations. It does not parse KiCad files and does not define another
model layer.

```ts
import { renderSymbol, renderFootprint, renderSchematic, renderPcb } from "@huaqiu/ecad-renderer";

const result = await renderSymbol(symbolPod, { width: 320, height: 240 });
document.body.append(result.canvas);
```

All APIs accept the corresponding `boardProto` or `schematicProto` POD from
the parser package. Supplying `canvas` renders into an existing canvas;
otherwise a canvas is created. The generated CJK stroke glyph table is bundled
in JavaScript, so rendering has no font CDN or network dependency.
Standalone renders intentionally omit the KiCad drawing sheet and zoom-fit the
supplied symbol, footprint, schematic, or PCB geometry.

## Whole-project ZIP rendering

`renderProjectFromZip` renders a whole KiCad project from its ZIP — by URL,
`Response`, `Blob`, or raw bytes — without the host having to unpack it:

```ts
import { renderProjectFromZip } from "@huaqiu/ecad-renderer";

const result = await renderProjectFromZip("https://example.com/design.zip", {
    container: document.getElementById("stage"),
});
// result.canvas is already in the stage; result.viewer is the SchematicViewer.
```

It unpacks the ZIP the same way the ECAD Viewer app does (jszip) and renders the
**root schematic** — the sheet named after the `.kicad_pro` project file (e.g.
`AAA.kicad_pro` → `AAA.kicad_sch`), falling back to the first schematic, then to
the first `.kicad_pcb` when the project has no schematic. Pass `kind: "schematic"`
or `kind: "pcb"` to force a document kind.

`loadProjectZip(source)` is the DOM-free, environment-agnostic lower level —
it returns the unpacked `.kicad_sch` / `.kicad_pcb` sources and the detected
root schematic without touching a canvas, so it also runs in Node:

```ts
import { loadProjectZip } from "@huaqiu/ecad-renderer/project";

const { files, rootSchematic } = await loadProjectZip(zipUrl);
```

The current ECAD Viewer renderer is canvas/WebGL based. `createRendererWorker`
exports the stable request/response protocol and worker asset, while direct
render methods remain the compatible browser path until the upstream renderer
supports an `OffscreenCanvas` target.

## Mini integration example

`npm run example:mini` builds `examples/mini-integration/build`. Serve that
directory with any static-file server and open `index.html`. It parses and
renders the checked-in `LMV761MAX_NOPB.kicad_sym` and
`LMV761MAX_NOPB.kicad_mod` fixtures directly into canvases.
