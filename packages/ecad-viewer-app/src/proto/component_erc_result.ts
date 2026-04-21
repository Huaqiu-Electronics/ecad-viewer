export type ErrorSeverity = "error" | "warning" | string;

export interface PinCheckResult {
    pin_num: string;
    message?: string;
    severity?: ErrorSeverity;
}

export interface ComponentERCResult {
    designator: string;
    pins: PinCheckResult[];
}
