import fs, {
    existsSync,
    readFileSync,
    writeFileSync,
    copyFileSync,
    readdirSync,
    statSync,
    rmdirSync,
    unlinkSync,
    mkdirSync,
} from 'node:fs';
import { globSync } from 'glob';
import { type ChildProcess, exec, fork, type IOType, type CommonSpawnOptions, execFile } from 'node:child_process';
import { dirname, join } from 'node:path';

/**
 * Delete all folders recursive (sync function)
 */
export function deleteFoldersRecursive(
    /** Path to the folder */
    path: string,
    /** List of exceptions */
    exceptions?: string[],
): void {
    if (existsSync(path)) {
        const files = readdirSync(path);
        for (const file of files) {
            const curPath = join(path, file);
            if (exceptions?.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                try {
                    rmdirSync(curPath);
                } catch (e) {
                    console.warn(`[${new Date().toISOString()}] Cannot delete "${curPath}: ${e}`);
                }
            } else {
                try {
                    unlinkSync(curPath);
                } catch (e) {
                    console.warn(`[${new Date().toISOString()}] Cannot delete "${curPath}: ${e}`);
                }
            }
        }
    }
}

/**
 * Copies folder recursive (sync function)
 */
export function copyFolderRecursiveSync(
    /** Source folder */
    src: string,
    /** Destination folder */
    dest: string,
    /** List of files to exclude */
    exclude?: string[],
): void {
    const stats = existsSync(src) ? statSync(src) : null;
    if (stats?.isDirectory()) {
        !fs.existsSync(dest) && fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(childItemName => {
            copyFolderRecursiveSync(join(src, childItemName), join(dest, childItemName));
        });
    } else if (!exclude || !exclude.find(ext => src.endsWith(ext))) {
        copyFileSync(src, dest);
    }
}

// Read all files in directory and subdirectories as one list (sync function)
export function readDirRecursive(path: string, _list?: string[]): string[] {
    _list = _list || [];
    if (existsSync(path)) {
        const files = readdirSync(path);
        files.forEach((file: string) => {
            const fullPath = join(path, file).replace(/\\/g, '/');
            if (statSync(fullPath).isDirectory()) {
                readDirRecursive(fullPath, _list);
            } else {
                _list.push(fullPath);
            }
        });
    }

    return _list;
}

// Collect files by mask (sync function)
export function collectFiles(patterns: string[] | string): { name: string; base: string }[] {
    const _patterns = typeof patterns === 'string' ? [patterns] : patterns;
    const result = [];
    for (let i = 0; i < _patterns.length; i++) {
        let add = true;
        if (_patterns[i].startsWith('!')) {
            _patterns[i] = _patterns[i].substring(1);
            add = false;
        }
        _patterns[i] = _patterns[i].replace(/\\/g, '/');

        let folder = _patterns[i].split('*')[0];
        if (folder[folder.length - 1] === '/') {
            folder = folder.substring(0, folder.length - 1);
        } else {
            const folderParts = folder.split('/');
            folderParts.pop();
            folder = folderParts.join('/');
        }

        const files: string[] = globSync(_patterns[i]);

        for (let f = 0; f < files.length; f++) {
            files[f] = files[f].replace(/\\/g, '/');
            if (folder && files[f].startsWith(folder)) {
                files[f] = files[f].substring(folder.length + 1);
            }

            if (add) {
                // ignore folders
                const isDirectory = folder
                    ? statSync(join(folder, files[f])).isDirectory()
                    : statSync(files[f]).isDirectory();
                if (isDirectory) {
                    continue;
                }
                result.push({ name: files[f], base: folder });
            } else {
                const pos = result.findIndex(it => it.name === files[f]);
                if (pos !== -1) {
                    result.splice(pos, 1);
                }
            }
        }
    }

    return result;
}

