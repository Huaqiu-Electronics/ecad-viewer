import { BoardContentReady } from "../viewers/base/events";
import type { DesignURLs } from "./design_urls";

type PAGES = "sch" | "pcb" | "3d" | "bom" | "full" | "design_block";

declare global {
    // Note the capital "W"
    interface Window {
        is_module_lib?: boolean;
        zip_url?: string;
        cli_server_addr?: string;
        ai_url?: string;
        app?: PAGES;
        default_page?: PAGES;
        design_urls?: DesignURLs;
        hide_header?: boolean;
    }
}

const urlParams = new URLSearchParams(window.location.search);

export const load_ecad_viewer_conf = () => {
    for (const key of [
        "zip-url",
        "cli-server-addr",
        "ai-url",
        "is-module-lib",
        "app",
        "default-page",
        "hide-header",
    ]) {
        const value = urlParams.get(key);
        if (value) {
            // Replace all "-" with "_" to match the window variable names.
            const var_name = key.replace(/-/g, "_");
            // @ts-expect-error 7015
            window[var_name] = value;
        }
    }

    const base64_encoded_design_urls = urlParams.get("design_urls");

    if (base64_encoded_design_urls) {
        try {
            const json_str = atob(base64_encoded_design_urls);
            window.design_urls = JSON.parse(json_str);
        } catch (e) {
            console.error(e);
        }
    }

    window.addEventListener(
        BoardContentReady.type,
        (event: BoardContentReady) => {
            if (!window.cli_server_addr) return;

            const postData = {
                pcb_content: event.detail,
            };

            const fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postData),
            };

            // Make the POST request using fetch
            fetch(window.cli_server_addr, fetchOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then((data) => {
                    const url = data["url"];
                    console.log("Response from API:", url);
                    window.dispatchEvent(
                        new CustomEvent("3d:url:ready", { detail: url }),
                    );
                })
                .catch((error) => {
                    console.error(
                        "There was a problem with the fetch operation:",
                        error,
                    );
                });
        },
    );
};

export const is_showing_design_block = () => window.app === "design_block";
