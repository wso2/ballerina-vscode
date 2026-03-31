# Configuration - Test Specification

## Application Overview

The Configuration feature in WSO2 Integrator: BI allows users to manage configurable variables for Ballerina integrations. Users can create, edit, and delete configurable variables with names, types, default values, and documentation. The Configuration view displays variables organized by package/module and provides integration with Config.toml for runtime configuration values. Variables can be marked as required (without default values) and warnings are shown for missing required values.

## UI Elements Identified

### Buttons and Actions
- **Configure** button (text: "Configure", icon: ⚙️) - in BI editor toolbar
- **Add Config** button (text: "Add Config", icon: ➕) - in Configuration view
- **Save** button (text: "Save") - in configurable variable form
- **Close** button (icon: ✕) - in configurable variable form
- **Edit in Config.toml** button (text: "Edit in Config.toml", icon: 📝) - in Configuration view
- **Open Helper Panel** button (icon: 📋) - for Default Value field
- **Expand Editor** button (icon: ⛶) - for Default Value and Documentation fields
- **Delete** button/action - for deleting configurable variables

### Form Fields
- **Variable Name*** textbox (required)
  - Description: "Name of the variable"
  - Placeholder: (empty)
- **Variable Type*** textbox (required)
  - Description: "Type of the variable"
  - Placeholder: "var"
  - Has type selector/dropdown
- **Default Value** textbox (optional)
  - Description: "Default value of the variable."
  - Has helper panel and expand editor buttons
- **Documentation** textbox (optional)
  - Description: "Variable documentation in Markdown format"
  - Has expand editor button

### Navigation Elements
- **Breadcrumbs** showing: Overview > Configurable Variables
- **Package selection** - shows Integration package and Imported libraries
- **Search field** - with placeholder "Search Configurables"
- **Configuration view** - displays configurable variables organized by package

