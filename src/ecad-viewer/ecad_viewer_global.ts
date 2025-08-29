import { BoardContentReady } from "../viewers/base/events";

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
    ]) {
        const value = urlParams.get(key);
        if (value) {
            // Replace all "-" with "_" to match the window variable names.
            const var_name = key.replace(/-/g, "_");
            // @ts-expect-error 7015
            window[var_name] = value;
        }
    }

    window.cli_server_addr =
        window.cli_server_addr ?? "http://localhost:8989/convert_ad_to_kicad";
    window.zip_url = window.zip_url ?? "./video.zip";

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
