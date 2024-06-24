# ECAD-Viewer

View your electronic designs interactively in the browser.

Live demo: https://www.eda.cn/ecad-viewer

Features:

-   Support for KiCad and Altium designs
-   Inspect all the components and their properties
-   Check the nets in the PCB and check the label references in the schematic
-   Generate 3D model from PCB
-   Generate BOM from schematic

![ECAD Viewer](docs/ecad-viewer-preview.gif)

## Quick start

```bash
git https://github.com/Huaqiu-Electronics/ecad-viewer.git
cd ecad-viewer
npm install
npm run serve
```

Open http://localhost:8080 to check the demo.

## Credits

This project contains copies or makes use of other works. These works and their respective license and terms are:

-   [kicanvas](https://github.com/theacodes/kicanvas) is under the [MIT license](https://github.com/theacodes/kicanvas/blob/main/LICENSE.md)
-   [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer) is under the [MIT license](https://github.com/donmccurdy/three-gltf-viewer/blob/main/LICENSE)
