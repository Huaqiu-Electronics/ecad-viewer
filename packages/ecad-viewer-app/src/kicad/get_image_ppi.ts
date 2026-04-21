export function get_image_ppi(data: string): number | null {
    // We need to decode the base64 data to inspect the headers.
    // This is a bit expensive, but we only do it once per image.
    try {
        const bin_str = atob(data);
        const len = bin_str.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = bin_str.charCodeAt(i);
        }

        // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47
        ) {
            return get_png_ppi(bytes);
        }

        // Check for JPEG signature: FF D8
        if (bytes[0] === 0xff && bytes[1] === 0xd8) {
            return get_jpeg_ppi(bytes);
        }
    } catch (e) {
        console.error(`Failed to extract PPI from image: ${e}`);
    }

    return null;
}



function get_png_ppi(bytes: Uint8Array): number | null {
    let offset = 8; // Skip signature
    const view = new DataView(bytes.buffer);

    while (offset < bytes.length) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
            bytes[offset + 4]!,
            bytes[offset + 5]!,
            bytes[offset + 6]!,
            bytes[offset + 7]!,
        );

        if (type === "pHYs") {
            const ppu_x = view.getUint32(offset + 8);
            const unit = bytes[offset + 16];

            if (unit === 1) {
                // Meter
                // PPI = PPU * 0.0254
                return Math.round(ppu_x * 0.0254);
            }
        }

        offset += 12 + length;
    }

    return null;
}

function get_jpeg_ppi(bytes: Uint8Array): number | null {
    let offset = 2; // Skip start of image
    const view = new DataView(bytes.buffer);

    while (offset < bytes.length) {
        const marker = view.getUint16(offset);
        const length = view.getUint16(offset + 2);

        if (marker === 0xffe0) {
            // APP0
            const density_units = bytes[offset + 11];
            const x_density = view.getUint16(offset + 12);
            // const y_density = view.getUint16(offset + 14);

            if (density_units === 1) {
                // PPI
                return x_density;
            } else if (density_units === 2) {
                // PPC (dots per cm)
                return Math.round(x_density * 2.54);
            }
        }

        offset += 2 + length;
    }

    return null;
}



