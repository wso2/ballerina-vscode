# @wso2/syntax-tree

## Getting Started 

### Developer Guide

> Avoid working directly on `wso2/vscode-extensions`, fork this repository to your account first.

```
git clone https://github.com/<your-username>/vscode-extensions.git
cd vscode-extensions
rush install
```
After installing dependencies, you can build the entire monorepo with:

```
rush build
```

To build only the `@wso2/syntax-tree` package and its dependencies, use:

```
rush build --to @wso2/syntax-tree
```

#### For local development

To watch for changes and automatically rebuild the `syntax-tree` package during development, run:

```
cd workspaces/ballerina/syntax-tree
npm run watch
```

> **Note:** Always use Rush commands in this monorepo. Avoid using `npm` or `yarn` directly inside package folders.