// Copy files by pattern to destination (sync function)
export function copyFiles(
    patterns: string[] | string,
    dest: string,
    options?: {
        process?: (fileData: Buffer | string, fileName: string) => string | null | undefined | false;
        replace?: { find: string | RegExp; text: string }[];
    },
): void {
    const files = collectFiles(patterns);
    for (let f = 0; f < files.length; f++) {
        const destName = join(dest, files[f].name);
        const folder = dirname(destName);
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        console.log(`[${new Date().toISOString()}] Copy "${files[f].base}/${files[f].name}" to "${destName}"`);
        if (options) {
            let data: Buffer | string = readFileSync(
                files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name,
            );
            if (options.replace) {
                data = data.toString('utf8');
                for (let r = 0; r < options.replace.length; r++) {
                    data = data.replace(options.replace[r].find, options.replace[r].text);
                }
            }
            if (options.process) {
                const newData = options.process(
                    data,
                    files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name,
                );
                // if null, skip this fila
                if (newData === null || newData === false) {
                    continue;
                } else if (newData !== undefined) {
                    data = newData;
                }
            }
            writeFileSync(destName, data);
        } else {
            copyFileSync(files[f].base ? `${files[f].base}/${files[f].name}` : files[f].name, destName);
        }
    }
}

// run npm install in directory (async function)
export function npmInstall(
    /** Path to the folder where npm must be executed */
    src: string,
    /** Options */
    options?: {
        /** Set to false if you want to execute without `--force` flag */
        force?: boolean;
        /** Execute npm install with "ci" */
        clean?: boolean;
        omitDev?: boolean;
    },
): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = src.replace(/\\/g, '/');
        const start = Date.now();

        const cmd = `npm ${options?.clean ? 'ci' : 'install'}${options?.force !== false ? ' --force' : ''}${options?.omitDev ? ' --omit=dev' : ''}`;

        // System call used for update of js-controller itself,
        // because during an installation the npm packet will be deleted too, but some files must be loaded even during the install process.
        console.log(`[${new Date().toISOString()}] executing: "${cmd}" in "${cwd}"`);
        const child = exec(cmd, { cwd });

        child?.stderr?.pipe(process.stderr);
        child?.stdout?.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is a strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(new Error(`Cannot install: ${code}`));
            } else {
                console.log(`[${new Date().toISOString()}] "${cmd}" in "${cwd}" finished in ${Date.now() - start}ms.`);
                // command succeeded
                resolve();
            }
        });
    });
}

export function tsc(
    /** React directory to build */
    src: string,
    options?: {
        /** Root directory to copy the version from */
        rootDir?: string;
    },
): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir: string | undefined;
    if (options?.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
    }

    return new Promise((resolve, reject) => {
        const cpOptions: CommonSpawnOptions = {
            stdio: 'pipe' as IOType,
            cwd: src,
        };
        const start = Date.now();

        let script;
        script = `${src}/node_modules/typescript/bin/tsc`;
        if (rootDir && !existsSync(script)) {
            script = `${rootDir}/node_modules/typescript/bin/tsc`;
            if (!existsSync(script)) {
                // admin could have another structure
                script = `${rootDir}/../node_modules/typescript/bin/tsc`;
                if (!existsSync(script)) {
                    script = `${rootDir}/../../node_modules/typescript/bin/tsc`;
                }
            }
        }

        if (!existsSync(script)) {
            console.error(`[${new Date().toISOString()}] Cannot find execution file: ${script}`);
            reject(new Error(`Cannot find execution file: ${script}`));
        } else {
            const child: ChildProcess = fork(script, [], cpOptions);
            child?.stdout?.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
            child?.stderr?.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));

            child.on('close', code => {
                console.log(
                    `[${new Date().toISOString()}] child process exited with code ${code} after ${Date.now() - start}ms.`,
                );
                code ? reject(new Error(`Exit code: ${code}`)) : resolve();
            });
        }
    });
}

