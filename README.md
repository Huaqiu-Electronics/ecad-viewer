# ECAD-Viewer

<p>
    English |<a href="README_zh.md">中文<a/>
</p>

Interactive online electronic designs viewer based on [kicanvas](https://github.com/theacodes/kicanvas) .

Live demo: https://www.eda.cn/ecadViewer/

## Why another repository instead of contributing back to the original project?

We are open to introducing ready-made frameworks, unlike the original, which insists on being a dependency-free library.

While remaining a reusable component, ECAD-Viewer offers the following features out of the box, combining the most advanced and leading-edge technologies, some of which were not intended in the original:

- **General Features:**

    - In-depth secondary development based on KiCad to support the import of Altium designs and the generation of 3D models from `kicad_pcb`.
    - Support for loading projects from ZIP files.
    - Maintain support for the latest KiCad file formats.

- **PCB:**

    - Option to select and display properties of VIAs and ZONES.
    - Other areas become grayed out when selecting a net/component package.
    - Selection priority: Track -> Pad/Drill -> Footprint -> Zone. A pop-up menu is provided for selection when overlaps occur.
    - Interface to set the transparency of through-hole type pads.
    - Fab Layer displays component package text.
    - Single-click to select components, double-click to select nets.
    - Wires on the selected net are rendered according to the preset color of the copper layer they are on.
    - Display properties of wire width and color.

- **SCH:**

    - Inspection of symbol and sub-sheet properties.
    - Navigation between labels with the same name through clicking.
    - Addition of hierarchical_labels.
    - Fixes for SCH drawings converted from AD.
    - Schematic preview with the ability to switch schematics via preview images.
    - Jumping to a specific schematic, focusing, and selecting a specific symbol.
    - Display of properties for wires, buses, pins, symbols, and labels upon clicking.
    - Highlighting of wires, buses, pins, symbols, and labels on hover.

- **3D:**

    - Integration with kicad-cli-docker for generating 3D models from PCB, with priority given to using package 3D models in the project's root directory.
    - Use of gltfpack for model compression to save bandwidth and improve rendering efficiency.
    - Integration of Three.js for displaying 3D models.

- **BOM:**

    - Generation of a Bill of Materials (BOM) from the schematic.
    - Extraction of BOM from the schematic.
    - Priority given to extracting BOM from the schematic; if no schematic is available, extract from the PCB.

- **Bug Fixes During Development and Feedback:**

    - Incorrect pin positions in SCH sheets.
    - Parsing of ALTIUM_VALUE attributes in SCH drawings converted from AD.
    - Disorder of package information in PCB designs imported from AD.
    - Even with minimum pad transparency, the color only lightens and does not completely disappear.
    - Introduction of a toggle for highlighting wires on hover.
    - Disarray in the positioning and angle of component package text in PCB.
    - Non-display of pads when the layer they are on is hidden.

![ECAD Viewer](docs/ecad-viewer-preview.gif)

## Quick start

We have prepared a full version (all kicad official 3D models are included, so the image size is much larger) and a streamlined version of the docker image for you to try. You can download the docker image from the following command.

```bash
# Uncomment the below line to pull the full version
# docker pull ghcr.io/huaqiu-electronics/ecad-viewer:full
# The lite version
docker pull ghcr.io/huaqiu-electronics/ecad-viewer:lite

```

Then start the container:

```bash

# Uncomment the below line to run the full version in case you pulled the full version
# docker run --rm -p 7676:7676 -p 8989:8989 -p 8012:8012 ghcr.io/huaqiu-electronics/ecad-viewer:full
# Run the lite version
docker run --rm -p 7676:7676 -p 8989:8989 -p 8012:8012 ghcr.io/huaqiu-electronics/ecad-viewer:lite

```

The demo viewer will be available at http://localhost:8012?cli-server-addr=http://localhost:8989/?convert_ad_to_kicad&zip-url=./video.zip
![Quick start](docs/quick-start.gif)

## Local development

Download and install nodejs (version >= 18) from https://nodejs.org/en/download/

```bash
git https://github.com/Huaqiu-Electronics/ecad-viewer.git
cd ecad-viewer
npm install
npm run serve
```

Try to modify the code and open http://localhost:8080 to inspect the change

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

- `cli_server_addr`: URL of the API endpoint for converting AD designs to KiCad
- `ecad-source`: Customer tag in which the either Kicad or AD design url is stored in the `src` attribute
- `ecad-3d-source`: Customer tag in which the 3D model url is stored in the `src` attribute
- `convert_pcb_to_glb_url`: URL of the API endpoint for converting KiCad PCB to 3D model

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

Explanation:

- `url`: URL of the KiCad PCB or AD design or multiple KiCad PCB or AD designs separated by semicolon
- `is-bom`: If set to true, the embedded viewer will show the BOM instead of the schematic

Check out the [Embedded example](debug/embedded.html)

### kicad-cli server

kicad-cli is needed for both converting AD designs to KiCad and the 3D model generation.

#### kicad-cli docker image

Here is the [docker image](https://github.com/orgs/Huaqiu-Electronics/packages/container/package/kicad) built upon the [Kicad branch](https://github.com/Huaqiu-Electronics/kicad) we maintain.

```bash
# The full image in which all the kicad official 3d models are shipped
docker pull ghcr.io/huaqiu-electronics/kicad:full

# The minimal image in which only the kicad-cli is shipped
docker pull ghcr.io/huaqiu-electronics/kicad:lite
```

#### kicad-cli-python

[kicad-cli-python](https://github.com/Huaqiu-Electronics/kicad-cli-python) is a python wrapper for kicad-cli. Assuming you have pulled the kicad-cli docker image mentioned above, you can start the file server and the cli server as follows:

```bash
git clone https://github.com/Huaqiu-Electronics/kicad-cli-python.git
cd kicad-cli-python
pip install -r ./requirements.txt
# Start the file server and the cli server
python file_srv.py
python cli_srv.py
```

## Credits

This project contains copies or makes use of other works. These works and their respective license and terms are:

- [kicanvas](https://github.com/theacodes/kicanvas) is under the [MIT license](https://github.com/theacodes/kicanvas/blob/main/LICENSE.md)
- [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer) is under the [MIT license](https://github.com/donmccurdy/three-gltf-viewer/blob/main/LICENSE)
