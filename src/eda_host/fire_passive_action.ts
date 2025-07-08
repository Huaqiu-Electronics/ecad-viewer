import type { PASSIVE_ACTION_CONTAINER } from "./passive_action_container";

export const fire_passive_action = async (action: PASSIVE_ACTION_CONTAINER) => {
    window.parent.postMessage(JSON.stringify(action), "*");
};
