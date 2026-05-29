import {
    ComponentERCResultEvent,
    ProjectERCResultEvent,
    ImageExportRequestEvent,
    ImageExportResultEvent,
} from "../viewers/base/events";

export const setup_iframe_bridge = () => {
    window.addEventListener("message", (msg) => {
        if (typeof msg.data.type !== "string") return;
        switch (msg.data.type) {
            case ComponentERCResultEvent.type: {
                const evt = new CustomEvent(ComponentERCResultEvent.type, {
                    detail: msg.data.detail,
                });
                window.dispatchEvent(evt);
                break;
            }
            case ProjectERCResultEvent.type: {
                const evt = new CustomEvent(ProjectERCResultEvent.type, {
                    detail: msg.data.detail,
                });
                window.dispatchEvent(evt);
                break;
            }
            case ImageExportRequestEvent.type: {
                const evt = new ImageExportRequestEvent(msg.data.detail);
                window.dispatchEvent(evt);
                break;
            }
            default:
                console.warn(
                    `Unknown message type received in iframe bridge: ${msg.data.type}`,
                );
                break;
        }
    });

    window.addEventListener(ImageExportResultEvent.type, (evt) => {
        const event = evt as ImageExportResultEvent;
        window.parent.postMessage(
            {
                type: ImageExportResultEvent.type,
                detail: event.detail,
            },
            "*",
        );
    });
};
