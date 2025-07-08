import { fire_passive_action } from "./fire_passive_action";
import { PASSIVE_ACTION_CATEGORY } from "./passive_action_category";

export const show_ecad_viewer = () =>
    fire_passive_action({
        category: PASSIVE_ACTION_CATEGORY.PA_WEB_HOST,
        data: {
            type: "show_ecad_viewer",
            // The data is the current url
            data: window.location.href,
        },
    });