export function buildReact(
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
    },
): Promise<void> {
    if (src.endsWith('/')) {
        src = src.substring(0, src.length - 1);
    }
    let rootDir: string | undefined;
    const start = Date.now();

    // Copy version number from root directory to src directory
    if (options?.rootDir) {
        rootDir = options.rootDir;
        if (rootDir.endsWith('/')) {
            rootDir = rootDir.substring(0, options.rootDir.length - 1);
        }
        const version = JSON.parse(readFileSync(`${rootDir}/package.json`).toString('utf8')).version;
        const data = JSON.parse(readFileSync(`${src}/package.json`).toString('utf8'));

        if (data.version !== version) {
            console.log(`[${new Date().toISOString()}] updated version in "${src}/package.json to "${version}"`);
            data.version = version;

            writeFileSync(`${src}/package.json`, JSON.stringify(data, null, 4));
        }
    }
    const reactPromise: Promise<void> = new Promise((resolve, reject) => {
        const cpOptions: CommonSpawnOptions = {
            stdio: 'pipe' as IOType,
            cwd: src,
        };

        // cpOptions.env = {
        //     DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
        // };

        let script;
        if (options?.craco) {
            script = `${src}/node_modules/@craco/craco/dist/bin/craco.js`;
            if (rootDir && !existsSync(script)) {
                script = `${rootDir}/node_modules/@craco/craco/dist/bin/craco.js`;
                if (!existsSync(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/@craco/craco/dist/bin/craco.js`;
                    if (!existsSync(script)) {
                        script = `${rootDir}/../../node_modules/@craco/craco/dist/bin/craco.js`;
                    }
                }
            }
        } else if (options?.vite) {
            script = `${src}/node_modules/vite/bin/vite.js`;
            if (rootDir && !existsSync(script)) {
                script = `${rootDir}/node_modules/vite/bin/vite.js`;
                if (!existsSync(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/vite/bin/vite.js`;
                    if (!existsSync(script)) {
                        script = `${rootDir}/../../node_modules/vite/bin/vite.js`;
                    }
                }
            }
        } else {
            script = `${src}/node_modules/react-scripts/scripts/build.js`;
            if (rootDir && !existsSync(script)) {
                script = `${rootDir}/node_modules/react-scripts/scripts/build.js`;
                if (!existsSync(script)) {
                    // admin could have another structure
                    script = `${rootDir}/../node_modules/react-scripts/scripts/build.js`;
                    if (!existsSync(script)) {
                        script = `${rootDir}/../../node_modules/react-scripts/scripts/build.js`;
                    }
                }
            }
        }

        if (!existsSync(script)) {
            console.error(`[${new Date().toISOString()}] Cannot find execution file: ${script}`);
            reject(new Error(`Cannot find execution file: ${script}`));
        } else {
            cpOptions.cwd = src;
            let child: ChildProcess;
            if (options?.ramSize || options?.exec || options?.craco) {
                delete cpOptions.stdio;
                const cmd = 'node';
                const args = [options.ramSize ? `--max-old-space-size=${options.ramSize}` : '', script, 'build'].filter(
                    a => a,
                );
                const child = execFile(cmd, args, cpOptions);
                console.log(
                    `[${new Date().toISOString()}] Execute: "${cmd} ${args.join(' ')}" ${JSON.stringify(cpOptions)}`,
                );
                child.stderr?.pipe(process.stderr);
                child.stdout?.pipe(process.stdout);

                child.on('exit', (code /* , signal */) => {
                    // code 1 is a strange error that cannot be explained. Everything is done but error :(
                    if (code) {
                        if (code === 1 && options.ignoreCode1) {
                            console.log(`"${cmd} in ${src} finished.`);
                            // command succeeded
                            resolve();
                        } else {
                            if (options.ignoreErrors) {
                                reject(new Error(`Cannot build: ${code}`));
                            } else {
                                console.error(`Cannot build: ${code}`);
                                process.exit(2);
                            }
                        }
                    } else {
                        console.log(`"${cmd} in ${src} finished.`);
                        // command succeeded
                        resolve();
                    }
                });
            } else {
                console.log(`[${new Date().toISOString()}] fork: "${script} build" ${JSON.stringify(cpOptions)}`);
                child = fork(script, ['build'], cpOptions);
                child?.stdout?.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
                child?.stderr?.on('data', data => console.log(`[${new Date().toISOString()}] ${data.toString()}`));
                child.on('close', code => {
                    console.log(
                        `[${new Date().toISOString()}] child process exited with code ${code} after ${Date.now() - start}ms.`,
                    );
                    if (code) {
                        if (code === 1 && options?.ignoreCode1) {
                            resolve();
                        } else {
                            if (options?.ignoreErrors) {
                                reject(new Error(`Cannot build: ${code}`));
                            } else {
                                console.error(`Cannot build: ${code}`);
                                process.exit(2);
                            }
                        }
                    } else {
                        // command succeeded
                        resolve();
                    }
                });
            }
        }
    });

    if (options?.tsc) {
        return tsc(src, options).then(() => reactPromise);
    }
    return reactPromise;
}

/** @deprecated use buildReact with the craco flag */
export function buildCraco(
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
    },
): Promise<void> {
    console.warn(`[${new Date().toISOString()}] buildCraco deprecated: Please use buildReact with craco option`);
    return buildReact(src, { craco: true, ...options });
}

