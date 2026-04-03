# Automation - Test Specification

## Application Overview

The Automation feature in WSO2 Integrator: BI allows users to create automations that can be invoked periodically or manually. Automations can be scheduled in external systems such as cronjob, k8s, or Devant. They can have startup parameters and error handling configured.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Automation** option in Artifacts menu (under "Automation" section)
- **Create** button (in automation creation form)
- **Cancel** button (in automation creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing automation
- **Delete** button (icon: 🗑️) - for deleting automation
- **Add Parameter** button (text: "Add Parameter", icon: ➕) - for adding startup parameters

### Form Fields
- **Advanced Configurations** expandable section (collapsed by default):
  - **Startup Parameters** section
    - Description: "Define the parameters to be passed to the automation at startup"
    - Shows list of parameters
    - **Add Parameter** button opens a dialog with:
      - **Type** (required) - with type picker button
      - **Name** (required) - textbox
      - **Description** (optional) - textbox with expand editor
  - **Return Error** checkbox (default: checked)
    - Description: "Indicate if the automation should exit with error"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Automation** breadcrumb
- **Diagram** breadcrumb

### Tree View Elements
- **Entry Points** section
- **Automation** tree item (automation name, e.g., "main")
- **Flow/Sequence** tabs in automation designer
- **Start** node in flow diagram
- **Error Handler** node in flow diagram

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="automation-option"`
2. `data-testid="add-parameter-button"`
3. `data-testid="startup-parameter-type-picker"`
4. `data-testid="startup-parameter-name-input"`
5. `data-testid="startup-parameter-description-input"`
6. `data-testid="return-error-checkbox"`
7. `data-testid="create-automation-button"`
8. `data-testid="configure-automation-button"`
9. `data-testid="delete-automation-button"`
10. `data-testid="automation-flow-tab"`
11. `data-testid="automation-sequence-tab"`
12. `data-testid="start-node"`
13. `data-testid="error-handler-node"`

## Test Scenarios

### 1. Create Automation (Description: Creates automation with default flow)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Automation" section, click on "Automation" option
6. Verify the "Create New Automation" form is displayed
7. Verify the form subtitle shows "Periodic invocation should be scheduled in an external system such as cronjob, k8s, or Devant"
8. (Optional) Click on "Advanced Configurations" to expand the section
9. (Optional) Verify "Return Error" checkbox is checked by default
10. Click on the "Create" button
11. Verify the Automation is created and the automation designer view is displayed
12. Verify the automation name is displayed (default: "main")
13. Verify the "Flow" and "Sequence" tabs are available
14. Verify the flow diagram shows a "Start" node
15. Verify the flow diagram shows an "Error Handler" node
16. Verify the tree view shows the automation name under "Entry Points" section

**Expected Result:** An Automation is successfully created with default configurations and the automation designer view is displayed with a default flow.

### 2. Edit Automation (Description: Modify startup parameters)

**Steps:**
1. Navigate to an existing Automation in the automation designer view
2. Click on the "Configure" button (⚙️ icon) next to the automation name
3. Verify the "Configure Automation" form is displayed
4. Click on "Advanced Configurations" to expand the section
5. Locate the "Startup Parameters" section
6. Click on the "Add Parameter" button
7. Verify the parameter dialog is displayed
8. Click on the "Type" type picker button
9. Select a type (e.g., "string") from the type browser
10. Enter a parameter name (e.g., "configPath") in the "Name" field
11. (Optional) Enter a description in the "Description" field
12. Click on the "Add" button
13. Verify the parameter is added to the "Startup Parameters" section
14. (Optional) Modify the "Return Error" checkbox (check or uncheck)
15. Click on the "Create" (or "Save") button
16. Verify the automation designer view reflects the updated startup parameters

**Expected Result:** The Automation startup parameters are successfully updated.

### 3. Delete Automation (Description: Remove automation and verify cleanup)

**Steps:**
1. Navigate to an existing Automation in the automation designer view
2. Click on the "Delete" button (🗑️ icon) next to the automation name in the tree view (or use the Configure form if available)
3. Confirm the deletion in the dialog (if any)
4. Verify the Automation is removed from the project tree
5. Verify the Automation is removed from the "Entry Points" section
6. Verify the automation designer view is closed or shows a different automation

**Expected Result:** The Automation is successfully deleted and removed from the project.

