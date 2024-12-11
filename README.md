# Build tools for ioBroker

This module is a replacement for gulp that is commonly used in ioBroker repositories.

## How to use

First, you need to install the module:

```shell
npm install @iobroker/build-tools --save-dev
```

Then you can create a file `tasks.js` in the root of your repository with the similar content as [tasks.js](tasks.js):

And use in `package.json` `scripts`:

```json
"scripts": {
    "task0clean": "node tasks --0-clean",
    "task1npm": "node tasks --1-npm",
    "task2compile": "node tasks --2-compile",
    "task3copy": "node tasks --3-copy",
    "taskBuild": "node tasks"
}
```

## Tools

### deleteFoldersRecursive

Delete all files and folders in the given directory.
The path could be relative or absolute.
This function operates synchronously.
The target folder itself will not be deleted.

Usage: `deleteFoldersRecursive(__dirname + '/src', ['.png']);`

The files given in the second parameter will not be deleted.

### copyFolderRecursiveSync

The `copyFolderRecursiveSync` function is used to copy all files and subdirectories from a source directory to a destination directory.
This function operates synchronously, meaning it will block the execution of the program until the copying process is complete.
It is useful for tasks that require a complete and immediate copy of a directory structure, such as backup operations or preparing files for deployment.

The target directory will be created if not exists.
The path could be relative or absolute.

Usage: `copyFolderRecursiveSync(__dirname + '/src/build', __dirname + '/dist');`

### readDirRecursive

The readDirRecursive function is used to read all files and subdirectories within a given directory recursively.
This function is useful for tasks that require processing or listing all files within a directory tree,
such as file indexing, searching, or batch processing operations.

The function operates synchronously.

Usage:

```js
const files = readDirRecursive(__dirname + '/src');
console.log(files);
```

Parameters:

-   `dir`: The directory path to read. The path can be relative or absolute.
    Returns:
-   An array of file paths representing all files found within the specified directory and its subdirectories.

### copyFiles

The copyFiles function is used to copy specific files from a source directory to a destination directory. This function is useful for tasks that require selective copying of files based on certain patterns or criteria, such as preparing files for deployment or creating backups of specific files.

Usage:

```js
const files = copyFiles(['src/build/**/*.js', '!src/build/**/*node_modules*.js'], __dirname + '/dist');
console.log(files);
```

Parameters:

-   `src`: Array of the patterns. Negative pattern starts with '!'. You can use the [glob](https://code.visualstudio.com/docs/editor/glob-patterns) patterns.
-   `dest`: The destination directory path where files will be copied to. The path can be relative or absolute.

### npmInstall

The `npmInstall` function is used to install npm packages for a given project. This function is useful for automating the setup process of a project by programmatically running `npm install` to ensure all dependencies are installed.

The function returns promise and it is not synchron.

Usage:

```js
npmInstall(__dirname + '/src').catch(e => console.error('Cannot install packages: ' + e.toString()));
```

### buildReact

The buildReact function is used to build a React application.
This function is useful for automating the build process of a React project,
ensuring that all necessary steps are taken to compile and bundle the application for production.

Usage for craco:

```js
buildReact(__dirname + '/src', { craco: true, rootDir: __dirname, ramSize: 7000 }).catch(e =>
    console.error('Cannot install packages: ' + e.toString()),
);
```

Usage for vite:

```js
buildReact(__dirname + '/src', { vite: true, rootDir: __dirname }).catch(e =>
    console.error('Cannot install packages: ' + e.toString()),
);
```

Usage for application with React scripts:

```js
buildReact(__dirname + '/src', { rootDir: __dirname }).catch(e =>
    console.error('Cannot install packages: ' + e.toString()),
);
```

Possible options:

-   `rootDir` - sometimes the craco, vite, react-scripts are installed in the main directory and not in the src directory. This parameter says to function to look in the root directory for the executable script too.
-   `ramSize` - adds the parameter `--max-old-space-size=X` (in MB) to the node parameter to increase the memory for build. `vis-2` or `admin` require it.
-   `tsc` - Executes `tsc` command in the target directory before build.
-   `craco` - Used `craco` for build
-   `vite` - Used `vite` for build

### ignoreWidgetFiles

Create a list of glob patterns for files that must be ignored by coping of the widget files. Used together with `copyWidgetFiles`.

### copyWidgetsFiles

Create a list of glob patterns for files, that must be copied for widgets.

Usage:

```js
copyFiles(
    [
        __dirname + '/src/build/**/*.*',
        copyWidgetsFiles(__dirname + '/src/build'),
        ignoreWidgetFiles(__dirname + '/src/build'),
    ],
    __dirname + '/widgets/vis-2-widgets-adapter-name',
);
```

### patchHtmlFile

Replace in the given HTML file the debug script with production one:

```html
<script>
    const script = document.createElement('script');

    window.registerSocketOnLoad = function (cb) {
        window.socketLoadedHandler = cb;
    };

    script.onload = function () {
        typeof window.socketLoadedHandler === 'function' && window.socketLoadedHandler();
    };

    script.onerror = function () {
        console.error('Cannot load socket.io. Retry in 5 seconds');
        setTimeout(function () {
            window.location.reload();
        }, 5000);
    };

    setTimeout(() => {
        script.src =
            window.location.port === '3000'
                ? `${window.location.protocol}//${window.location.hostname}:8081/lib/js/socket.io.js`
                : './lib/js/socket.io.js';
    }, 1000);

    document.head.appendChild(script);
