export class DesignUtils {
    public static readFile(
        file: File,
    ): Promise<{ name: string; content: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) =>
                resolve({
                    name: file.name,
                    content: e.target!.result as string,
                });
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    public static fmt_design_name(name: string) {
        const names = name.split("/");
        return names[names.length - 1]!;
    }
}