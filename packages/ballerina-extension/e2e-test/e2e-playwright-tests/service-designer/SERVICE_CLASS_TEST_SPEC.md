# Service Class - Test Specification

## Application Overview

The Service Class feature in WSO2 Integrator: BI allows users to create, edit, and manage service classes with resource methods, remote methods, and instance variables. Service Classes can be created through the Type Editor and provide a Service Class Designer view for managing methods, variables, and their configurations. The Service Class Designer generates Ballerina source code automatically and provides navigation to flow diagram views.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Type** option in Artifacts menu (under "Other Artifacts" section)
- **Add Type** button (text: "Add Type", icon: ➕) - in Type Editor view
- **Create from scratch** button - in type creation dialog
- **Save** button - in type creation form
- **Close** button (icon: ✕) - to close type creation dialog
- **Add Method** button (icon: ➕) - for adding Resource/Remote methods
- **Add Variable** button (icon: ➕) - for adding instance variables
- **Edit Method** button (icon: ✏️) - for editing methods
- **Delete Method** button (icon: 🗑️) - for deleting methods
- **Edit Variable** button (icon: ✏️) - for editing variables
- **Delete Variable** button (icon: 🗑️) - for deleting variables
- **Add Parameter** button (icon: ➕) - for adding method parameters
- **Delete Parameter** button (icon: 🗑️) - for deleting method parameters
- **Configure** button (icon: ⚙️) - for configuring service class
- **Open Flow** button - for navigating to flow diagram view

### Form Fields
- **Kind** combobox (required)
  - Options: Record, Enum, Service Class, Union, Array
  - Default: Record
- **Name** textbox (required)
  - Default: "MyType"
- **Resource Methods** section (for Service Class)
  - Method name textbox
  - Method return type picker
  - Method parameters list
  - Add/Edit/Delete method buttons
- **Remote Methods** section (for Service Class)
  - Method name textbox
  - Method return type picker
  - Method parameters list
  - Add/Edit/Delete method buttons
- **Variables** section (for Service Class)
  - Variable name textbox
  - Variable type picker
  - Default value textbox (optional)
  - Add/Edit/Delete variable buttons
- **Method Form** fields:
  - **Method Name** textbox (required)
  - **Method Type** selector (Resource/Remote)
  - **Return Type** picker (optional)
  - **Parameters** section
    - Parameter name textbox
    - Parameter type picker
    - Default value textbox (optional)
    - Is Required checkbox
- **Variable Form** fields:
  - **Variable Name** textbox (required)
  - **Type** picker (required)
  - **Default Value** textbox (optional)

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Types** breadcrumb
- **Service Class Designer** view
- **Flow Diagram** view (accessible from methods)

