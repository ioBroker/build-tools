/**
 * Delete all folders recursive (sync function)
 */
export declare function deleteFoldersRecursive(
/** Path to the folder */
path: string, 
/** List of exceptions */
exceptions?: string[]): void;
/**
 * Copies folder recursive (sync function)
 */
export declare function copyFolderRecursiveSync(
/** Source folder */
src: string, 
/** Destination folder */
dest: string, 
/** List of files to exclude */
exclude?: string[]): void;
export declare function readDirRecursive(path: string, _list?: string[]): string[];
export declare function collectFiles(patterns: string[] | string): {
    name: string;
    base: string;
}[];
export declare function copyFiles(patterns: string[] | string, dest: string, options?: {
    process?: (fileData: Buffer | string, fileName: string) => string | null | undefined | false;
    replace?: {
        find: string | RegExp;
        text: string;
    }[];
}): void;
export declare function npmInstall(
/** Path to the folder where npm must be executed */
src: string, 
/** Options */
options?: {
    /** Set to false if you want to execute without `--force` flag */
    force?: boolean;
    /** Execute npm install with "ci" */
    clean?: boolean;
    omitDev?: boolean;
}): Promise<void>;
export declare function tsc(
/** React directory to build */
src: string, options?: {
    /** Root directory to copy the version from */
    rootDir?: string;
}): Promise<void>;
export declare function buildReact(
/** React directory to build */
src: string, 
/** Options */
options?: {
    /** use craco instead of react-scripts */
    craco?: boolean;
    /** Root directory to copy the version from */
    rootDir?: string;
    /** Use exec and not fork */
    exec?: boolean;
    /** Max memory size for exec */
    ramSize?: number;
    /** Use vite for build */
    vite?: boolean;
    /** execute tsc before building ReactJS */
    tsc?: boolean;
    /** ignore return code 1 as error */
    ignoreCode1?: boolean;
    /** Normally process.exit will be called. With this flag only promise will be rejected */
    ignoreErrors?: boolean;
}): Promise<void>;
/** @deprecated use buildReact with the craco flag */
export declare function buildCraco(
/** React directory to build */
src: string, 
/** Options */
options?: {
    /** Root directory to copy the version from */
    rootDir?: string;
    /** Use exec and not fork */
    exec?: boolean;
    /** Max memory size for exec */
    ramSize?: number;
}): Promise<void>;
export declare function ignoreWidgetFiles(src: string, doNotIgnoreMap?: boolean): string[];
export declare function copyWidgetsFiles(src: string): string[];
/**
 * Patch an HTML file (async function)
 *
 * @param fileName File name to be patched. Normally `${__dirname}/src-admin/build/index.html` or `${__dirname}/src/build/index.html`
 * @param rootDir for admin. Admin has '.' and all other adapters '../..'
 */
export declare function patchHtmlFile(fileName: string, rootDir?: string): Promise<boolean>;
