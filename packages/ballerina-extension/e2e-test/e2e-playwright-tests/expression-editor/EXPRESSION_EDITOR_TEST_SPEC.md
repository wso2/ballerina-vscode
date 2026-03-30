# Expression Editor - Test Specification

## Application Overview

The Expression Editor feature in WSO2 Integrator: BI allows users to write and edit Ballerina expressions within variable declarations and other form fields. The Expression Editor provides intelligent autocomplete suggestions, real-time diagnostics, function signature help, variable references, configurable variable references, and record construct views. The editor is accessible from variable declaration forms in flow diagrams and provides a helper panel with categorized suggestions (Create Value, Inputs, Variables, Configurables, Functions).

## UI Elements Identified

### Buttons and Actions
- **Open Helper Panel** button (icon: 📋) - opens/closes helper panel with suggestions
- **Close Helper Panel** button (icon: ✕) - closes the helper panel
- **Expand Editor** button (icon: ⛶) - expands expression editor to full screen/modal
- **Save** button (text: "Save") - saves the expression
- **Type selector** button (icon: 🔍) - opens type browser/helper panel

### Form Fields
- **Expression** textbox (active/focusable)
  - Description: "Initialize with value."
  - Supports autocomplete
  - Shows diagnostics
  - Has helper panel integration
  - Can be expanded to full editor

### Helper Panel Sections
- **Create Value** section (icon: 📝)
  - Provides value creation helpers
- **Inputs** section (icon: 📷)
  - Shows available input parameters
- **Variables** section (icon: 🔊)
  - Lists declared variables
- **Configurables** section (icon: ⚙️)
  - Shows configurable variables
- **Functions** section (icon: 📃)
  - Lists available functions

### Type Helper Panel
- **Type browser** panel (appears when Type field is focused)
- **Primitive Types** section:
  - string, int, float, decimal, boolean, (), byte
- **Data Types** section:
  - json, xml, anydata
- **Structural Types** section:
  - byte[], map<json>, map<string>, json[], string[]
- **Error Types** section:
  - error
- **Behaviour Types** section:
  - function, future, typedesc, handle, stream
- **Other Types** section:
  - any, readonly
- **Used Variable Types** section:
  - Lists types used in the current context

### Autocomplete Features
- **Completion suggestions** - appears as user types
- **Completion list** - dropdown with suggestions
- **Trigger characters** - characters that trigger autocomplete (e.g., `.`, `(`, `[`)

### Diagnostics
- **Error indicators** - shows syntax/semantic errors
- **Warning indicators** - shows warnings
- **Diagnostic messages** - inline error/warning text

