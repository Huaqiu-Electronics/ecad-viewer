export interface PinCheck {
    content: string;
    level: string;
    pinName: string;
    pinNo: string;
}

export interface ComponentVerification {
    designator: string;
    pin_check: PinCheck[];
}

export type VerificationResult = ComponentVerification[];
