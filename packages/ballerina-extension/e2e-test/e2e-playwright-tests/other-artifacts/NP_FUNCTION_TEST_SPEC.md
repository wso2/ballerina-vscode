# NP Function (Natural Programming Function) - Test Specification

## Application Overview

The NP Function (Natural Programming Function) feature in WSO2 Integrator: BI allows users to create functions using natural language descriptions. The AI handles the implementation based on the user's description, making it easier to build flows without writing code manually.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Function** option in Artifacts menu (under "Other Artifacts" section) - with NP Function mode
- **Create** button (in function creation form)
- **Cancel** button (in function creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing function
- **Delete** button (icon: 🗑️) - for deleting function
- **Add Parameter** button (text: "Add Parameter", icon: ➕) - for adding function parameters
- **Add** button (in parameter dialog)

### Form Fields
- **Name** textbox (required)
  - Description: Function name
- **Description** textbox (optional)
  - Description: Natural language description of what the function should do
  - Has expand editor button
  - This is the key field for NP Functions - describes the function behavior in natural language
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
- **Natural Functions** section (if NP is supported)
- **Function** tree item (function name)
- **Flow/Sequence** tabs in function designer
- **Start** node in flow diagram

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="np-function-option"`
2. `data-testid="np-function-name-input"`
3. `data-testid="np-function-description-input"`
4. `data-testid="add-parameter-button"`
5. `data-testid="parameter-type-picker"`
6. `data-testid="parameter-name-input"`
7. `data-testid="parameter-description-input"`
8. `data-testid="return-type-picker"`
9. `data-testid="return-type-description-input"`
10. `data-testid="create-np-function-button"`
11. `data-testid="configure-np-function-button"`
12. `data-testid="delete-np-function-button"`

## Test Scenarios

### 1. Create NP Function (Description: Creates natural programming function)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Other Artifacts" section, click on "Function" option (or "NP Function" if available as separate option)
6. Verify the "Create Natural Function" form is displayed (or Function form with NP mode)
7. Verify the form subtitle shows "Build a flow using a natural language description"
8. Enter a function name (e.g., "processOrder") in the "Name" field
9. Enter a natural language description (e.g., "Process an order by validating the order details, calculating the total price, and sending a confirmation email") in the "Description" field
10. (Optional) Add parameters using the "Add Parameter" button
11. (Optional) Set a return type using the "Return Type" picker
12. Click on the "Create" button
13. Verify the NP Function is created and the function designer view is displayed
14. Verify the function name is displayed in the designer
15. Verify the "Flow" and "Sequence" tabs are available
16. Verify the tree view shows the function name under "Natural Functions" section (or "Functions" section)

**Expected Result:** An NP Function is successfully created with the natural language description and the function designer view is displayed.

### 2. Edit NP Function (Description: Modify NP function)

**Steps:**
1. Navigate to an existing NP Function in the function designer view
2. Click on the "Configure" button (⚙️ icon) next to the function name
3. Verify the "Configure Natural Function" form is displayed
4. Modify the function name (if needed)
5. Modify the natural language description to describe different behavior (e.g., "Process an order by validating the order details, calculating the total price with discount, and sending a confirmation email to the customer")
6. (Optional) Add, edit, or remove parameters
7. (Optional) Modify the return type
8. Click on the "Create" (or "Save") button
9. Verify the function designer view reflects the updated description
10. Verify the AI-generated flow is updated based on the new description (if applicable)

**Expected Result:** The NP Function is successfully updated with the modified natural language description and the flow is regenerated accordingly.

