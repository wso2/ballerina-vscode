# Function - Test Specification

## Application Overview

The Function feature in WSO2 Integrator: BI allows users to create reusable custom flows that can be used within integrations. Functions can have parameters, return types, and body logic defined through a visual flow designer.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Function** option in Artifacts menu (under "Other Artifacts" section)
- **Create** button (in function creation form)
- **Cancel** button (in function creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing function
- **Delete** button (icon: 🗑️) - for deleting function
- **Add Parameter** button (text: "Add Parameter", icon: ➕) - for adding function parameters
- **Add** button (in parameter dialog)
- **Delete** button (icon: 🗑️) - for deleting parameters

### Form Fields
- **Name** textbox (required, default: "function1")
  - Description: Function name
- **Description** textbox (optional)
  - Has expand editor button
- **Parameters** section
  - Shows list of parameters
  - Each parameter shows: Type, Name, Description
  - **Add Parameter** button opens a dialog with:
    - **Type** (required) - with type picker button
    - **Name** (required) - textbox
    - **Description** (optional) - textbox with expand editor
- **Return Type** (with type picker button)
  - Description: Return type of the function
- **Return Type Description** textbox (optional)
  - Has expand editor button

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Function** breadcrumb
- **Function Designer** breadcrumb

### Tree View Elements
- **Functions** section
- **Function** tree item (function name)
- **Flow/Sequence** tabs in function designer
- **Start** node in flow diagram

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="function-option"`
2. `data-testid="function-name-input"`
3. `data-testid="function-description-input"`
4. `data-testid="add-parameter-button"`
5. `data-testid="parameter-type-picker"`
6. `data-testid="parameter-name-input"`
7. `data-testid="parameter-description-input"`
8. `data-testid="return-type-picker"`
9. `data-testid="return-type-description-input"`
10. `data-testid="create-function-button"`
11. `data-testid="configure-function-button"`
12. `data-testid="delete-function-button"`
13. `data-testid="delete-parameter-button"`
14. `data-testid="function-flow-tab"`
15. `data-testid="function-sequence-tab"`

## Test Scenarios

### 1. Create Function (Description: Creates function with name)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Other Artifacts" section, click on "Function" option
6. Verify the "Create Function" form is displayed
7. Verify "Name" field defaults to "function1"
8. Enter a custom function name (e.g., "calculateTotal") in the "Name" field
9. (Optional) Enter a description in the "Description" field
10. Click on the "Create" button
11. Verify the Function is created and the function designer view is displayed
12. Verify the function name is displayed in the designer
13. Verify the "Flow" and "Sequence" tabs are available
14. Verify the tree view shows the function name under "Functions" section

**Expected Result:** A Function is successfully created with the specified name and the function designer view is displayed.

### 2. Edit Function return type (Description: Modifies return type to string)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Click on the "Configure" button (⚙️ icon) next to the function name
3. Verify the "Configure Function" form is displayed
4. Locate the "Return Type" field and click on the type picker button
5. Select "string" from the type browser
6. (Optional) Enter a description in the "Return Type Description" field
7. Click on the "Create" (or "Save") button
8. Verify the function designer view reflects the updated return type

**Expected Result:** The Function return type is successfully updated to "string".

### 3. Add function parameter (Description: Add input parameter with type)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Click on the "Configure" button (⚙️ icon) next to the function name
3. Verify the "Configure Function" form is displayed
4. Locate the "Parameters" section and click on the "Add Parameter" button
5. Verify the parameter dialog is displayed
6. Click on the "Type" type picker button
7. Select a type (e.g., "string") from the type browser
8. Enter a parameter name (e.g., "inputValue") in the "Name" field
9. (Optional) Enter a description in the "Description" field
10. Click on the "Add" button
11. Verify the parameter is added to the "Parameters" section
12. Click on the "Create" (or "Save") button
13. Verify the function designer view reflects the added parameter

**Expected Result:** A function parameter is successfully added with the specified type and name.

### 4. Edit function parameter (Description: Modify parameter type/name)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Click on the "Configure" button (⚙️ icon) next to the function name
3. Verify the "Configure Function" form is displayed
4. Locate an existing parameter in the "Parameters" section
5. Click on the parameter to edit (or click on an "Edit" button if available)
6. Modify the parameter type (e.g., change from "string" to "int")
7. Modify the parameter name (e.g., change from "inputValue" to "inputNumber")
8. (Optional) Modify the parameter description
9. Click on the "Add" (or "Save") button
10. Verify the parameter is updated in the "Parameters" section
11. Click on the "Create" (or "Save") button
12. Verify the function designer view reflects the updated parameter

**Expected Result:** The function parameter is successfully updated with the new type and name.

### 5. Delete function parameter (Description: Remove parameter)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Click on the "Configure" button (⚙️ icon) next to the function name
3. Verify the "Configure Function" form is displayed
4. Locate an existing parameter in the "Parameters" section
5. Click on the "Delete" button (🗑️ icon) next to the parameter
6. Confirm the deletion in the dialog (if any)
7. Verify the parameter is removed from the "Parameters" section
8. Click on the "Create" (or "Save") button
9. Verify the function designer view reflects the removed parameter

**Expected Result:** The function parameter is successfully deleted.

### 6. Add function body logic (Description: Add statements to function)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Verify the "Flow" tab is selected (or click on it)
3. Verify the flow diagram shows a "Start" node
4. Click on the "Start" node or an empty area in the flow diagram
5. Verify options to add nodes/statements are displayed (e.g., "Add Node", "Add Statement")
6. Select a node type (e.g., "Variable", "Assignment", "Return")
7. Configure the node properties (if any)
8. Verify the node is added to the flow diagram
9. Connect nodes if necessary (drag from one node to another)
10. Verify the function body logic is updated

**Expected Result:** Function body logic is successfully added to the function flow.

### 7. Delete Function (Description: Remove function and verify cleanup)

**Steps:**
1. Navigate to an existing Function in the function designer view
2. Click on the "Delete" button (🗑️ icon) next to the function name
3. Confirm the deletion in the dialog (if any)
4. Verify the Function is removed from the project tree
5. Verify the Function is removed from the "Functions" section
6. Verify the function designer view is closed or shows a different function

**Expected Result:** The Function is successfully deleted and removed from the project.

