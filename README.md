## The Ballerina Extension for Visual Studio Code

The Visual Studio Code Ballerina extension provides a set of rich language features along with an enhanced user experience. It offers easy development, execution, debugging, and testing for the Ballerina programming language. The Ballerina language possesses a bidirectional mapping between its syntaxes and the visual representation. You can further visualize the graphical representation of your Ballerina source via the extension.

The extension works across all Ballerina versions, and some of the supported features of the extension may vary from Ballerina version to version.

---
### Quick Start

1. [Download](https://ballerina.io/downloads/) and [install](https://ballerina.io/learn/user-guide/getting-started/setting-up-ballerina/#installing-ballerina) Ballerina.
2. [Install](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/quick-start/#installing-the-ballerina-extension) Ballerina VS Code Extension. Launch VS Code Quick Open (`Ctrl + P`), and paste following `ext install WSO2.ballerina`
3. Open a Ballerina `.bal` file or a package directory to activate the extension.

	**Info:** When the extension is activated, you can see the `Ballerina SDK: <version>` in the status bar at the bottom left corner.

    <img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/status-bar.png?raw=true" width="70%" />

---

### Features

*   **Language Intelligence**

	 The VS Code Plugin brings in language support features to provide an improved experience for the Ballerina developer. The below are some of the main features available for ease of development. For more details, see [Ballerina Language Support](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/language-support/).

	*   Code Completion
	*   Diagnostics
	*   Signature Help
	*   Symbol Information on Hover
	*   Go to Definition and Peek Definition
	*   Find all References
	*   Rename
	*   Code Actions
	*   Codelens
	*   Document Formatting and Range Formatting

    <img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/language-support.gif?raw=true" width="70%" />

*   **Debugging**

	The Ballerina VS Code extension adds debugging capabilities for the Ballerina language. It supports debugging with expression evaluation and conditional breakpoints. It also allows you to debug applications remotely.

	For more details, see [Ballerina Debugging](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/debugging/).

    <img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/debug.gif?raw=true" width="70%" />


*   **Graphical Visualization**

	Each Ballerina source maps to a sequence diagram with its inherent mapping between the textual and graphical representations. The extension provides a graphical view that helps to visualize your Ballerina source.

	For more details, see [Diagram View](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/diagram-editor/).

    <img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/diagram-view.gif?raw=true" width="70%" />


*   **AI Data Mapping**

	The extension is presented with easy data integration capabilities using machine learning (ML) approaches. It generates the mapping for Ballerina record types using a set of trained ML models. These models are trained with a collection of statistical features using rule-based and neural network methodologies.

	For more details, see [Data Mapping](https://dev.ballerina.io/learn/tooling-guide/visual-studio-code-extension/language-support/#data-mapping).

    <img src="https://github.com/wso2/ballerina-plugin-vscode/blob/main/resources/images/data-mapping.gif?raw=true" width="70%" />

---
### VS Code Commands

The Ballerina extension provides a set of Ballerina-specific palette commands for quick reference.

*   **Build** - Builds the project
*   **Run** - Runs the project
*   **Test** - Runs all tests in the project
*   **Add Module** - Adds a project module for a given name
*   **Show Diagram** - Shows the sequence diagram of the current Ballerina file
*   **Document** - Generates documentation for a Ballerina project

To run a specific command, press `Ctrl + Shift + P` and then search and select the required command. For more details, see [VS Code Commands](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/vs-code-commands/).

---
### Configurations

The extension works out of the box. However, there are some additional configurations that let you customize the experience.

For more details, see [Ballerina Configurations](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/configurations/).

---
### Troubleshooting

For troubleshooting, see the Ballerina Output. To view the Ballerina output tab, click **View**, click **Output,** and select **Ballerina** from the output list. It provides additional information if the plugin fails to detect a Ballerina distribution.  

You can also enable [debug logs](https://ballerina.io/learn/tooling-guide/visual-studio-code-extension/configurations/#debug-log) from the Ballerina extension settings to view any issues arising from the extension features.

---
### Ask for Help

Create [Github issues](https://github.com/wso2/ballerina-plugin-vscode/issues) to reach out to us.

---
### License

By downloading and using the Visual Studio Code Ballerina extension, you agree to the [license terms](https://wso2.com/licenses/ballerina-vscode-plugin-2021-05-25/) and [privacy statement](https://wso2.com/privacy-policy).

The VS Code Ballerina extension uses the following components, which are licensed separately.

*   It runs with the support of the Ballerina Language Server, which is a part of the Ballerina language distribution. The [Ballerina language](https://ballerina.io/) is an open-source software that comes under the [Apache License](https://www.apache.org/licenses/LICENSE-2.0).
*   It is structured as an extension pack along with the [TOML Language Support](https://marketplace.visualstudio.com/items?itemName=be5invis.toml) extension.
