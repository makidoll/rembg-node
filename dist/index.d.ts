import * as sharp from "sharp";
export declare class Rembg {
    private readonly options;
    private modelDownloaded;
    private promisesResolvesUntillDownloaded;
    private readonly u2netHome;
    readonly modelPath: string;
    private log;
    constructor(options?: {
        logging?: boolean;
    });
    private ensureModelDownloaded;
    remove(sharpInput: sharp.Sharp): Promise<sharp.Sharp>;
}