function _patchHtmlFile(fileName: string, rootDir?: string): boolean {
    let changed = false;
    if (fs.existsSync(fileName)) {
        let code = fs.readFileSync(fileName).toString('utf8');
        // replace code
        if (code.match(/<script>\n?\s*const script\s?=\s?document[^<]+<\/script>/)) {
            code = code.replace(
                /<script>\n?\s*const script\s?=\s?document[^<]+<\/script>/,
                `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="${rootDir || '.'}/lib/js/socket.io.js"></script>`,
            );
            changed = true;
        }
        if (code.match(/<script>\n?\s*var script\s?=\s?document[^<]+<\/script>/)) {
            code = code.replace(
                /<script>\n?\s*var script\s?=\s?document[^<]+<\/script>/,
                `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="${rootDir || '.'}/lib/js/socket.io.js"></script>`,
            );
            changed = true;
        }
        if (changed) {
            fs.writeFileSync(fileName, code);
        }
    }
    return changed;
}

export function ignoreWidgetFiles(src: string, doNotIgnoreMap?: boolean): string[] {
    src = src || './src-widgets/';
    if (!src.endsWith('/')) {
        src += '/';
    }
    let list = [
        `!${src}build/static/js/node_modules*.*`,
        `!${src}build/static/js/vendors-node_modules*.*`,
        `!${src}build/static/js/main*.*`,
        `!${src}build/static/js/src_bootstrap*.*`,
    ];
    if (!doNotIgnoreMap) {
        list = list.concat([`!${src}build/static/*.map`, `!${src}build/static/**/*.map`]);
    }

    return list;
}

export function copyWidgetsFiles(src: string): string[] {
    src = src || './src-widgets/';
    if (!src.endsWith('/')) {
        src += '/';
    }

    return [
        `${src}build/static/js/*fast-xml*.*`,
        `${src}build/static/js/*react-swipeable*.*`,
        `${src}build/static/js/*moment_*.*`,
        `${src}build/static/js/*react-beautiful-dnd*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_index_jsx*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_node_modules_babel_runtime_helpers*.*`,
        `${src}build/static/js/*runtime_helpers_asyncToGenerator*.*`,
        `${src}build/static/js/*modules_color*.*`,
        `${src}build/static/js/*echarts-for-react_lib_core_js-node_modules_echarts_core_js-*.chunk.*`,
        `${src}build/static/js/*echarts_lib*.*`,
        `${src}build/static/js/*vis-2-widgets-react-dev_node_modules_babel_runtime_helpers*.*`,
        `${src}build/static/js/*leaflet*.*`,
        `${src}build/static/js/*react-circular*.*`,
        `${src}build/static/js/*d3-array_src_index_js-node_modules_d3-collection_src_index_js-*.*`,
        `${src}build/static/js/*d3-dispatch_*.*`,
        `${src}build/static/js/*lodash_*.*`,
        `${src}build/static/js/*react-battery-gauge_dist_react-battery-gauge*.*`,
        `${src}build/static/js/*react-gauge-chart*.*`,
        `${src}build/static/js/*react-liquid-gauge*.*`,
        `${src}build/static/js/*helpers_esm_asyncToGener*.*`,
        `${src}build/static/js/*emotion_styled_dist*.*`,
        `${src}build/static/js/*mui_system_colorManipulator*.*`,
    ];
}

/**
 * Patch an HTML file (async function)
 *
 * @param fileName File name to be patched. Normally `${__dirname}/src-admin/build/index.html` or `${__dirname}/src/build/index.html`
 * @param rootDir for admin. Admin has '.' and all other adapters '../..'
 */
export function patchHtmlFile(fileName: string, rootDir?: string): Promise<boolean> {
    return new Promise(resolve => {
        if (fs.existsSync(fileName)) {
            resolve(_patchHtmlFile(fileName, rootDir));
        } else {
            // wait till finished
            setTimeout(() => resolve(_patchHtmlFile(fileName, rootDir)), 2000);
        }
    });
}
