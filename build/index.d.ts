export declare function deleteFoldersRecursive(path: string, exceptions?: string[]): void;
export declare function readDirRecursive(path: string, _list?: string[]): string[];
export declare function collectFiles(patterns: string[] | string): {
    name: string;
    base: string;
}[];
export declare function copyFiles(patterns: string[] | string, dest: string): void;
export declare function npmInstall(src: string): Promise<void>;
export declare function buildCraco(rootDir: string, src: string): Promise<void>;
