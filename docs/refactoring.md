# Task: Extract ECAD-Viewer Rendering Pipeline into `@huaqiu/ecad-renderer`

## 1. Objective

Refactor the existing `Huaqiu-Electronics/ecad-viewer` repository so that its existing rendering implementation can be consumed independently by DSH.

Create exactly one new npm package:

```text
@huaqiu/ecad-renderer
```

Do NOT create a new parser package or a new EDA/POD model package.

The repository already publishes:

```text
@huaqiu/kicad-sexpr-parser
```

which contains:

```text
KiCad S-expression parser
POD design models
```

Those existing POD models are the input contract for the new renderer.

The target architecture is:

```text
@huaqiu/kicad-sexpr-parser
          │
          │ existing POD models
          ▼
@huaqiu/ecad-renderer
          │
          ├── worker rendering
          ├── symbol rendering
          ├── footprint rendering
          ├── schematic rendering
          └── PCB rendering
                    │
             ┌──────┴──────┐
             ▼             ▼
       ECAD Viewer        DSH
```

The key requirement is:

> **Reuse the existing ECAD-Viewer rendering pipeline. Do not introduce a second rendering implementation or a second POD/model layer.**

---

# 2. First inspect the existing implementation

Before modifying code, inspect the current repository and document the actual rendering pipeline.

Identify:

```text
1. parser package dependency
2. POD model definitions
3. schematic renderer
4. PCB renderer
5. symbol rendering path
6. footprint rendering path
7. Web Worker entrypoint
8. worker request/response protocol
9. canvas/WebGL rendering implementation
10. viewport/camera implementation
11. CJK font loading
12. current bundler
13. package/workspace configuration
14. existing build scripts
15. existing CI workflows
```

Pay particular attention to the existing boundary:

```text
POD model
    ↓
Web Worker
    ↓
renderer
    ↓
canvas / WebGL
```

Do not redesign this boundary unless necessary.

The goal is to expose it as a reusable package.

---

# 3. Do NOT introduce another model

The new renderer MUST consume the existing models from:

```text
@huaqiu/kicad-sexpr-parser
```

Do not introduce:

```text
EdaModel
SceneModel
RenderModel
EdaDocument
```

or equivalent duplicate abstractions.

If the existing POD types already represent:

```text
symbol
footprint
schematic
PCB
pad
pin
track
wire
text
layer
geometry
```

use those types directly.

The dependency should be:

```text
@huaqiu/ecad-renderer
        ↓
@huaqiu/kicad-sexpr-parser
```

The renderer may import the existing POD types as TypeScript types and/or runtime values where required.

---

# 4. Create `@huaqiu/ecad-renderer`

Add a new package:

```text
@huaqiu/ecad-renderer
```

The package should contain the reusable rendering implementation extracted from the existing viewer.

It should NOT contain:

```text
viewer application UI
toolbar
property panels
file browser
routing
application bootstrap
ECAD Viewer demo application
```

It should contain only the reusable rendering/runtime pieces.

---

# 5. Preserve the existing renderer

The implementation MUST reuse the current ECAD-Viewer rendering code.

Do not rewrite:

```text
symbol drawing
footprint drawing
PCB drawing
schematic drawing
geometry rendering
text rendering
layer rendering
camera/viewport
```

unless the existing code cannot be reused directly.

The desired refactor is:

```text
BEFORE

ECAD Viewer
    └── renderer implementation


AFTER

@huaqiu/ecad-renderer
    └── renderer implementation

ECAD Viewer
    └── depends on @huaqiu/ecad-renderer
```

This makes the existing ECAD Viewer the first consumer of the new package.

---

# 6. Preserve the Web Worker architecture

The existing viewer already has a Web Worker-ready rendering architecture.

Keep it.

The new package should expose the existing worker functionality in a reusable form.

Conceptually:

```text
main thread
    │
    ▼
@huaqiu/ecad-renderer
    │
    ▼
Web Worker
    │
    ▼
existing renderer
```

Do not move all rendering back to the main thread merely to simplify packaging.

The worker should remain the default path for expensive rendering.

---

# 7. Define a public renderer API

Expose a small public API.

The exact names should follow the existing implementation where possible.

At minimum support:

```ts
renderSymbol(...)
renderFootprint(...)
renderSchematic(...)
renderPcb(...)
```

The APIs must accept the existing POD models.

Conceptually:

```ts
import type {
  Symbol,
  Footprint,
  Schematic,
  Pcb,
} from "@huaqiu/kicad-sexpr-parser";

import {
  renderSymbol,
  renderFootprint,
  renderSchematic,
  renderPcb,
} from "@huaqiu/ecad-renderer";
```

