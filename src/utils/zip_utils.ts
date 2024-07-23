import JSZip from "jszip";

export class ZipUtils {
    public static unzipFile(file: Blob): Promise<Record<string, string>> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const zip = new JSZip();
                    const zipContent = await zip.loadAsync(
                        event.target!.result as ArrayBuffer,
                    );
                    const files: Record<string, string> = {};

                    await Promise.all(
                        Object.keys(zipContent.files).map(async (filename) => {
                            const fileData =
                                await zipContent.files[filename]!.async(
                                    "string",
                                );

                            filename =
                                filename.lastIndexOf("/") > -1
                                    ? filename.substring(
                                          filename.lastIndexOf("/") + 1,
                                      )
                                    : filename;
                            files[filename] = fileData;
                        }),
                    );

                    resolve(files);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsArrayBuffer(file);
        });
    }
}
