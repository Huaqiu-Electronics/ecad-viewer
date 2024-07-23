import JSZip from "jszip";

export class ZipUtils {
    public static async unzipFile(file: Blob): Promise<File[]> {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const files: File[] = [];

        for (const filename in zipContent.files) {
            const zipEntry = zipContent.files[filename];
            if (zipEntry && !zipEntry.dir) {
                const blob = await zipEntry.async("blob");
                files.push(new File([blob], filename));
            }
        }

        return files;
    }
}
