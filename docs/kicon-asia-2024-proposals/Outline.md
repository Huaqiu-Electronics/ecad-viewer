# ECAD Viewer Development and Integration Insights: A Journey Through the Open Source Community

Thanks to the open source community, we successfully launched a solution within three man-months that allows users to view electronic design files, including PCBs, schematics, and 3D models, online.

This talk will share our practices within the open source community while enabling you to integrate the solution into your website, covering:

-   Containerizing the KiCad development environment and testing KiCad with the latest versions of its dependencies in the Debian unstable distribution
-   Setting up GitHub Actions to build and publish the Docker image to GitHub Container Registry and Aliyun Container Registry
-   Opening a pull request to an open-source project
-   Asking questions and receiving answers from the community

References:

-   Online ECAD Viewer
    -   The ECAD Viewer project: [GitHub Link](https://github.com/Huaqiu-Electronics/ecad-viewer) and [Preview](https://www.eda.cn/ecadViewer)
    -   The KiCad CLI Docker project : [GitHub Link](https://github.com/Huaqiu-Electronics/kicad-cli-docker)
-   [KiCad](https://gitlab.com/kicad/code/kicad/)
-   [kicanvas](https://github.com/theacodes/kicanvas)
-   [three.js](https://github.com/mrdoob/three.js)
-   [Opening a pull request on Github](https://github.com/mrdoob/three.js/pull/27543)
-   [three.js forum](https://discourse.threejs.org/t/browser-becomes-unresponsive-when-loading-the-attached-model/63749)
-   [Debian Unstable](https://wiki.debian.org/DebianUnstable)