### Service Class Designer View Elements
- **Resource Methods** section
- **Remote Methods** section
- **Variables** section
- Method cards with method name, return type, parameters
- Variable cards with variable name, type, default value
- Navigation to flow diagram from method cards

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="service-class-kind-option"`
2. `data-testid="service-class-name-input"`
3. `data-testid="add-resource-method-button"`
4. `data-testid="add-remote-method-button"`
5. `data-testid="add-variable-button"`
6. `data-testid="method-name-input"`
7. `data-testid="method-type-selector"`
8. `data-testid="method-return-type-picker"`
9. `data-testid="add-parameter-button"`
10. `data-testid="parameter-name-input"`
11. `data-testid="parameter-type-picker"`
12. `data-testid="parameter-default-value-input"`
13. `data-testid="parameter-required-checkbox"`
14. `data-testid="delete-parameter-button"`
15. `data-testid="variable-name-input"`
16. `data-testid="variable-type-picker"`
17. `data-testid="variable-default-value-input"`
18. `data-testid="edit-method-button"`
19. `data-testid="delete-method-button"`
20. `data-testid="edit-variable-button"`
21. `data-testid="delete-variable-button"`
22. `data-testid="save-method-button"`
23. `data-testid="save-variable-button"`
24. `data-testid="open-flow-button"`
25. `data-testid="service-class-configure-button"`

## Test Scenarios

### 1. Navigate to Type Editor (Description: Open type editor for service class)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Other Artifacts" section, click on "Type" option
6. Verify the Type Editor view is displayed
7. Verify the breadcrumb shows "Overview > Artifacts > Types"
8. Verify the "Add Type" button is visible
9. Verify the type diagram visualization area is displayed

**Expected Result:** Type Editor is successfully opened and ready for creating Service Class.

---

### 2. Create Service Class (Description: Create service class with name)

**Steps:**
1. Navigate to Type Editor
2. Click on the "Add Type" button
3. Verify the "New Type" dialog is displayed
4. Click on "Create from scratch" button
5. Verify the type creation form is displayed
6. Click on the "Kind" combobox
7. Select "Service Class" from the options
8. Verify the form updates to show "Resource Methods" section
9. Enter "UserService" in the "Name" textbox
10. Click on the "Save" button
11. Verify the Service Class is created
12. Verify the Service Class Designer view is displayed
13. Verify the Service Class name "UserService" is shown in the view
14. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - `service class UserService {`
      - `}`
15. **Verify the diagram:**
    - Verify the diagram shows entity node with `data-testid="entity-head-UserService"`
    - Verify the diagram visualization is updated with the new Service Class type

**Expected Result:** A Service Class "UserService" is successfully created, source code is generated correctly, and the type appears in the diagram.

---

### 3. Add Resource method (Description: Add resource function with return type)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate the "Resource Methods" section
4. Click on the "Add Method" button (➕ icon) in the Resource Methods section
5. Verify the "Add Method" form/panel is displayed
6. Verify "Resource" is selected as the method type (or select it if needed)
7. Enter "getUser" in the "Method Name" textbox
8. Click on the "Return Type" picker
9. Select "string" as the return type
10. Click on the "Save" button (or "Add" button)
11. Verify the method is added to the Resource Methods section
12. Verify the method card shows "getUser" with return type "string"
13. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - `resource function getUser() returns string;` (or similar resource method syntax)
14. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated Service Class with the method

**Expected Result:** A Resource method "getUser" with return type "string" is successfully added, source code includes the method definition, and the diagram is updated.

---

### 4. Add Remote method (Description: Add remote function with return type)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate the "Remote Methods" section
4. Click on the "Add Method" button (➕ icon) in the Remote Methods section
5. Verify the "Add Method" form/panel is displayed
6. Verify "Remote" is selected as the method type (or select it if needed)
7. Enter "updateUser" in the "Method Name" textbox
8. Click on the "Return Type" picker
9. Select "json" as the return type
10. Click on the "Save" button (or "Add" button)
11. Verify the method is added to the Remote Methods section
12. Verify the method card shows "updateUser" with return type "json"
13. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - `remote function updateUser() returns json;` (or similar remote method syntax)
14. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated Service Class with the method

**Expected Result:** A Remote method "updateUser" with return type "json" is successfully added, source code includes the method definition, and the diagram is updated.

---

### 5. Add instance variable (Description: Add field to service class)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate the "Variables" section
4. Click on the "Add Variable" button (➕ icon) in the Variables section
5. Verify the "Add Variable" form/panel is displayed
6. Enter "userCount" in the "Variable Name" textbox
7. Click on the "Type" picker
8. Select "int" as the variable type
9. (Optional) Enter "0" in the "Default Value" textbox
10. Click on the "Save" button (or "Add" button)
11. Verify the variable is added to the Variables section
12. Verify the variable card shows "userCount" with type "int"
13. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - `private int userCount = 0;` (or similar variable syntax with default value if provided)
14. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated Service Class with the variable

**Expected Result:** An instance variable "userCount" is successfully added, source code includes the variable definition, and the diagram is updated.

---

### 6. Rename Service Class (Description: Change service class name)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate the Service Class name or use the type menu to edit
4. Click on "Configure" button (⚙️ icon) or use type menu to edit
5. Verify the type editing form is displayed
6. Locate the "Name" textbox
7. Change the name from "UserService" to "CustomerService"
8. Click on the "Save" button
9. Verify the Service Class is renamed
10. Verify the old name "UserService" no longer appears
11. Verify the new name "CustomerService" appears in the Service Class Designer view
12. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - `service class CustomerService {` (instead of `service class UserService {`)
13. **Verify the diagram:**
    - Verify the diagram shows entity node with `data-testid="entity-head-CustomerService"`
    - Verify the old type node is removed and new one is added

**Expected Result:** Service Class is successfully renamed, source code reflects the new name, and the diagram is updated with the new type name.

---

### 7. Edit method name (Description: Rename existing method)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate a method (e.g., "getUser") in the Resource Methods or Remote Methods section
4. Click on the "Edit Method" button (✏️ icon) on the method card
5. Verify the "Edit Method" form/panel is displayed
6. Locate the "Method Name" textbox
7. Change the method name from "getUser" to "getUserById"
8. Click on the "Save" button
9. Verify the method is updated
10. Verify the method card shows the new name "getUserById"
11. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - Updated method name "getUserById" instead of "getUser"
12. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated method name

**Expected Result:** Method name is successfully edited, source code reflects the new method name, and the diagram is updated.

---

### 8. Delete variable (Description: Remove instance variable)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate a variable (e.g., "userCount") in the Variables section
4. Click on the "Delete Variable" button (🗑️ icon) on the variable card
5. Confirm the deletion in the dialog (if any)
6. Verify the variable is removed from the Variables section
7. Verify the variable card no longer appears
8. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code no longer contains the deleted variable definition
9. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the removal of the variable

**Expected Result:** Variable is successfully deleted, source code no longer contains the variable definition, and the diagram is updated.

---

### 9. Edit method return type (Description: Change method return type)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate a method (e.g., "getUser") in the Resource Methods or Remote Methods section
4. Click on the "Edit Method" button (✏️ icon) on the method card
5. Verify the "Edit Method" form/panel is displayed
6. Locate the "Return Type" picker
7. Change the return type from "string" to "json"
8. Click on the "Save" button
9. Verify the method is updated
10. Verify the method card shows the updated return type "json"
11. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - Updated return type (e.g., `resource function getUser() returns json;`)
12. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated return type

**Expected Result:** Method return type is successfully edited, source code reflects the new return type, and the diagram is updated.

---

### 10. Add method parameter (Description: Add input parameter to method)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate a method (e.g., "getUser") in the Resource Methods or Remote Methods section
4. Click on the "Edit Method" button (✏️ icon) on the method card
5. Verify the "Edit Method" form/panel is displayed
6. Locate the "Parameters" section
7. Click on the "Add Parameter" button (➕ icon)
8. Verify a new parameter row is added
9. Enter "id" in the "Parameter Name" textbox
10. Click on the "Parameter Type" picker
11. Select "string" as the parameter type
12. (Optional) Check "Is Required" checkbox
13. Click on the "Save" button (or "Add" button for parameter)
14. Verify the parameter is added to the method
15. Click on the "Save" button to save the method
16. Verify the method card shows the parameter "id: string"
17. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code contains:
      - Method with parameter (e.g., `resource function getUser(string id) returns string;`)
18. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the updated method with parameter

**Expected Result:** Method parameter is successfully added, source code includes the parameter in the method signature, and the diagram is updated.

---

### 11. Delete method (Description: Remove method from service class)

**Steps:**
1. Navigate to an existing Service Class in Type Editor
2. Verify the Service Class Designer view is displayed
3. Locate a method (e.g., "getUser") in the Resource Methods or Remote Methods section
4. Click on the "Delete Method" button (🗑️ icon) on the method card
5. Confirm the deletion in the dialog (if any)
6. Verify the method is removed from the section
7. Verify the method card no longer appears
8. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code no longer contains the deleted method definition
9. **Verify the diagram:**
    - Verify the diagram still shows the Service Class type node
    - Verify the diagram visualization reflects the removal of the method

**Expected Result:** Method is successfully deleted, source code no longer contains the method definition, and the diagram is updated.

---

### 12. Delete Service Class (Description: Remove entire service class)

**Steps:**
1. Navigate to Type Editor
2. Locate an existing Service Class (e.g., "UserService") in the diagram or type list
3. Click on the Service Class node or use the type menu
4. Click on "Delete" option (or delete button)
5. Confirm the deletion in the dialog (if any)
6. Verify the Service Class is removed from the diagram
7. Verify the Service Class no longer appears in the type list
8. Verify the Service Class Designer view is closed (if it was open)
9. **Verify the source generated:**
    - Open the type source file (or use Type Menu > Source option)
    - Verify the generated Ballerina code no longer contains the deleted Service Class definition
10. **Verify the diagram:**
    - Verify the diagram no longer shows the Service Class type node
    - Verify any links to the deleted Service Class are also removed

**Expected Result:** Service Class is successfully deleted, source code no longer contains the Service Class definition, and the diagram is updated to remove the type.

---

## Notes

- All test scenarios should verify both source code generation and diagram visualization at the end
- Source verification can be done by opening the type source file or using the Type Menu > Source option
- Diagram verification should check for type nodes using `data-testid="entity-head-[TypeName]"`
- Test utilities for source and diagram verification are available in the test framework
- Service Class methods can be Resource methods or Remote methods, each with their own section in the designer view
- Methods can have parameters with types, default values, and required/optional flags
- Variables can have types and optional default values
- Navigation to flow diagram views is available from method cards in the Service Class Designer view