Do not invent new model types merely to make the API look cleaner.

---

# 8. Symbol rendering

This is a primary DSH requirement.

Provide a direct rendering entrypoint for an individual symbol POD model.

Conceptually:

```ts
const result = await renderSymbol(symbol, options);
```

It must NOT require:

```text
complete .kicad_sch
complete schematic
full ECAD Viewer application
HTTP server
```

The symbol must be rendered using the existing symbol rendering implementation.

The implementation may use the existing worker internally.

---

# 9. Footprint rendering

Provide a direct rendering entrypoint for an individual footprint POD model.

Conceptually:

```ts
const result = await renderFootprint(footprint, options);
```

It must NOT require:

```text
complete .kicad_pcb
complete PCB document
full ECAD Viewer application
HTTP server
```

Reuse the existing footprint/PCB rendering code.

---

# 10. Schematic rendering

Expose the existing schematic renderer through the package.

It must support the existing schematic POD model.

Preserve existing:

```text
zoom
pan
layers
symbols
pins
wires
buses
labels
sheets
selection
highlighting
```

where these are already implemented by the current viewer.

The existing ECAD Viewer must consume the same implementation after extraction.

---

# 11. PCB rendering

Expose the existing PCB renderer through the package.

It must support the existing PCB POD model.

Preserve:

```text
layers
footprints
pads
tracks
vias
zones
text
graphics
selection
highlighting
zoom
pan
```

where currently supported.

Again, the existing ECAD Viewer must use this same implementation.

---

# 12. Rendering output

First determine what the existing renderer already produces.

Prefer reusing the existing output mechanism.

If it already supports:

```text
Canvas
OffscreenCanvas
ImageBitmap
WebGL
```

reuse that mechanism.

Do NOT introduce SVG merely because it is convenient unless there is a concrete requirement.

For DSH static rendering, an acceptable initial output is:

```text
ImageBitmap
Blob
PNG
Canvas
```

depending on the existing implementation.

The first priority is:

> identical rendering between ECAD Viewer and DSH.

Not:

> introduce a new graphics backend.

---

# 13. Separate application UI from renderer

Move only the minimum required code.

The renderer package must not import modules that require:

```text
DOM application shell
ECAD Viewer application state
router
property panel
toolbar
file picker
demo page
```

If a current renderer module imports such functionality, refactor that dependency boundary.

The goal is:

```text
@huaqiu/ecad-renderer
    ↓
browser rendering primitives
    ↓
POD models
```

rather than:

```text
renderer
    ↓
ECAD Viewer application
```

---

# 14. Public worker API

If the current worker protocol already has a request/response structure, preserve it.

Extract it into the package.

Conceptually:

```ts
createRendererWorker()
createRendererClient()
```

or equivalent names based on the actual implementation.

The worker API should support at least:

```text
symbol
footprint
schematic
pcb
```

Do not create a second worker protocol if the existing protocol can be generalized.

---

# 15. Worker input should be POD models

The critical new capability is allowing the worker/render pipeline to receive an already parsed POD model.

For example:

```text
DSH
 │
 │ Symbol POD
 ▼
renderer client
 │
 ▼
worker
 │
 ▼
existing symbol renderer
```

Likewise:

```text
DSH
 │
 │ Footprint POD
 ▼
renderer client
 │
 ▼
worker
 │
 ▼
existing footprint renderer
```

This avoids reparsing data.

---

# 16. Fonts

The current ECAD Viewer dynamically loads CJK fonts.

The new npm package must make CJK font rendering self-contained.

Do not require a remote CDN or external font URL.

Investigate the existing font-loading implementation first.

Then modify it so that the renderer can resolve its fonts from the npm package.

Possible implementation:

```text
@huaqiu/ecad-renderer
    dist/
      index.js
      worker.js
      assets/
        fonts/
```

or package the font assets as part of the renderer distribution.

Do not create a separate npm package for fonts unless the existing dependency graph makes this unavoidable.

The requirement is:

```text
npm install @huaqiu/ecad-renderer
        ↓
renderer
        ↓
local CJK fonts
```

No network request.

---

# 17. Font loading inside Web Workers

Because rendering may occur in a Web Worker, explicitly verify how fonts are made available to the worker.

Do not assume a normal document-level:

```css
@font-face
```

is sufficient.

Use the browser APIs and rendering strategy already compatible with the current implementation.

The acceptance criterion is:

```text
offline browser
+
Web Worker rendering
+
Chinese/Japanese/Korean text
=
correct rendering
```

---

# 18. Package exports

Expose a simple public API from:

```text
@huaqiu/ecad-renderer
```

