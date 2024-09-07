export declare function deleteFoldersRecursive(
/** Path to the folder */
path: string, 
/** List of exceptions */
exceptions?: string[]): void;
export declare function readDirRecursive(path: string, _list?: string[]): string[];
export declare function collectFiles(patterns: string[] | string): {
    name: string;
    base: string;
}[];
export declare function copyFiles(patterns: string[] | string, dest: string, options?: {
    process?: (fileData: string) => string;
    replace?: {
        find: string | RegExp;
        text: string;
    }[];
}): void;
export declare function npmInstall(src: string, options?: {
    /** Set to false if you want to execute without `--force` flag */
    force?: boolean;
}): Promise<void>;
export declare function buildReact(
/** React directory to build */
src: string, options?: {
    /** use craco instead of react-scripts */
    craco?: boolean;
    /** Root directory to copy the version from */
    rootDir?: string;
    /** Use exec and not fork */
    exec?: boolean;
    /** Max memory size for exec */
    ramSize?: number;
}): Promise<void>;
export declare function buildCraco(
/** React directory to build */
src: string, options?: {
    /** Root directory to copy the version from */
    rootDir?: string;
    /** Use exec and not fork */
    exec?: boolean;
    /** Max memory size for exec */
    ramSize?: number;
}): Promise<void>;
export declare function patchHtmlFile(fileName: string): Promise<boolean>;
