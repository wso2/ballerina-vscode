# Change log

All notable changes to the "Ballerina" extension will be documented in this file.

## **5.1.3** (2025-05-28)

### Fixed

- Resolved issues with TryIt functionality for service paths containing special characters.
- Enhanced Data Mapper usability and visual presentation.
- Updated the record editor to correctly use `packageName`.
- Addressed display issues in type diagrams and improved service configuration options.


## **5.1.2** (2025-05-18)

### Added

- Added an onboarding guide in the AI Chat view to assist new users with getting started.
- Added support for the `Lock` node in Flow Diagram.
- Added experimental support for the `Match` node in Flow Diagram.

### Changed

- Refactored AI Chat login flow and command structure for improved navigation and organization.
- Enhanced project selection for BI projects within multi-root workspaces.
- Updated Node Icons to align with theme colors.

### Fixed

- Enhanced error handling in Ask command execution in AI Chat.
- Fixed issues in the Data Mapper, including incorrect rendering of link connectors for root mapping constructors, improved handling of union types with anydata in mapping outputs, and enabling query expression navigation within nested mappings.
- Resolved issues opening incomplete mappings through code lens navigation in the Data Mapper.
- Resolved issues with running tests via the test explorer.

## **5.0.0** (2025-03-13)
For more information, see the [release notes](https://wso2.com/ballerina/vscode/docs/release-notes/version-4.5.0/).

### Added
- Introduced all-new visual support for ballerina projects

## **4.5.0** (2023-08-21)
For more information, see the [release note](https://wso2.com/ballerina/vscode/docs/release-notes/version-4.5.0/).

### Added

- Introduced XML import option to create records.

### Improved

- Added a link to quickly navigate to the central repository when a function is selected in the statement editor.
- Enabled editing of top-level constructs through the statement editor.
- Increased the size of the parameter configuration pane for better usability.
- Enhanced the behavior of the function parameter configuration in the statement editor, preventing it from jumping to the top after selecting a value.

## **4.4.0** (2023-07-21)
For more information, see the [release note](https://wso2.com/ballerina/vscode/docs/release-notes/version-4.4.0/).

### Added

- New release now supports opening ballerina gist files and repositories using the vscode URL command.

### Improved

- The GraphQL designer, Entity-relationship diagram and the Type diagram, now provide support for users to navigate to a specific node based on their selection in the field type.
- Ballerina debugger - Improved user experience.

### Bug Fixes

- Swagger View - Fix incorrect service display on Swagger View.

## **4.3.0** (2023-06-16)
For more information, see the [release note](https://wso2.com/ballerina/vscode/docs/release-notes/version-4.3.0/).

### Added

- Entity Relationship Diagram
  - A diagram that visualises the entities and their relationships defined in the Ballerina persist model.
- Config toml file creation
  - When you run a ballerina program with configurables now it creates the config toml file with required configurable values.

### Improved

- GraphQL Designer
  - Enable an option to filter between queries, mutations and subscriptions.
  - Improvements related to the GraphQL Designer UI.

## **4.0.0** (2023-04-21)

For more information, see the [release note](https://wso2.com/ballerina/vscode/docs/release-notes/version-4.0.0/).

### Added

- New unified visual and code editing experience
- HTTP API designer
- GraphQL API designer
- Architecture View
- Type Diagram
- Choreo Plugin integration

### Improved

- Data Mapper improvements
- Language Server updates

## **3.3.7**

### Fixed

- [Lowcode diagram does not load in codespaces](https://github.com/wso2/ballerina-plugin-vscode/issues/401)

## **3.3.6**

### Added

- Data Mapper 
    - [Add support for inputs, output types other than records](https://github.com/wso2/ballerina-plugin-vscode/issues/221)

### Improved

- [Add support for intermediate query clauses at function level](https://github.com/wso2/ballerina-plugin-vscode/issues/347)
- [Add support for let expressions in Data Mapper](https://github.com/wso2/ballerina-plugin-vscode/issues/349)
- [Ballerina data mapper FHIR record support](https://github.com/wso2/ballerina-plugin-vscode/issues/356)
- [Data Mapper - Display mappings associated with module level variables](https://github.com/wso2/ballerina-plugin-vscode/issues/365)
- [Data Mapper - Add an edit option for output type in config panel](https://github.com/wso2/ballerina-plugin-vscode/issues/381)
- [Statement Editor - Add expression template for adding parenthesis for selected expressions](https://github.com/wso2/ballerina-plugin-vscode/issues/385)

### Fixed

- [Data mapper - cannot map a record to a record on the low code view](https://github.com/wso2/ballerina-plugin-vscode/issues/339)
- [Data Mapper - Links with transformed values from the input nodes are not displayed](https://github.com/wso2/ballerina-plugin-vscode/issues/369)
- [Data Mapper - Links associated with local variables are not displayed within query expressions](https://github.com/wso2/ballerina-plugin-vscode/issues/391)

### **3.3.5**

### **Fixed**

- [Broken links in readme](https://github.com/wso2/ballerina-plugin-vscode/issues/335)

### **3.3.4**

### **Improved**

- [Data Mapper - Display banner if DM function contains unsupported input/output types](https://github.com/wso2/ballerina-plugin-vscode/issues/217)
- [Data Mapper - Improve the transformer name suggestion by providing an non-existing name](https://github.com/wso2/ballerina-plugin-vscode/issues/218)
- [Data Mapper - Add support to have types from imported packages as inputs and output](https://github.com/wso2/ballerina-plugin-vscode/issues/219)
- [Data Mapper - Add support for mapping with query expressions for primitive type arrays](https://github.com/wso2/ballerina-plugin-vscode/issues/232)
- [Data Mapper - Automatically show the data mapper config panel if the input or output types are not supported](https://github.com/wso2/ballerina-plugin-vscode/issues/244)

### **Fixed**

- [Data Mapper - Failed to create mapping for a port that is already mapped with multiple ports](https://github.com/wso2/ballerina-plugin-vscode/issues/230)
- [Data Mapper - output type name is misaligned when the output node is collapsed](https://github.com/wso2/ballerina-plugin-vscode/issues/235)
- [Data Mapper - incorrect source is generated when map root of the input record within query expression](https://github.com/wso2/ballerina-plugin-vscode/issues/237)
- [Data Mapper - UI shows a valid transform function as invalid](https://github.com/wso2/ballerina-plugin-vscode/issues/239)
- [Data Mapper - Links are not getting rendered for multi input mappings contains root level references](https://github.com/wso2/ballerina-plugin-vscode/issues/240)
- [Data Mapper - Generates invalid source when there is an invalid expression body](https://github.com/wso2/ballerina-plugin-vscode/issues/242)
- [Oops embarassing error when trying to edit a ModuleVarDecl without initialization](https://github.com/wso2/ballerina-plugin-vscode/issues/285)
- [Data Mapper - Output type disappears when creating data mapping function](https://github.com/wso2/ballerina-plugin-vscode/issues/293)
- [Data Mapper - Data Mapper puts auto-gen input param name as Type Name](https://github.com/wso2/ballerina-plugin-vscode/issues/329)

## **3.3.3**

### **Fixed**

- Diagrams not loading with VS Code v1.73 issue

## **3.3.2**

### **Improved**

- The low-code diagram editor

## **3.3.1**

### **Fixed**

- Try it button not working for services with comments issue

### **Improved**

- Improved record editor 
    - Provides a better editing experience with suggestions

## **3.3.0**

For more information, see the [release note](https://github.com/wso2/ballerina-plugin-vscode/blob/main/docs/release-notes/3.3.0-release-note.md).

### Added

- Visual Data Mapper 
    - Helps you write and visualize data transformations easily
- GraphQL Tryit 
    - Facilitates  trying out the GraphQL services with the integrated client
- Project Design View (Experimental) 
    - Allows you to visualize service interactions in your project

## **3.2.0**

### Improved

- A new performance analyzer is introduced. 
    - This will help users to identify the performance of the multiple execution paths of the code.

## **3.1.0**

### Added

- [Ballerina Notebook](https://github.com/wso2/ballerina-plugin-vscode/issues/183)

### Improved

- The low-code diagram editor - a new statement editor is introduced

    - The statement-editor allows users to easily discover Ballerina libraries and use predefined expression templates along with the context based suggestions to build statements even without having a prior knowledge on Ballerina syntaxes.

### Fixed

- Swagger client send an invalid Content type header

## **3.0.2**

### Improved

- The low-code diagram editor

### Fixed

- [Swagger View](https://github.com/wso2/ballerina-plugin-vscode/issues/197)

## **3.0.1**

### Added

- [A palette command that creates the distribution format of the Ballerina package](https://github.com/wso2/ballerina-plugin-vscode/issues/180)

### Improved

- [The low-code diagram editor](https://github.com/wso2/ballerina-plugin-vscode/issues/186)
- [Executor options](https://github.com/wso2/ballerina-plugin-vscode/issues/168)

### Fixed

- Ballerina syntax highlighting
    - [#170](https://github.com/wso2/ballerina-plugin-vscode/issues/170) 
    - [#184](https://github.com/wso2/ballerina-plugin-vscode/issues/184) 
    - [#185](https://github.com/wso2/ballerina-plugin-vscode/issues/185) 
    - [#188](https://github.com/wso2/ballerina-plugin-vscode/issues/188) 
    - [#190](https://github.com/wso2/ballerina-plugin-vscode/issues/190) 
    - [#191](https://github.com/wso2/ballerina-plugin-vscode/issues/191)
- [Diagram editor reflection on paste, undo, redo, etc. operations](https://github.com/wso2/ballerina-plugin-vscode/issues/151)
- [Choreo login error at startup](https://github.com/wso2/ballerina-plugin-vscode/issues/189)

## **3.0.0**

### Added

- [The `Ballerina Low-Code` activity](https://github.com/wso2/ballerina-plugin-vscode/issues/118)
- [WSO2 Choreo](https://wso2.com/choreo/) integration
- Graphical editing capability
- The `Diagram Explorer` view
- [The Ballerina testing activity](https://github.com/wso2/ballerina-plugin-vscode/issues/119) 
- [The readonly editor for Ballerina library source](https://github.com/wso2/ballerina-plugin-vscode/issues/97)
- [Ballerina semantic highlighting support](https://github.com/wso2/ballerina-plugin-vscode/issues/105)
- [The Swagger try out view](https://github.com/wso2/ballerina-plugin-vscode/issues/130)
- The Ballerina configurable editor
- AI driven real-time performance forecasting

### Improved

- [Dynamic Language Server capability registration](https://github.com/wso2/ballerina-plugin-vscode/issues/91)
- [The Language Server client version](https://github.com/wso2/ballerina-plugin-vscode/issues/109)
- Diagram and source parallel editing capability

### Fixed

- Ballerina syntax highlighting
    - [#120](https://github.com/wso2/ballerina-plugin-vscode/issues/120) 
    - [#121](https://github.com/wso2/ballerina-plugin-vscode/issues/121) 
    - [#122](https://github.com/wso2/ballerina-plugin-vscode/issues/122) 
    - [#123](https://github.com/wso2/ballerina-plugin-vscode/issues/123) 
    - [#126](https://github.com/wso2/ballerina-plugin-vscode/issues/126) 
    - [#128](https://github.com/wso2/ballerina-plugin-vscode/issues/128) 
    - [#129](https://github.com/wso2/ballerina-plugin-vscode/issues/129)

## **2.1.1**

### Improved

- [Ballerina syntax highlighting via TextMate grammar](https://github.com/wso2/ballerina-plugin-vscode/issues/105)

### Fixed

- [Language Server's extended API compatibility with previous Ballerina runtimes#108](https://github.com/wso2/ballerina-plugin-vscode/issues/108)
- [Language Server client deactivation](https://github.com/wso2/ballerina-plugin-vscode/issues/110)

## **2.1.0**

### Added

- [A palette command that converts a JSON to a Ballerina record](https://github.com/wso2/ballerina-plugin-vscode/issues/94)

### Improved

- [The *vscode-languageclient* and other dependency versions](https://github.com/wso2/ballerina-plugin-vscode/issues/43)

### Fixed

- [Positioning on the examples view](https://github.com/wso2/ballerina-plugin-vscode/issues/87)

## **2.0.0**

- Initial release
