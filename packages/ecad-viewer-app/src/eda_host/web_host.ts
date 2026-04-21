import { fire_passive_action } from "./fire_passive_action";
import { PASSIVE_ACTION_CATEGORY } from "./passive_action_category";

export enum WEB_HOST_INTERNAL_CMD_TYPE {
  fetch_global_context_from_host = "fetch_global_context_from_host",
  show_image = "show_image",
}

export interface WEB_HOST_INTERNAL_CMD {
  type: string;
  data: JSON | null;
}

export const fire_web_host_internal_cmd = (data: WEB_HOST_INTERNAL_CMD) =>
  fire_passive_action({
    category: PASSIVE_ACTION_CATEGORY.PA_WEB_HOST,
    data,
  });
