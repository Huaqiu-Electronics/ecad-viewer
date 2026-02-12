export interface I_TitleBlock {
    title: string;
    date: string;
    rev: string;
    company: string;
    comment: Record<string, string>;
}

export const PaperSize = {
    User: [431.8, 279.4] as const,
    A0: [1189, 841] as const,
    A1: [841, 594] as const,
    A2: [594, 420] as const,
    A3: [420, 297] as const,
    A4: [297, 210] as const,
    A5: [210, 148] as const,
    A: [279.4, 215.9] as const,
    B: [431.8, 279.4] as const,
    C: [558.8, 431.8] as const,
    D: [863.6, 558.8] as const,
    E: [1117.6, 863.6] as const,
    USLetter: [279.4, 215.9] as const,
    USLegal: [355.6, 215.9] as const,
    USLedger: [431.8, 279.4] as const,
};

export type PaperSizeName = keyof typeof PaperSize;

export interface Paper {
    size: PaperSizeName;
    width?: number;
    height?: number;
    portrait: boolean;
}
