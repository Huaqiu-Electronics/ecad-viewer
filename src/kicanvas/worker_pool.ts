import * as Comlink from "comlink";

type ParserAPI = {
    parse_board(buffer: ArrayBuffer): Promise<any>;
    parse_schematic(buffer: ArrayBuffer): Promise<any>;
};

export class WorkerPool {
    private workers: Comlink.Remote<ParserAPI>[] = [];
    private idle: Comlink.Remote<ParserAPI>[] = [];
    private queue: (() => void)[] = [];

    constructor(workerCount: number) {
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(
                new URL("./parser.worker.js", import.meta.url),
                { type: "module" },
            );

            const wrapped = Comlink.wrap<ParserAPI>(worker);
            this.workers.push(wrapped);
            this.idle.push(wrapped);
        }
    }

    async run<T>(
        job: (worker: Comlink.Remote<ParserAPI>) => Promise<T>,
    ): Promise<T> {
        if (this.idle.length === 0) {
            await new Promise<void>((resolve) => {
                this.queue.push(resolve);
            });
        }

        const worker = this.idle.pop()!;
        try {
            return await job(worker);
        } finally {
            this.idle.push(worker);
            if (this.queue.length) {
                this.queue.shift()!();
            }
        }
    }

    dispose() {
        this.workers.length = 0;
        this.idle.length = 0;
    }
}
