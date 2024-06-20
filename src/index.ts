/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KCUIIconElement } from "./kc-ui";
import { sprites_url } from "./kicanvas/icons/sprites";
import "./base/livereload";

// // Setup KCUIIconElement to use icon sprites.
KCUIIconElement.sprites_url = sprites_url;

import "./kc-ui/select";
import "./ecad-viewer/tab_button";

import "./ecad-viewer/tab_header";
import "./ecad-viewer/ecad_viewer";
import "./3d-viewer/online_3d_viewer";
import "./ecad-viewer/ecad_viewer_embedded ";

import { ECadViewer } from "./ecad-viewer/ecad_viewer";
import {
    find_root_sch_from_content,
    find_root_sch_from_urls,
    extract_bom_list_from_content,
    extract_bom_list_from_urls,
} from "./utils";
import { KCBoardAppElement } from "./kicanvas/elements/kc-board/app";
import { Online3dViewer } from "./3d-viewer/online_3d_viewer";
import { KCSchematicAppElement } from "./kicanvas/elements/kc-schematic/app";
import { ECadViewerEmbedded } from "./ecad-viewer/ecad_viewer_embedded ";
import { ECadStandaloneBom } from "./ecad-viewer/ecad_standalone_bom";
import { html } from "./base/web-components/html";

export {
    Online3dViewer,
    html,
    KCSchematicAppElement,
    KCBoardAppElement,
    ECadStandaloneBom,
    ECadViewer,
    find_root_sch_from_content,
    find_root_sch_from_urls,
    extract_bom_list_from_content,
    extract_bom_list_from_urls,
};

export default {
    ECadViewer,
    ECadViewerEmbedded,
    find_root_sch_from_urls,
    find_root_sch_from_content,
    extract_bom_list_from_content,
    extract_bom_list_from_urls,
    KCBoardAppElement,
    KCSchematicAppElement,
    Online3dViewer,
    ECadStandaloneBom,
};