Prefer subpath exports if they reduce bundle size:

```text
@huaqiu/ecad-renderer
@huaqiu/ecad-renderer/symbol
@huaqiu/ecad-renderer/footprint
@huaqiu/ecad-renderer/schematic
@huaqiu/ecad-renderer/pcb
@huaqiu/ecad-renderer/worker
```

Only add subpath exports where they correspond to real independently usable modules.

Do not create artificial wrappers solely for package structure.

---

# 19. Tree shaking

Verify that importing:

```ts
import { renderSymbol } from "@huaqiu/ecad-renderer/symbol";
```

does not unnecessarily include:

```text
full ECAD Viewer UI
PCB-only code
unrelated demo code
```

Likewise for footprint rendering.

Use the existing bundler where possible.

---

# 20. Existing ECAD Viewer migration

After extracting the renderer:

```text
ECAD Viewer
    ↓
@huaqiu/ecad-renderer
    ↓
existing renderer
```

The viewer must stop maintaining a private duplicate implementation.

Run the existing application and verify that rendering remains unchanged.

This is a critical regression test.

---

# 21. DSH integration proof

Add a minimal integration test/example that uses the package exactly as an external DSH plugin would.

The test should start with an existing POD model:

```ts
const symbol: ExistingSymbolPod = ...;
```

and call:

```ts
await renderSymbol(symbol);
```

without:

```text
ECAD Viewer application
HTTP server
full schematic
full PCB
```

Repeat for:

```text
footprint
schematic
PCB
```

This is the proof that the extraction actually works.

---

# 22. npm package configuration

Add package metadata:

```json
{
  "name": "@huaqiu/ecad-renderer",
  "version": "...",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

Adapt this to the repository's existing package/module conventions.

The package must publish:

```text
JavaScript
TypeScript declarations
worker assets
font assets
required runtime assets
```

Do not publish development/demo files.

---

# 23. Package build

The package build must produce a distributable artifact that works outside the monorepo.

Do not rely on workspace path aliases at runtime.

Test using:

```bash
npm pack
```

or equivalent.

Create a clean temporary consumer project and install the generated `.tgz`.

Verify:

```ts
import { renderSymbol } from "@huaqiu/ecad-renderer";
```

works.

This test is mandatory because workspace resolution can hide packaging errors.

---

# 24. CI

Add or update GitHub Actions.

CI should perform:

```text
checkout
↓
setup Node
↓
enable pnpm
↓
install --frozen-lockfile
↓
lint
↓
typecheck
↓
tests
↓
build
↓
npm pack
↓
external-consumer smoke test
```

Do not publish on every branch push.

---

# 25. npm publishing

Configure an explicit release workflow.

Preferred:

```text
git tag vX.Y.Z
        ↓
GitHub Actions
        ↓
build/test
        ↓
npm publish
```

Use npm Trusted Publishing/OIDC if available for the organization.

Otherwise use a GitHub Actions secret such as:

```text
NPM_TOKEN
```

Never commit npm credentials.

---

# 26. Publishing only one package

Do not publish:

```text
@huaqiu/ecad-model
@huaqiu/ecad-fonts
@huaqiu/ecad-viewer-core
```

as part of this task.

Only publish:

```text
@huaqiu/ecad-renderer
```

The existing:

```text
@huaqiu/kicad-sexpr-parser
```

remains the source of:

```text
parser
POD models
```

This keeps the dependency graph simple:

```text
@huaqiu/ecad-renderer
        ↓
@huaqiu/kicad-sexpr-parser
```

---

# 27. Versioning

Use the existing repository release/versioning convention if one exists.

The renderer package version should be independently publishable if the repository architecture permits it.

Do not introduce a large release-management framework merely for this package.

If the repository is already using a workspace versioning tool, integrate with it.

Otherwise use the simplest reliable npm version/tag workflow.

---

# 28. Tests

Add tests specifically for the new public package.

## Symbol

```text
POD symbol
→ renderer
→ valid output
```

## Footprint

```text
POD footprint
→ renderer
→ valid output
```

## Schematic

```text
POD schematic
→ renderer
→ valid output
```

## PCB

```text
POD PCB
→ renderer
→ valid output
```

## Worker

```text
main thread
→ worker
→ render request
→ render result
```

## CJK

```text
Chinese/Japanese/Korean text
→ worker renderer
→ correct output
```

## Package

```text
npm pack
→ clean project
→ npm install
→ import renderer
→ render successfully
```

---

# 29. Regression test against existing viewer

The existing ECAD Viewer must still:

```text
load schematic
render schematic
load PCB
render PCB
select objects
highlight objects
zoom/pan
```

as before.

Where feasible, use image/snapshot comparisons for representative schematic and PCB designs.

The goal is to detect accidental renderer changes caused by extraction.

---

# 30. Performance requirements

Measure at least:

```text
symbol render startup
footprint render startup
schematic render startup
PCB render startup
worker startup
CJK font initialization
```

Pay particular attention to DSH.

A symbol rendering request should NOT initialize the entire ECAD Viewer application.

Similarly, importing the renderer should not eagerly initialize unnecessary viewers.

Prefer lazy initialization:

```text
import package
    ↓