</script>
```

will be replaced with

```html
<script
    type="text/javascript"
    onerror="setTimeout(function(){window.location.reload()}, 5000)"
    src="./lib/js/socket.io.js"
></script>
```

Usage:
`patchHtmlFile('admin/index_m.html')`

## Converting i18n structure

You can convert the old i18n structure i18n/lang/translations.json to the new structure i18n/lang.json with the following command:

```shell
node node_modules/@iobroker/build-tools/convertI18n.js
```

Optionally, you can specify the path to the i18n folder:

```shell
node node_modules/@iobroker/build-tools/convertI18n.js path/to/i18n
```

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

## Changelog
### 2.0.12 (2024-12-11)

-   (@GermanBluefox) Added clean install options for npmInstall

### 2.0.11 (2024-12-08)

-   (@GermanBluefox) Exited from process with error code 2 if React cannot be built

### 2.0.10 (2024-12-06)

-   (@GermanBluefox) Do not convert to string the files by processing them

### 2.0.9 (2024-11-25)

-   (@GermanBluefox) Treat exit code 1 as error

### 2.0.8 (2024-11-25)

-   (@GermanBluefox) Added parameter to copyFiles/process function. It is possible to filter files with it

### 2.0.7 (2024-11-16)

-   (@GermanBluefox) Added parameter for socket.io lib in `patchHtmlFile` method

### 2.0.6 (2024-10-07)

-   (@GermanBluefox) Fixed coping of files

### 2.0.5 (2024-10-03)

-   (@GermanBluefox) Used glob for patterns

### 1.1.1 (2024-10-03)

-   (@GermanBluefox) Trying to fix a build script for craco

### 1.1.0 (2024-09-25)

-   (@GermanBluefox) optimized the pacht of HTML file
-   (@GermanBluefox) Used `eslint-config` of ioBroker

### 1.0.9 (2024-09-21)

-   (@GermanBluefox) added `copyWidgetsFiles` and `ignoreWidgetFiles`

### 1.0.7 (2024-09-21)

-   (@GermanBluefox) Added log outputs

### 1.0.4 (2024-09-20)

-   (@GermanBluefox) Added the build support for vite and typescript

### 1.0.3 (2024-09-19)

-   (@GermanBluefox) Added DANGEROUSLY_DISABLE_HOST_CHECK for buildReact

### 1.0.2 (2024-09-10)

-   (@GermanBluefox) Added i18n convert script

### 1.0.1 (2024-09-08)

-   (@GermanBluefox) Added `copyFolderRecursiveSync`

### 1.0.0 (2024-09-08)

-   (@GermanBluefox) Catch the errors by deletion

### 0.1.1 (2024-09-04)

-   (@GermanBluefox) Export `collectFiles` method

### 0.1.0 (2024-09-04)

-   (@GermanBluefox) Added buildReact method

### 0.0.6 (2024-08-29)

-   (@GermanBluefox) Added tools for admin: patchHtmlFile

### 0.0.3 (2024-08-29)

-   (@GermanBluefox) initial release

## License

The MIT License (MIT)

Copyright (c) 2024 Denis Haev <dogafox@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
