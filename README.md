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

Open http://localhost:8080 to check the app.

## Setup kicad-ci-server for 3D model converting and AD designs support

## Usage

### Standalone

```html
<ecad-viewer cli_server_addr="http://localhost:8989/convert_ad_to_kicad">
    <ecad-source src="video/video.kicad_pcb"></ecad-source>
    <ecad-source src="video/video.kicad_sch"></ecad-source>
    <ecad-3d-source src="video/video.glb"></ecad-3d-source>
</ecad-viewer>
<script type="module" src="./ecad_viewer/ecad-viewer.js"></script>
<script>
    window.addEventListener("pcb:board_content:ready", function (event) {
        // URL of the API endpoint
        const convert_pcb_to_glb_url =
            "http://localhost:8989/convert_pcb_to_glb";
        fetch(convert_pcb_to_glb_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                pcb_content: event.detail,
            }),
        })
            .then((response) => {
                return response.json(); // Parse response JSON
            })
            .then((data) => {
                window.dispatchEvent(
                    new CustomEvent("3d:url:ready", { detail: url }),
                );
            });
    });
</script>
```

Explanation:

-   `cli_server_addr`: URL of the API endpoint for converting AD designs to KiCad
-   `ecad-source`: URL of the KiCad PCB or AD file
-   `ecad-3d-source`: URL of the 3D model
-   `convert_pcb_to_glb_url`: URL of the API endpoint for converting KiCad PCB to 3D model

Check out the [Standalone example](debug/index.html)

### Embedded

```html
<body>
    <ecad-viewer-embedded url="video/video.kicad_pcb"> </ecad-viewer-embedded>
    <ecad-viewer-embedded url="video/video.glb"> </ecad-viewer-embedded>
    <ecad-viewer-embedded
        url="video/video.kicad_sch;
      video/bus_pci.kicad_sch">
    </ecad-viewer-embedded>
    <ecad-viewer-embedded
        is-bom="true"
        url="video/video.kicad_sch;
      video/bus_pci.kicad_sch">
    </ecad-viewer-embedded>
</body>
<script type="module" src="./ecad_viewer/ecad-viewer.js"></script>
```

Check out the [Embedded example](debug/embedded.html)

## Credits

This project contains copies or makes use of other works. These works and their respective license and terms are:

-   [kicanvas](https://github.com/theacodes/kicanvas) is under the [MIT license](https://github.com/theacodes/kicanvas/blob/main/LICENSE.md)
-   [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer) is under the [MIT license](https://github.com/donmccurdy/three-gltf-viewer/blob/main/LICENSE)