no worker yet

renderSymbol()
    ↓
initialize worker if required
```

where compatible with the existing architecture.

---

# 31. Do not duplicate parsing

This is explicitly prohibited.

Do NOT implement:

```text
DSH
 ↓
new symbol parser
 ↓
new symbol model
 ↓
renderer
```

The intended path is:

```text
@huaqiu/kicad-sexpr-parser
        ↓
existing POD model
        ↓
@huaqiu/ecad-renderer
```

If DSH already has a POD model, bypass parsing entirely.

---

# 32. Do not introduce a new rendering backend

Do NOT initially implement:

```text
new SVG renderer
new Canvas renderer
new WebGL renderer
```

The existing ECAD-Viewer renderer is the source of truth.

Only add an output adapter if the existing renderer's output cannot be consumed by DSH.

The first goal is:

> reuse the exact existing rendering implementation.

---

# 33. Recommended implementation order

Implement in this order:

### Step 1

Map the actual current source dependency graph.

### Step 2

Identify the smallest set of renderer modules that can be extracted.

### Step 3

Create:

```text
@huaqiu/ecad-renderer
```

inside the existing workspace.

### Step 4

Move/extract the existing renderer and worker modules.

### Step 5

Make the existing ECAD Viewer consume the package.

### Step 6

Expose symbol and footprint as direct renderer entrypoints.

### Step 7

Expose schematic and PCB rendering.

### Step 8

Make CJK fonts local/package-relative.

### Step 9

Add external npm-package smoke tests.

### Step 10

Add GitHub Actions publishing.

### Step 11

Integrate the package into a DSH prototype.

---

# 34. Final architecture

The final dependency graph should be approximately:

```text
                 @huaqiu/kicad-sexpr-parser
                    │
                    │ POD models
                    ▼
              @huaqiu/ecad-renderer
                    │
          ┌─────────┼─────────┐
          │         │         │
       Symbol    Footprint  Document
       renderer   renderer   renderer
                              │
                         ┌────┴────┐
                         ▼         ▼
                     Schematic    PCB
                    renderer    renderer
                         │         │
                         └────┬────┘
                              ▼
                         Web Worker
```

Consumers:

```text
                 @huaqiu/ecad-renderer
                    │
              ┌─────┴─────┐
              ▼           ▼
        ECAD Viewer       DSH
```

The existing parser remains untouched as the parser/model source of truth.

---

# 35. Definition of Done

The implementation is complete when:

- [ ] `@huaqiu/ecad-renderer` exists as the only new package.
- [ ] It depends on the existing `@huaqiu/kicad-sexpr-parser`.
- [ ] No duplicate POD/model layer has been introduced.
- [ ] Existing renderer implementation has been extracted/reused.
- [ ] Existing Web Worker rendering architecture remains intact.
- [ ] Individual symbol POD models can be rendered directly.
- [ ] Individual footprint POD models can be rendered directly.
- [ ] Schematic POD models can be rendered.
- [ ] PCB POD models can be rendered.
- [ ] Existing ECAD Viewer uses the extracted renderer.
- [ ] CJK fonts work offline.
- [ ] CJK font assets are included in the npm distribution.
- [ ] Symbol rendering does not initialize the full viewer application.
- [ ] Renderer imports are tree-shakeable where practical.
- [ ] `npm pack` produces a self-contained usable package.
- [ ] A clean external project can install and use the package.
- [ ] Worker rendering works from the published package.
- [ ] CI builds and tests the package.
- [ ] CI publishes the package on an explicit release/tag.
- [ ] npm credentials are handled securely.
- [ ] Existing ECAD Viewer functionality has no regression.

## Core principle

**Do not rebuild what ECAD-Viewer already has.**

The repository already has:

```text
parser → POD models → worker → renderer
```

The task is to turn the existing:

```text
worker → renderer
```

boundary into a reusable npm API and add the missing direct entrypoints:

```text
POD Symbol    → renderer
POD Footprint → renderer
```

while preserving:

```text
POD Schematic → renderer
POD PCB       → renderer
```

and keeping the existing ECAD Viewer as a consumer of the same rendering implementation.