### Variable Display Elements
- **Variable list** - shows created configurable variables
- **Variable item** - displays variable name, type, and default value
- **Required warning** - indicator for variables without default values
- **Config.toml values** - displays runtime configuration values

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="configure-button"`
2. `data-testid="configuration-view"`
3. `data-testid="add-config-button"`
4. `data-testid="variable-name-input"`
5. `data-testid="variable-type-input"`
6. `data-testid="default-value-input"`
7. `data-testid="documentation-input"`
8. `data-testid="save-config-button"`
9. `data-testid="edit-in-config-toml-button"`
10. `data-testid="package-selector"`
11. `data-testid="search-configurables-input"`
12. `data-testid="config-variable-item-[VariableName]"`
13. `data-testid="required-warning-indicator"`
14. `data-testid="delete-variable-button"`

## Test Scenarios

### 1. Navigate to Configuration (Description: Open configuration view)

**Steps:**
1. Navigate to WSO2 Integrator: BI view
2. Verify the "Configure" button is visible in the editor toolbar
3. Click on the "Configure" button
4. Verify the Configuration view opens
5. Verify the breadcrumbs show "Overview > Configurable Variables"
6. Verify the heading "Configurable Variables" is displayed
7. Verify the description "View and manage configurable variables" is shown
8. Verify the "Edit in Config.toml" button is visible
9. Verify the search field is visible with placeholder "Search Configurables"
10. Verify the package selection shows "Integration" and "Imported libraries"
11. **Verify the source generated:**
    - Verify the Configuration view correctly loads configurable variables from source
    - Verify the source code structure is correctly represented
12. **Verify the diagram:**
    - Verify the Configuration view is accessible from the diagram
    - Verify navigation between Configuration and diagram works correctly

---

### 2. Verify selected package (Description: Check Integration package selected)

**Steps:**
1. Navigate to Configuration view
2. Verify the package selection section is visible
3. Verify "Integration" package is displayed
4. Verify "Integration" package is selected/active (if applicable)
5. Verify "Imported libraries" section is visible
6. Verify imported libraries are listed (e.g., ballerinax/asb, ballerina/http, ballerina/log)
7. Click on "Integration" package (if clickable)
8. Verify the Integration package is selected
9. Verify configurable variables for Integration package are displayed
10. **Verify the source generated:**
    - Verify the selected package matches the current project package
    - Verify the package selection correctly filters variables
11. **Verify the diagram:**
    - Verify the package selection reflects the diagram's package structure
    - Verify the diagram shows the correct package context

---

### 3. Create configurable variable (Description: Add variable with name and type)

**Steps:**
1. Navigate to Configuration view
2. Verify the "Add Config" button is visible
3. Click on the "Add Config" button
4. Verify the "Add Configurable Variable" form is displayed
5. Verify the form shows "Create a configurable variable" description
6. Enter a variable name in the "Variable Name*" field (e.g., "apiKey")
7. Enter a variable type in the "Variable Type*" field (e.g., "string")
8. Verify both required fields are filled
9. Click on the "Save" button
10. Verify the variable is created
11. Verify the variable appears in the variable list
12. Verify the form closes after saving
13. **Verify the source generated:**
    - Verify the configurable variable is added to the source code (config.bal)
    - Verify the source code syntax is correct
    - Verify the variable declaration matches the entered name and type
14. **Verify the diagram:**
    - Verify the new variable is reflected in the Configuration view
    - Verify the diagram shows the configuration update (if applicable)

---

### 4. Set default value (Description: Set default for configurable)

**Steps:**
1. Navigate to Configuration view
2. Create a new configurable variable (from previous scenario) or edit an existing one
3. Verify the "Default Value" field is visible in the form
4. Enter a default value in the "Default Value" field (e.g., "default-api-key")
5. Verify the default value is entered correctly
6. Click on the "Save" button
7. Verify the variable is saved with the default value
8. Verify the variable displays the default value in the variable list
9. Verify the default value is shown in the variable item (e.g., "Defaults to: default-api-key")
10. **Verify the source generated:**
    - Verify the default value is correctly added to the source code
    - Verify the source code shows the default value assignment
11. **Verify the diagram:**
    - Verify the default value is displayed in the Configuration view
    - Verify the diagram reflects the default value configuration

---

### 5. Add documentation (Description: Add description to variable)

**Steps:**
1. Navigate to Configuration view
2. Create a new configurable variable or edit an existing one
3. Verify the "Documentation" field is visible in the form
4. Enter documentation text in the "Documentation" field (e.g., "API key for authentication")
5. Verify the documentation supports Markdown format
6. Verify the "Expand Editor" button is available for the Documentation field
7. Click on the "Save" button
8. Verify the variable is saved with the documentation
9. Verify the documentation is associated with the variable
10. **Verify the source generated:**
    - Verify the documentation is added to the source code as a comment
    - Verify the documentation comment is correctly formatted
11. **Verify the diagram:**
    - Verify the documentation is accessible in the Configuration view
    - Verify the diagram shows documentation tooltips (if applicable)

---

### 6. Edit configurable variable (Description: Modify existing variable)

**Steps:**
1. Navigate to Configuration view
2. Verify at least one configurable variable exists in the list
3. Click on an existing variable item or edit button
4. Verify the edit form opens with the variable's current values
5. Verify the Variable Name field shows the current name
6. Verify the Variable Type field shows the current type
7. Verify the Default Value field shows the current default (if any)
8. Verify the Documentation field shows the current documentation (if any)
9. Modify one or more fields (e.g., change the type or default value)
10. Click on the "Save" button
11. Verify the variable is updated
12. Verify the changes are reflected in the variable list
13. **Verify the source generated:**
    - Verify the source code is updated with the modified values
    - Verify the variable declaration reflects the changes
14. **Verify the diagram:**
    - Verify the updated variable is shown in the Configuration view
    - Verify the diagram reflects the variable changes

---

### 7. Update default value (Description: Change default value)

**Steps:**
1. Navigate to Configuration view
2. Edit an existing configurable variable that has a default value
3. Verify the current default value is displayed in the "Default Value" field
4. Modify the default value (e.g., change from "old-value" to "new-value")
5. Verify the new default value is entered
6. Click on the "Save" button
7. Verify the variable is updated with the new default value
8. Verify the variable list shows the updated default value
9. Verify the old default value is replaced
10. **Verify the source generated:**
    - Verify the source code shows the updated default value
    - Verify the default value assignment is correctly updated
11. **Verify the diagram:**
    - Verify the updated default value is displayed in the Configuration view
    - Verify the diagram reflects the default value change

---

### 8. Add Config.toml value (Description: Set runtime config value)

**Steps:**
1. Navigate to Configuration view
2. Verify a configurable variable exists (with or without default value)
3. Click on the "Edit in Config.toml" button
4. Verify the Config.toml file opens in the editor
5. Verify the Config.toml file structure is correct
6. Add a runtime configuration value for the variable in Config.toml
7. Save the Config.toml file
8. Return to the Configuration view
9. Verify the Config.toml value is displayed for the variable
10. Verify the runtime value overrides the default value (if applicable)
11. **Verify the source generated:**
    - Verify the Config.toml file contains the correct configuration entry
    - Verify the configuration syntax is correct
12. **Verify the diagram:**
    - Verify the Config.toml value is shown in the Configuration view
    - Verify the diagram reflects the runtime configuration

---

### 9. Verify variable display (Description: Check values shown correctly)

**Steps:**
1. Navigate to Configuration view
2. Create or ensure multiple configurable variables exist with different configurations:
   - Variable with default value
   - Variable without default value
   - Variable with Config.toml value
   - Variable with documentation
3. Verify all variables are displayed in the variable list
4. Verify each variable shows:
   - Variable name
   - Variable type
   - Default value (if set)
   - Config.toml value (if set)
5. Verify variables are organized by package/module
6. Verify the display format is consistent
7. Verify required/optional indicators are shown correctly
8. **Verify the source generated:**
    - Verify the displayed values match the source code
    - Verify all variables are correctly represented
9. **Verify the diagram:**
    - Verify the Configuration view correctly displays all variables
    - Verify the diagram reflects the variable display structure

---

### 10. Create variable without default (Description: Add required variable)

**Steps:**
1. Navigate to Configuration view
2. Click on the "Add Config" button
3. Enter a variable name in the "Variable Name*" field (e.g., "requiredKey")
4. Enter a variable type in the "Variable Type*" field (e.g., "string")
5. Leave the "Default Value" field empty
6. Click on the "Save" button
7. Verify the variable is created without a default value
8. Verify the variable appears in the variable list
9. Verify the variable is marked as required (no default value)
10. **Verify the source generated:**
    - Verify the source code shows the variable without a default value
    - Verify the variable is marked as required in the source
11. **Verify the diagram:**
    - Verify the variable is shown without a default value indicator
    - Verify the diagram reflects the required variable status

---

### 11. Verify required warning (Description: Check warning for missing value)

**Steps:**
1. Navigate to Configuration view
2. Create a configurable variable without a default value (from previous scenario)
3. Verify the variable is displayed in the list
4. Verify a warning indicator is shown for the variable
5. Verify the warning indicates that a value is required at runtime
6. Verify the warning is visible and clear
7. Verify the warning persists until a default value or Config.toml value is provided
8. Add a default value or Config.toml value
9. Verify the warning disappears
10. **Verify the source generated:**
    - Verify the source code correctly identifies required variables
    - Verify the source reflects the warning state
11. **Verify the diagram:**
    - Verify the warning is correctly displayed in the Configuration view
    - Verify the diagram shows the required variable warning

---

### 12. Delete configurable variable (Description: Remove variable)

**Steps:**
1. Navigate to Configuration view
2. Verify at least one configurable variable exists
3. Identify a variable to delete
4. Click on the delete button/action for the variable (context menu or delete icon)
5. Verify a confirmation dialog is displayed (if applicable)
6. Confirm the deletion
7. Verify the variable is removed from the variable list
8. Verify the variable is deleted from the source code
9. Verify the Configuration view updates correctly
10. **Verify the source generated:**
    - Verify the variable declaration is removed from the source code
    - Verify the source code is correctly updated
11. **Verify the diagram:**
    - Verify the deleted variable is removed from the Configuration view
    - Verify the diagram reflects the variable deletion

---

### 13. Edit Config.toml value (Description: Change should be reflected in the config UI)

**Steps:**
1. Navigate to Configuration view
2. Verify a configurable variable exists with a Config.toml value
3. Click on the "Edit in Config.toml" button
4. Verify the Config.toml file opens
5. Locate the configuration entry for the variable
6. Modify the value in Config.toml (e.g., change from "old-value" to "new-value")
7. Save the Config.toml file
8. Return to the Configuration view
9. Verify the updated Config.toml value is displayed for the variable
10. Verify the Configuration UI reflects the change immediately
11. Verify the old value is replaced with the new value
12. **Verify the source generated:**
    - Verify the Config.toml file contains the updated value
    - Verify the configuration syntax remains correct
13. **Verify the diagram:**
    - Verify the Configuration view shows the updated Config.toml value
    - Verify the diagram reflects the configuration change

---

## Notes

- Configurable variables are defined in `config.bal` file
- Runtime configuration values are set in `Config.toml` file
- Variables without default values are required and show warnings
- The Configuration view organizes variables by package/module
- Default values can be overridden by Config.toml values
- Documentation supports Markdown format
- The "Edit in Config.toml" button opens the Config.toml file for direct editing
- Variables can be searched using the search field
- Package selection allows filtering variables by package/module

