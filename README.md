# The Ballerina Extension for Visual Studio Code

The Visual Studio Code Ballerina extension provides a set of rich language features along with an enhanced user experience. 
It offers easy development, execution, debugging, and testing for the Ballerina programming language. 
The Ballerina language possesses a bidirectional mapping between its syntaxes and the visual representation. 
You can further visualize the graphical representation of your Ballerina source via the extension.

---
## Quick Start

### Prerequisites

Before getting started, make sure you have installed the [Visual Studio Code editor](https://code.visualstudio.com/download).

### Installing the Ballerina Extension

Follow the steps below to install the Ballerina extension.

1. [Download](https://ballerina.io/downloads/) and [install](https://ballerina.io/learn/user-guide/getting-started/setting-up-ballerina/#installing-ballerina) Ballerina.
2. [Install](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/quick-start/#installing-the-ballerina-extension) Ballerina VS Code Extension. Launch VS Code Quick Open (`Ctrl + P` or `Cmd + P` in mac), and paste following `ext install WSO2.ballerina`
3. Open a Ballerina `.bal` file or a project directory to activate the extension.

	**Info:** When the extension is activated, you can see the `Ballerina SDK: <version>` in the status bar at the bottom left corner.

	<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/show-version-on-vscode.png?raw=true" width="70%" />

### Running Your First Ballerina Program

Follow the steps below to create a sample Ballerina program in VSCode.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/running-your-program.gif?raw=true" width="100%" />

1. Click **View** in the menu bar of the editor, and click **Command Palette**.

    >**Tip:** You can use the shortcut methods `⌘ + ↑ + P` on Mac and `Ctrl + Shift + P` on Windows and Linux.

2. In the search bar, type `Show Examples` and click **Ballerina: Show Examples**.

3. Select the **Hello World Main** example.

4. Click on the **Run** code lens on the editor. 

    You just ran your first Ballerina program with a few clicks.

    >**Tip:** If you wish to debug further, you can either use the **Debug** code lens or see debugging guidelines below.

5. Click the **Show Diagram** button on the editor’s title bar to view the graphical representation of the program.

---
## Functionalities

### Source Code View

<details open>
<summary>IntelliSense</summary>

##### Code completion & snippets
The extension provides you with suggestions on variables, keywords, and code snippets of language constructs (such as functions, type definitions, services, iterable constructs, etc.)

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/code-completion.gif?raw=true" width="100%" />

##### Help via Hover
When hovering over a symbol name, you will be provided with quick information about the particular symbol. For example, when hovering over a function name, you will be prompted with the associated documentation.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/symbol-information-on-hover.gif?raw=true" width="100%" />

##### Signature Help
When typing a function/method call expression, the signature help will show information such as the function/method call’s description and parameter information. Signature help will be triggered when typing the open parenthesis and comma.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/signature-help.gif?raw=true" width="100%" />

</details>

<details>
<summary>Code Formatting</summary>
Code formatting has the two options below. 

  - Formatting a document 

	<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/format-document.gif?raw=true" width="100%" />

  - Formatting a selected range in the document

	<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/format-document-range.gif?raw=true" width="100%" />
</details>

<details>
<summary>Diagnostics</summary>

The diagnostics show you the syntax and semantic errors in the source code. Varieties of diagnostics such as errors and warnings will be shown. For a selected set of diagnostics, you can see the quick fixes. For example, the `variable assignment is required` diagnostic will have two associated quick fixes to create a new variable and ignore the return value.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/diagnostics.gif?raw=true" width="100%" />
</details>

<details>
<summary>Debugging</summary>

The Ballerina VS Code extension comes with builtin debugging capabilities, so that the Ballerina users can seamlessly troubleshoot their applications at runtime. 
It allows you to debug Ballerina programs, services, tests and also provides remote debugging capabilities out of the box.

The below are some of the key debugging features provided by the Ballerina language extension.
- Launch/Attach
- Breakpoints
    - Conditional Breakpoints
    - Logpoints (Plain texts and string templates)
- Pause/Continue instructions
- Step In/Out/Over instructions
- Strand View
- Call Stack View
- Local & Global variable view
- Expression Evaluation

For detailed documentation on initializing debug sessions, using the debugging features and advanced configuration options, see [Ballerina Debugging](https://ballerina.io/learn/visual-studio-code-extension/debugging/).

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/start-quick-main-debug-session.gif?raw=true" width="100%" />

</details>

<details>
<summary>Code Navigation</summary>

##### Go to Definition 

For a symbol, this feature will navigate you to the definition of the particular symbol. For example, when invoking the go to definition from a function call expression, you will be navigated to the definition of the function. Apart from jumping to the definition, the peek definition will also be supported. The behavior will be the same not only for the constructs within the sources in the current project but also for external modules and standard libraries as well.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/go-to-definition.gif?raw=true" width="100%" />

##### Find all References

Invoking the references on a symbol will prompt you with all the symbol references in the current project.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/find-all-references.gif?raw=true" width="100%" />

#### Rename Symbols
This feature allows you to rename symbols by renaming all the references of the particular symbol.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/rename-symbols.gif?raw=true" width="100%" />

</details>

<details>
<summary>Code Actions</summary>

There are two types of code actions suggested based on the node at a given cursor position and based on the diagnostic at a given cursor position.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/create-variable.gif?raw=true" width="100%" />

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/document-this.gif?raw=true" width="100%" />

##### Create Variable Code Actions
Below demonstrate the types of code actions available for creating a variable.
- `Create variable`: Create a variable for an expression where the `Variable Assignment Required` diagnostic is present.
- `Create variable and type guard`: Create a type guard to handle the error gracefully when the `Variable assignment Required` diagnostic is present.
- `Create variable and check error`: Add a check expression when the `Variable assignment Required` diagnostic is present.
- `Ignore return value`: Ignore the return value with the `_` where the `Variable Assignment Required` diagnostic is present.

##### Code Actions for Union Types
Below demonstrate the code actions available for union type variables.
- `Type guard variable`: Type guard a variable, if the variable is of the union type.
- `Add check error`: When there is an error union, add a check statement.

##### Code Actions for Imports
Below demonstrate the code actions available for imports.
- `Import a module`: Add the import statement for a module, which has a reference without an import statement. This supports only the language library and the standard library.
- `Optimize imports`: Optimize the import statements to remove unused imports and arrange the imports in alphabetical order.
- `Pull module`: Pull locally unavailable Ballerina packages from Ballerina Central repository.

##### Code Actions for Documentation
Below demonstrate the code actions available for documentation.
- `Document this`: Add the documentation to the top-level constructs, resources, and methods.
- `Document all`: Document all the top-level constructs.
- `Update documentation`: Update the existing documentation when parameters are missing or not documented. This depends on the warning diagnostic sent by the compiler.

##### Code Actions for Incompatible Types
Below demonstrate the code actions available for incompatible types.
- `Change variable type`: Changes the type of a variable.
- `Add type cast`: Add a type cast for the incompatible types. 
- `Fix return type`: Changes the incompatible return type.
- `Change parameter type`: Changes the type of a function/ method parameter.

##### Code Actions for Create Functions 
Below demonstrate the code actions available for creating functions.
- `Create a function`: Creates a function using the selected variables/parameters.
- `Implement a method`: Implements the selected method.

</details>

<details>
<summary>Code Lens</summary>

##### Documentation Code Lens

The `Document This` code lens is shown for the public functions without the documentation. 

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/documentation-code-lens.gif?raw=true" width="100%" />

##### Run and Debug Code Lenses

Run and debug code lenses are shown for the entry points of the Ballerina project and for its test cases. The entry points include the main function and the services within the default module of the project.

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/run-debug-code-lens.gif?raw=true" width="100%" />

</details>

<details>
<summary>Commands</summary>

- **Show Examples**: It lists the available examples of the Ballerina language. By clicking on each example, you can explore each source code. 
- **Build**: It is a quick access to build your Ballerina project. Once executed, the current Ballerina project relative to the currently-opened text editor is built using the `bal build` CLI command.
- **Run**: It runs your Ballerina project. Once executed, the opened Ballerina project is built using the `bal run` CLI command.
- **Test**: It runs all the tests in your Ballerina project using the `bal test` CLI command.
- **Build Documentation**: It is a quick guide to generate documentation for your Ballerina project. Once executed, the documentation is generated using the `bal doc` CLI command. The generated documentation can be found inside the `apidocs` directory in the project `target`.
- **Show Diagram**: It is a palette reference to access the **Diagrams**. On execution, the diagram editor of the first diagram component listed under the **Diagrams** view is rendered.
- **Add Module**: It adds a [Ballerina module](https://ballerina.io/learn/organizing-ballerina-code/modules/) for the given module name using the `bal add` CLI command.  
- **Create 'Cloud.toml'**: It generates a `Cloud.toml` file for your Ballerina project according to the default [cloud specifications](https://github.com/ballerina-platform/ballerina-spec/blob/master/c2c/code-to-cloud-spec.md).
- **Paste JSON as Record**: This command converts a JSON string (that is copied to the clipboard) to a Ballerina record(s) and pastes it in your code.

</details>

### Low Code View

<img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/low-code-view.gif?raw=true" width="100%" />

Being based on sequence diagrams, Ballerina allows you to visualize a program written in Ballerina as a sequence diagram. The diagram displays the logic and network interaction of a function or a service resource making it easy to understand the source. You can view these diagrams using the Ballerina VSCode plugin.

---
## Configurations
- **Code Lens - All: Enabled** : It enables all code lens features and is enabled by default.
- **Debug Log** : It enables printing debug messages on to the Ballerina output channel and is disabled by default. These debug logs mainly include additional logs added for troubleshooting the extension.
- **Ballerina: Trace Log** : It enables printing trace messages onto the Ballerina output channel and is disabled by default. These trace logs mainly include the details of the requests sent from the extension to the Ballerina Language Server.
- **Enable File Watcher** : It enables watching file change events of the Ballerina project and is enabled by default.
- **Ballerina: Enable Performance Forecast** : It enables to provide estimates on performance of the services.
- **Ballerina: Enable Semantic Highlighting** : Semantic highlighting is enabled by default in the plugin. Users have an option to disable this and rely with syntax highlighting.
- **Enable Telemetry** : It enables the Ballerina [telemetry](https://code.visualstudio.com/docs/getstarted/telemetry) service and is enabled by default. 
- **Ballerina: Low Code Mode** : This sets the low code as the default view of the plugin. Source code is the default view in a fresh installation. 
- **Home** - It specifies the Ballerina home directory path and is only applicable if the **Plugin Dev Mode** is enabled.
- **Ballerina: Plugin Dev Mode** : It enables the plugin development mode and is disabled by default. If it is disabled, the extension picks up the Ballerina runtime installed in the environment. Also, if it is enabled, the extension picks up the Ballerina runtime defined in the **Home** configuration above.
- **Enable Language Server Debug** : It enables the Language Server debug mode and is disabled by default. It is only applicable if the **Plugin Dev Mode** is enabled.
- **Enable Configurable Editor** : It enables the configurable editor in code view when the run button flow is executed. By default, this is enabled only in the low code view.

---
## Troubleshooting

For troubleshooting, see the Ballerina Output. To view the Ballerina output tab, click **View**, click **Output,** and select **Ballerina** from the output list. It provides additional information if the plugin fails to detect a Ballerina distribution.  

You can also enable [debug logs](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/configurations/#debug-log) from the Ballerina extension settings to view any issues arising from the extension features.

---
## Ask for Help

Create [Github issues](https://github.com/wso2/ballerina-plugin-vscode/issues) to reach out to us.

---
## License

By downloading and using the Visual Studio Code Ballerina extension, you agree to the [license terms](https://wso2.com/licenses/ballerina-vscode-plugin-2021-05-25/) and [privacy statement](https://wso2.com/privacy-policy).

The VS Code Ballerina extension uses the following components, which are licensed separately.

*   It runs with the support of the Ballerina Language Server, which is a part of the Ballerina language distribution. The [Ballerina language](https://ballerina.io/) is an open-source software that comes under the [Apache License](https://www.apache.org/licenses/LICENSE-2.0).
*   It is structured as an extension pack along with the [TOML Language Support](https://marketplace.visualstudio.com/items?itemName=be5invis.toml) extension.