### Signature Help
- **Function signature** - shows function parameters and return types
- **Parameter hints** - highlights current parameter
- **Documentation** - shows function documentation

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="expression-editor"`
2. `data-testid="expression-textbox"`
3. `data-testid="open-helper-panel-button"`
4. `data-testid="close-helper-panel-button"`
5. `data-testid="expand-editor-button"`
6. `data-testid="helper-panel"`
7. `data-testid="helper-panel-create-value"`
8. `data-testid="helper-panel-inputs"`
9. `data-testid="helper-panel-variables"`
10. `data-testid="helper-panel-configurables"`
11. `data-testid="helper-panel-functions"`
12. `data-testid="autocomplete-suggestions"`
13. `data-testid="completion-item-[ItemName]"`
14. `data-testid="expression-diagnostics"`
15. `data-testid="signature-help"`
16. `data-testid="type-helper-panel"`

## Test Scenarios

### 1. Type basic expression (Description: Enter simple expression value)

**Steps:**
1. Navigate to a flow diagram
2. Add a "Declare Variable" node to the diagram
3. Set the variable name (e.g., "var1")
4. Set the variable type (e.g., "string")
5. Click on the Expression field
6. Verify the Expression Editor opens
7. Type a simple expression value (e.g., `"Hello"`)
8. Verify the expression is displayed in the textbox
9. Verify the expression value is correctly formatted
10. **Verify the source generated:**
    - Verify the expression is correctly added to the variable declaration in source
    - Verify the source code syntax is valid
11. **Verify the diagram:**
    - Verify the variable node shows the expression in the diagram
    - Verify the diagram correctly represents the expression

---

### 2. Trigger autocomplete (Description: Type and view suggestions)

**Steps:**
1. Open Expression Editor in a variable declaration form
2. Click on the Expression textbox to focus it
3. Type a character (e.g., `k`)
4. Verify autocomplete suggestions appear
5. Verify the suggestions list is displayed
6. Verify suggestions are relevant to the typed character
7. Continue typing (e.g., `ka`)
8. Verify suggestions are filtered based on input
9. Verify trigger characters (e.g., `.`, `(`, `[`) trigger autocomplete
10. Type a trigger character (e.g., `.`)
11. Verify autocomplete suggestions appear after the trigger character
12. **Verify the source generated:**
    - Verify autocomplete suggestions match available symbols in source
    - Verify the source context is correctly analyzed
13. **Verify the diagram:**
    - Verify autocomplete works correctly in the diagram context

---

### 3. Select completion item (Description: Choose from suggestions)

**Steps:**
1. Open Expression Editor
2. Type text to trigger autocomplete (e.g., `kafka`)
3. Verify autocomplete suggestions are displayed
4. Use arrow keys to navigate through suggestions
5. Verify the selected suggestion is highlighted
6. Press Enter or click on a suggestion
7. Verify the selected completion item is inserted into the expression
8. Verify the cursor position is updated correctly
9. Verify any required imports are added (if applicable)
10. Verify the expression is valid after insertion
11. **Verify the source generated:**
    - Verify the completion item is correctly inserted in source
    - Verify imports are added if needed
    - Verify source syntax is valid
12. **Verify the diagram:**
    - Verify the expression is correctly represented in the diagram

---

### 4. View expression diagnostics (Description: See error on invalid expression)

**Steps:**
1. Open Expression Editor
2. Type a valid expression (e.g., `"Hello"`)
3. Verify no diagnostics are shown
4. Type an invalid expression (e.g., `invalidSyntax{`)
5. Verify error diagnostics appear
6. Verify error indicator is displayed (e.g., red underline, error icon)
7. Verify error message is shown
8. Hover over the error indicator (if applicable)
9. Verify detailed error message is displayed
10. Fix the expression to make it valid
11. Verify error diagnostics disappear
12. Type an expression with a warning (e.g., deprecated function)
13. Verify warning diagnostics appear
14. Verify warning indicator is displayed
15. **Verify the source generated:**
    - Verify diagnostics match source code errors
    - Verify error locations are correctly identified
    - Verify source validation works correctly
16. **Verify the diagram:**
    - Verify diagnostics are reflected in the diagram
    - Verify invalid expressions are marked in the diagram

---

### 5. Use function in expression (Description: Call function from expression)

**Steps:**
1. Open Expression Editor
2. Type a function name (e.g., `string:length`)
3. Verify autocomplete suggests the function
4. Select the function from suggestions
5. Type opening parenthesis `(`
6. Verify function signature help appears
7. Verify parameter hints are displayed
8. Type function arguments (e.g., `"test"`)
9. Verify the function call is correctly formatted
10. Complete the function call with closing parenthesis `)`
11. Verify the expression is valid
12. Verify the function is correctly called
13. **Verify the source generated:**
    - Verify the function call is correctly generated in source
    - Verify function imports are added if needed
    - Verify source syntax is valid
14. **Verify the diagram:**
    - Verify the function call is correctly represented in the diagram

---

### 6. Use variable reference (Description: Reference declared variable)

**Steps:**
1. Open Expression Editor
2. Verify "Variables" section is available in helper panel
3. Click on "Variables" section in helper panel
4. Verify declared variables are listed
5. Click on a variable from the list (or type the variable name)
6. Verify the variable reference is inserted into the expression
7. Type a variable name directly (e.g., `var1`)
8. Verify autocomplete suggests the variable
9. Select the variable from autocomplete
10. Verify the variable reference is correctly inserted
11. Verify the variable reference is valid
12. Use the variable in an expression (e.g., `var1 + " suffix"`)
13. Verify the expression with variable reference is valid
14. **Verify the source generated:**
    - Verify variable reference is correctly generated in source
    - Verify variable scope is correctly handled
    - Verify source syntax is valid
15. **Verify the diagram:**
    - Verify variable reference is correctly represented in the diagram

---

### 7. Use config variable reference (Description: Reference configurable variable)

**Steps:**
1. Open Expression Editor
2. Verify "Configurables" section is available in helper panel
3. Click on "Configurables" section in helper panel
4. Verify configurable variables are listed
5. Click on a configurable variable from the list (or type the variable name)
6. Verify the configurable variable reference is inserted into the expression
7. Type a configurable variable name directly (e.g., `config:apiKey`)
8. Verify autocomplete suggests the configurable variable
9. Select the configurable variable from autocomplete
10. Verify the configurable variable reference is correctly inserted
11. Verify the reference uses correct syntax (e.g., `config:variableName`)
12. Use the configurable variable in an expression
13. Verify the expression with configurable variable reference is valid
14. **Verify the source generated:**
    - Verify configurable variable reference is correctly generated in source
    - Verify config syntax is correct
    - Verify source syntax is valid
15. **Verify the diagram:**
    - Verify configurable variable reference is correctly represented in the diagram

---

### 8. Use record construct view (Description: Reference declared variable)

**Steps:**
1. Open Expression Editor
2. Verify "Create Value" section is available in helper panel
3. Click on "Create Value" section in helper panel
4. Verify record construction options are available
5. Select a record type to construct
6. Verify record construct template is inserted
7. Verify record fields are shown
8. Fill in record field values
9. Verify the record construct is correctly formatted
10. Type a record type name directly (e.g., `Person {`)
11. Verify autocomplete suggests record construction
12. Select record construction from autocomplete
13. Verify record construct syntax is inserted
14. Complete the record construct with field values
15. Verify the record construct expression is valid
16. **Verify the source generated:**
    - Verify record construct is correctly generated in source
    - Verify record type is correctly referenced
    - Verify source syntax is valid
17. **Verify the diagram:**
    - Verify record construct is correctly represented in the diagram

---

### 9. View signature help (Description: See function parameter hints)

**Steps:**
1. Open Expression Editor
2. Type a function name (e.g., `string:length`)
3. Type opening parenthesis `(`
4. Verify function signature help appears
5. Verify function name is displayed
6. Verify function parameters are listed
7. Verify parameter types are shown
8. Verify parameter names are shown
9. Verify return type is displayed
10. Verify current parameter is highlighted
11. Type first argument
12. Verify next parameter is highlighted
13. Continue typing arguments
14. Verify parameter hints update as you type
15. Verify function documentation is shown (if available)
16. Complete the function call
17. Verify signature help disappears when function call is complete
18. **Verify the source generated:**
    - Verify function signature matches source definition
    - Verify function call is correctly generated
    - Verify source syntax is valid
19. **Verify the diagram:**
    - Verify function signature help is contextually relevant to the diagram

---

### 10. Open Helper Panel (Description: Open helper panel with categorized suggestions)

**Steps:**
1. Open Expression Editor in a variable declaration form
2. Verify "Open Helper Panel" button is visible
3. Click on "Open Helper Panel" button
4. Verify helper panel opens
5. Verify helper panel displays sections: Create Value, Inputs, Variables, Configurables, Functions
6. Verify each section has an icon and label
7. Verify sections are expandable/collapsible
8. Verify helper panel is positioned correctly relative to Expression field
9. **Verify the source generated:**
    - Verify helper panel content matches available symbols in source context
    - Verify helper panel is contextually relevant
10. **Verify the diagram:**
    - Verify helper panel works correctly in diagram context

---

### 11. Close Helper Panel (Description: Close the helper panel)

**Steps:**
1. Open Expression Editor
2. Open Helper Panel
3. Verify helper panel is visible
4. Click on "Close Helper Panel" button
5. Verify helper panel closes
6. Verify helper panel is hidden
7. Verify Expression field remains focused
8. Reopen helper panel
9. Click outside the helper panel (if applicable)
10. Verify helper panel closes when clicking outside
11. **Verify the source generated:**
    - Verify closing helper panel doesn't affect expression
    - Verify source remains unchanged
12. **Verify the diagram:**
    - Verify closing helper panel doesn't affect diagram

---

### 12. Expand Editor (Description: Expand expression editor to full screen/modal)

**Steps:**
1. Open Expression Editor
2. Verify "Expand Editor" button is visible
3. Click on "Expand Editor" button
4. Verify expression editor expands to full screen/modal
5. Verify expanded editor shows Expression field
6. Verify expanded editor shows helper panel (if applicable)
7. Type expression in expanded editor
8. Verify expression is correctly entered
9. Close expanded editor (via close button or ESC key)
10. Verify expression is preserved when closing expanded editor
11. Verify expression is displayed in inline Expression field
12. **Verify the source generated:**
    - Verify expression from expanded editor is correctly generated in source
    - Verify source syntax is valid
13. **Verify the diagram:**
    - Verify expression from expanded editor is correctly represented in diagram

---

### 13. Use Create Value section - Create string value (Description: Use Create Value helper to create string value)

**Steps:**
1. Open Expression Editor
2. Open Helper Panel
3. Verify "Create Value" section is visible
4. Click on "Create Value" section to expand it
5. Verify "Create a string value" option is displayed
6. Click on "Create a string value" option
7. Verify string value template is inserted into expression (e.g., `""`)
8. Verify cursor is positioned inside the string quotes
9. Type a string value (e.g., `"Hello World"`)
10. Verify the string value is correctly formatted
11. Verify the expression is valid
12. **Verify the source generated:**
    - Verify string value is correctly generated in source
    - Verify string syntax is correct
    - Verify source syntax is valid
13. **Verify the diagram:**
    - Verify string value is correctly represented in diagram

---

### 14. Use Create Value section - Create record value (Description: Use Create Value helper to create record value)

**Steps:**
1. Open Expression Editor with a record type variable
2. Open Helper Panel
3. Click on "Create Value" section
4. Verify record construction options are available
5. Select record type to construct
6. Verify record construct template is inserted (e.g., `RecordType { }`)
7. Verify record fields are shown in helper or template
8. Fill in record field values
9. Verify the record construct is correctly formatted
10. Verify the expression is valid
11. **Verify the source generated:**
    - Verify record construct is correctly generated in source
    - Verify record type is correctly referenced
    - Verify all fields are correctly set
    - Verify source syntax is valid
12. **Verify the diagram:**
    - Verify record construct is correctly represented in diagram

---

### 15. Use Create Value section - Create array value (Description: Use Create Value helper to create array value)

**Steps:**
1. Open Expression Editor with an array type variable
2. Open Helper Panel
3. Click on "Create Value" section
4. Verify array construction options are available
5. Select array type to construct
6. Verify array construct template is inserted (e.g., `[ ]`)
7. Add array elements
8. Verify the array construct is correctly formatted
9. Verify the expression is valid
10. **Verify the source generated:**
    - Verify array construct is correctly generated in source
    - Verify array type is correctly referenced
    - Verify all elements are correctly set
    - Verify source syntax is valid
11. **Verify the diagram:**
    - Verify array construct is correctly represented in diagram

---

### 16. Use Inputs section (Description: Use Inputs helper to reference input parameters)

**Steps:**
1. Open Expression Editor in a function/flow with input parameters
2. Open Helper Panel
3. Verify "Inputs" section is visible
4. Click on "Inputs" section to expand it
5. Verify input parameters are listed
6. Verify each input shows parameter name and type
7. Click on an input parameter from the list
8. Verify the input parameter reference is inserted into expression
9. Type an input parameter name directly (e.g., `inputData`)
10. Verify autocomplete suggests the input parameter
11. Select the input parameter from autocomplete
12. Verify the input parameter reference is correctly inserted
13. Use the input parameter in an expression
14. Verify the expression with input parameter reference is valid
15. **Verify the source generated:**
    - Verify input parameter reference is correctly generated in source
    - Verify parameter scope is correctly handled
    - Verify source syntax is valid
16. **Verify the diagram:**
    - Verify input parameter reference is correctly represented in diagram

---

### 17. Use Variables section (Description: Use Variables helper to reference declared variables)

**Steps:**
1. Open Expression Editor in a flow with declared variables
2. Open Helper Panel
3. Verify "Variables" section is visible
4. Click on "Variables" section to expand it
5. Verify declared variables are listed
6. Verify each variable shows variable name and type
7. Click on a variable from the list
8. Verify the variable reference is inserted into expression
9. Type a variable name directly (e.g., `var1`)
10. Verify autocomplete suggests the variable
11. Select the variable from autocomplete
12. Verify the variable reference is correctly inserted
13. Use the variable in an expression (e.g., `var1 + " suffix"`)
14. Verify the expression with variable reference is valid
15. **Verify the source generated:**
    - Verify variable reference is correctly generated in source
    - Verify variable scope is correctly handled
    - Verify source syntax is valid
16. **Verify the diagram:**
    - Verify variable reference is correctly represented in diagram

---

### 18. Use Configurables section (Description: Use Configurables helper to reference configurable variables)

**Steps:**
1. Open Expression Editor in a project with configurable variables
2. Open Helper Panel
3. Verify "Configurables" section is visible
4. Click on "Configurables" section to expand it
5. Verify configurable variables are listed
6. Verify each configurable shows variable name and type
7. Click on a configurable variable from the list
8. Verify the configurable variable reference is inserted into expression
9. Verify the reference uses correct syntax (e.g., `config:variableName`)
10. Type a configurable variable name directly (e.g., `config:apiKey`)
11. Verify autocomplete suggests the configurable variable
12. Select the configurable variable from autocomplete
13. Verify the configurable variable reference is correctly inserted
14. Use the configurable variable in an expression
15. Verify the expression with configurable variable reference is valid
16. **Verify the source generated:**
    - Verify configurable variable reference is correctly generated in source
    - Verify config syntax is correct (e.g., `config:variableName`)
    - Verify source syntax is valid
17. **Verify the diagram:**
    - Verify configurable variable reference is correctly represented in diagram

---

### 19. Use Functions section (Description: Use Functions helper to reference available functions)

**Steps:**
1. Open Expression Editor
2. Open Helper Panel
3. Verify "Functions" section is visible
4. Click on "Functions" section to expand it
5. Verify available functions are listed
6. Verify functions are categorized (e.g., by module/namespace)
7. Verify each function shows function name, parameters, and return type
8. Click on a function from the list
9. Verify the function call template is inserted into expression
10. Verify function signature help appears
11. Fill in function parameters
12. Verify the function call is correctly formatted
13. Type a function name directly (e.g., `string:length`)
14. Verify autocomplete suggests the function
15. Select the function from autocomplete
16. Verify the function call template is inserted
17. Complete the function call with parameters
18. Verify the expression with function call is valid
19. **Verify the source generated:**
    - Verify function call is correctly generated in source
    - Verify function imports are added if needed
    - Verify function parameters are correctly set
    - Verify source syntax is valid
20. **Verify the diagram:**
    - Verify function call is correctly represented in diagram

---

### 20. Navigate helper panel sections (Description: Navigate between different helper panel sections)

**Steps:**
1. Open Expression Editor
2. Open Helper Panel
3. Verify all sections are visible: Create Value, Inputs, Variables, Configurables, Functions
4. Click on "Create Value" section
5. Verify "Create Value" section expands
6. Verify other sections remain visible
7. Click on "Inputs" section
8. Verify "Inputs" section expands
9. Verify "Create Value" section collapses (if only one section can be expanded at a time)
10. Click on "Variables" section
11. Verify "Variables" section expands
12. Continue navigating through all sections
13. Verify each section can be expanded and collapsed
14. Verify section content is correctly displayed when expanded
15. **Verify the source generated:**
    - Verify navigating sections doesn't affect expression
    - Verify source remains unchanged
16. **Verify the diagram:**
    - Verify navigating sections doesn't affect diagram

---

### 21. Insert from helper panel (Description: Insert suggestions from helper panel into expression)

**Steps:**
1. Open Expression Editor
2. Open Helper Panel
3. Navigate to a section (e.g., "Variables")
4. Expand the section
5. Click on an item from the section (e.g., a variable)
6. Verify the item is inserted into the expression at cursor position
7. Verify cursor position is updated after insertion
8. Navigate to another section (e.g., "Functions")
9. Expand the section
10. Click on a function from the section
11. Verify the function call template is inserted
12. Verify cursor is positioned appropriately for filling parameters
13. Insert multiple items from different sections
14. Verify all items are correctly inserted
15. Verify the expression is valid after all insertions
16. **Verify the source generated:**
    - Verify all inserted items are correctly generated in source
    - Verify source syntax is valid
    - Verify imports are added if needed
17. **Verify the diagram:**
    - Verify all inserted items are correctly represented in diagram

---

### 22. Type helper panel - Select primitive type (Description: Use type helper panel to select primitive type)

**Steps:**
1. Open variable declaration form
2. Click on Type field
3. Verify type helper panel appears
4. Verify "Primitive Types" section is visible
5. Verify primitive types are listed: string, int, float, decimal, boolean, (), byte
6. Click on "string" type
7. Verify "string" is selected and inserted into Type field
8. Verify type helper panel closes (or remains open for further selection)
9. Click on Type field again
10. Click on another primitive type (e.g., "int")
11. Verify the type is updated in Type field
12. **Verify the source generated:**
    - Verify selected type is correctly generated in source
    - Verify type syntax is correct
    - Verify source syntax is valid
13. **Verify the diagram:**
    - Verify selected type is correctly represented in diagram

---

### 23. Type helper panel - Select data type (Description: Use type helper panel to select data type)

**Steps:**
1. Open variable declaration form
2. Click on Type field
3. Verify type helper panel appears
4. Verify "Data Types" section is visible
5. Verify data types are listed: json, xml, anydata
6. Click on a data type (e.g., "json")
7. Verify the data type is selected and inserted into Type field
8. **Verify the source generated:**
    - Verify selected data type is correctly generated in source
    - Verify type syntax is correct
    - Verify source syntax is valid
9. **Verify the diagram:**
    - Verify selected data type is correctly represented in diagram

---

### 24. Type helper panel - Select structural type (Description: Use type helper panel to select structural type)

**Steps:**
1. Open variable declaration form
2. Click on Type field
3. Verify type helper panel appears
4. Verify "Structural Types" section is visible
5. Verify structural types are listed: byte[], map<json>, map<string>, json[], string[]
6. Click on a structural type (e.g., "string[]")
7. Verify the structural type is selected and inserted into Type field
8. **Verify the source generated:**
    - Verify selected structural type is correctly generated in source
    - Verify type syntax is correct
    - Verify source syntax is valid
9. **Verify the diagram:**
    - Verify selected structural type is correctly represented in diagram

---

### 25. Type helper panel - Select custom type (Description: Use type helper panel to select custom/used type)

**Steps:**
1. Open variable declaration form in a project with custom types
2. Click on Type field
3. Verify type helper panel appears
4. Verify "Used Variable Types" section is visible (if custom types exist)
5. Verify custom types are listed
6. Click on a custom type
7. Verify the custom type is selected and inserted into Type field
8. **Verify the source generated:**
    - Verify selected custom type is correctly generated in source
    - Verify type reference is correct
    - Verify source syntax is valid
9. **Verify the diagram:**
    - Verify selected custom type is correctly represented in diagram

---

## Notes

- The Expression Editor is integrated with the Ballerina Language Server for intelligent autocomplete and diagnostics
- Helper panel sections are contextually populated based on the current scope
- Autocomplete suggestions are filtered based on the current typing context
- Diagnostics are updated in real-time as the user types
- Function signature help appears automatically when typing function calls
- The Expression Editor supports both inline editing and expanded modal editing
- Type helper panel appears when focusing on Type fields, providing categorized type suggestions

