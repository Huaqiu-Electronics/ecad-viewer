export interface I_Board {
    version: number;
    generator?: string;
    general?: { thickness: number; legacy_teardrops?: boolean };
}
