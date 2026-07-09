import {
    ComponentERCResultEvent,
    ProjectERCResultEvent,
    ImageExportRequestEvent,
    ImageExportResultEvent,
    LOAD_ZIP_MESSAGE_TYPE,
    READY_MESSAGE_TYPE,
    ERROR_MESSAGE_TYPE,
    LoadZipEvent,
    LoadZipErrorEvent,
} from "../viewers/base/events";

// Track the current Blob URL for cleanup
let currentBlobUrl: string | null = null;

/**
 * Revoke the current Blob URL if it exists
 */
function revokeCurrentBlobUrl() {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
}

/**
 * Send error message to parent
 */
function sendError(message: string) {
    if (window.parent !== window) {
        window.parent.postMessage(
            {
                type: ERROR_MESSAGE_TYPE,
                message,
            },
            "*",
        );
    }
}

/**
 * Handle ZIP blob loading from postMessage
 */
function handleLoadZipMessage(blob: Blob, filename?: string) {
    // Validate blob
    if (!(blob instanceof Blob)) {
        sendError("Invalid payload: blob is not a Blob");
        return;
    }

    if (blob.size === 0) {
        sendError("Invalid payload: blob is empty");
        return;
    }

    // Optional: check if it's a ZIP (by extension or MIME type)
    // Note: blob.type may not always be set correctly, so we don't strictly enforce it

    // Revoke previous Blob URL if exists (queueing: newest wins)
    revokeCurrentBlobUrl();

    // Create new Blob URL
    currentBlobUrl = URL.createObjectURL(blob);

    // Set window.zip_url for the existing loader to use
    window.zip_url = currentBlobUrl;

    // Dispatch LoadZipEvent so the viewer can react
    window.dispatchEvent(new LoadZipEvent(blob));
}

/**
 * Send ready notification to parent
 */
function sendReady() {
    if (window.parent !== window) {
        window.parent.postMessage(
            {
                type: READY_MESSAGE_TYPE,
            },
            "*",
        );
    }
}

export const setup_iframe_bridge = () => {
    // Send ready notification on setup
    sendReady();

    window.addEventListener("message", (msg) => {
        if (typeof msg.data !== "object" || msg.data === null) return;
        if (typeof msg.data.type !== "string") return;

        switch (msg.data.type) {
            case LOAD_ZIP_MESSAGE_TYPE: {
                // Validate and handle ZIP blob
                const { blob, filename } = msg.data;
                handleLoadZipMessage(blob, filename);
                break;
            }
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
                // Only warn for known ecad-viewer message types that aren't handled
                if (msg.data.type.startsWith("ecad-viewer/")) {
                    console.warn(
                        `Unknown message type received in iframe bridge: ${msg.data.type}`,
                    );
                }
                // Ignore other message types silently
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

    // Listen for ZIP load error to send error message to parent and revoke Blob URL
    window.addEventListener(LoadZipErrorEvent.type, (evt) => {
        const event = evt as LoadZipErrorEvent;
        sendError(event.detail);
        revokeCurrentBlobUrl();
    });

    // Listen for project load completion/failure to revoke Blob URL
    // The ECadViewer dispatches events when loading completes
    window.addEventListener("kicanvas:load", () => {
        // Project loaded successfully, revoke Blob URL
        revokeCurrentBlobUrl();
    });
};
