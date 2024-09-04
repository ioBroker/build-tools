# Build tools for ioBroker

This module is a replacement for gulp that is commonly used in ioBroker repositories.

## How to use

First, you need to install the module:

```
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

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
## Changelog
### 0.1.0 (2024-09-04)
* (bluefox) Added buildReact method

### 0.0.6 (2024-08-29)
* (bluefox) Added tools for admin: patchHtmlFile

### 0.0.3 (2024-08-29)
* (bluefox) initial release

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
