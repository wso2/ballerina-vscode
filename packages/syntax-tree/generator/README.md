# @wso2/syntax-tree-generator

## Getting Started 

### Developer Guide

This repository used to generate Ballerina syntax tree library for TypeScript. This generate will use [@ballerina-platform/ballerina-distribution](https://github.com/ballerina-platform/ballerina-distribution) examples and [@ballerina-platform/ballerina-lang](https://github.com/ballerina-platform/ballerina-lang) test files to generate syntax tree library incrementally.

```
git clone https://github.com/<your-username>/ballerina-plugin-vscode.git
cd ballerina-plugin-vscode/
npm run build

cd workspaces/ballerina/syntax-tree/generator
npm i

npm run gen-models
```

`gen-models` command will download both [@ballerina-platform/ballerina-distribution](https://github.com/ballerina-platform/ballerina-distribution) and [@ballerina-platform/ballerina-lang](https://github.com/ballerina-platform/ballerina-lang) packages to `temp/` folder. After generating library files, download packages will be removed.

Generated library files will be listed in `workspaces/ballerina/syntax-tree/src`
