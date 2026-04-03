# Salesforce Event Integration - Test Specification

## Application Overview

The Salesforce Event Integration feature in WSO2 Integrator: BI allows users to create services that listen to Salesforce platform events. The integration can be configured with Salesforce connection settings and event subscriptions.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Salesforce Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Save** button (in Record Configuration dialog)
- Handler **Configure** buttons (⚙️ icon) - for configuring individual event handlers
- Handler **Delete** buttons (🗑️ icon) - for deleting individual event handlers

### Form Fields
- **Auth** textbox (required, type: salesforce:CredentialsConfig)
  - Description: "Configurations related to username/password authentication."
  - Has Record/Expression toggle
  - When Record mode is selected, opens a Record Configuration dialog with CredentialsConfig fields (username, password, securityToken, etc.)
  - When Expression mode is selected, allows entering expression syntax
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "salesforceListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **Salesforce Event Integration** tree item
- **onCreate** tree item (under Salesforce Event Integration) - automatically created
- **onUpdate** tree item (under Salesforce Event Integration) - automatically created
- **onDelete** tree item (under Salesforce Event Integration) - automatically created
- **onRestore** tree item (under Salesforce Event Integration) - automatically created
- **Listeners** section
- **salesforceListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Shows predefined handlers: onCreate, onUpdate, onDelete, onRestore
  - Each handler has Configure and Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="salesforce-integration-option"`
2. `data-testid="salesforce-connection-select"`
3. `data-testid="salesforce-instance-url-input"`
4. `data-testid="salesforce-username-input"`
5. `data-testid="salesforce-password-input"`
6. `data-testid="salesforce-security-token-input"`
7. `data-testid="salesforce-platform-event-name-input"`
8. `data-testid="salesforce-channel-input"`
9. `data-testid="create-salesforce-integration-button"`
10. `data-testid="configure-salesforce-integration-button"`
11. `data-testid="delete-salesforce-integration-button"`

---

## Test Scenarios

### 1. Create Salesforce Integration

**Description:** Creates Salesforce event listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing Salesforce integration with same listener name
- Salesforce credentials available (or existing connection)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "Salesforce Event Integration" option
6. Verify the "Create Salesforce Event Integration" form is displayed
7. Locate the "Auth" textbox field
8. Option A - Using Expression mode:
   - Verify "Expression" mode is selected (or toggle to Expression)
   - Enter auth config "{username: \"test@example.com\", password: \"testpass\", securityToken: \"token123\"}"
9. Option B - Using Record mode:
   - Click on "Record" toggle
   - Verify the Record Configuration dialog is displayed
   - Fill in CredentialsConfig fields (username, password, securityToken, etc.)
   - Click "Save" button
10. Click on "Advanced Configurations" to expand
11. Verify "Listener Name" field has default value "salesforceListener"
12. (Optional) Modify listener name to "mySalesforceListener"
13. Click on "Create" button
14. Verify the integration is created successfully

**Expected Results:**
- Salesforce Event Integration is created with auth configuration
- Integration appears in the "Entry Points" section of the project tree as "Salesforce Event Integration"
- Service designer view is displayed
- Listener shows as "salesforceListener"
- Event Handlers section shows predefined handlers: onCreate, onUpdate, onDelete, onRestore
- Handlers appear as tree items under the integration
- Auth configuration is set
- Integration appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Salesforce connection is configured
- Platform event name shows as "MyPlatformEvent__e"
- Listener name is set

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- Salesforce Event Integration option: `div:has-text("Salesforce Event Integration")` (in Artifacts menu)
- Instance URL input: `textbox[name*="Instance URL"]` or `input[name*="Instance"]`
- Username input: `textbox[name*="Username"]` or `input[name*="Username"]`
- Platform Event Name input: `textbox[name*="Platform Event"]` or `input[name*="Event Name"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("Salesforce")`

---

### 2. Edit Salesforce Integration

**Description:** Modify Salesforce connection

**Prerequisites:**
- Salesforce Event Integration exists

**Steps:**
1. Verify Salesforce Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Update Salesforce connection if needed:
   - Update instance URL
   - Update username/password
   - Update security token
6. Locate the "Platform Event Name" input field
7. Update platform event name to "UpdatedPlatformEvent__e"
8. Update channel if needed
9. Click on "Save" or "Create" button
10. Verify the integration is updated

**Expected Results:**
- Salesforce integration configuration is updated
- Connection settings are updated (if changed)
- Platform event name is updated to "UpdatedPlatformEvent__e"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Instance URL input: `textbox[name*="Instance URL"]`
- Platform Event Name input: `textbox[name*="Platform Event"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Delete Salesforce Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- Salesforce Event Integration exists

**Steps:**
1. Verify Salesforce Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- Salesforce Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("Salesforce")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 4. Create Salesforce Integration with Invalid Connection

**Steps:**
1. Click on "Add Artifact" → "Salesforce Event Integration"
2. Leave "Instance URL" empty or enter invalid URL
3. Enter valid platform event name
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with connection

### 5. Create Salesforce Integration with Invalid Platform Event Name

**Steps:**
1. Click on "Add Artifact" → "Salesforce Event Integration"
2. Enter valid connection details
3. Leave "Platform Event Name" empty or enter invalid format
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates platform event name is required or invalid

### 6. Create Salesforce Integration with Existing Connection

**Steps:**
1. Ensure a Salesforce connection exists in Connections section
2. Click on "Add Artifact" → "Salesforce Event Integration"
3. Select existing connection from dropdown
4. Enter platform event name
5. Click on "Create" button
6. Verify the integration uses the existing connection

**Expected Results:**
- Integration is created using existing connection
- No need to enter connection details manually
- Connection is reused

---

## Test Data

### Valid Instance URLs
- "https://instance.salesforce.com"
- "https://test.salesforce.com"
- "https://login.salesforce.com"

### Invalid Instance URLs
- Empty string
- Invalid format (e.g., "http://invalid")
- Missing protocol

### Valid Platform Event Names
- "MyPlatformEvent__e" (must end with __e)
- "OrderCreated__e"
- "UserUpdated__e"
- "CustomEvent__e"

### Invalid Platform Event Names
- Empty string
- Missing __e suffix
- Invalid characters

### Valid Channels
- "/event/MyPlatformEvent__e"
- Custom channel names

### Valid Usernames
- "user@example.com"
- Salesforce username format

---

## Notes

1. Salesforce platform events must end with "__e" suffix
2. Connection can use existing connection artifact or be configured inline
3. Security token may be required depending on Salesforce security settings
4. Instance URL format: "https://instance.salesforce.com" or "https://login.salesforce.com"
5. Channel is optional - defaults to platform event name if not specified
6. Delete operations may require confirmation - handle dialogs appropriately
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
8. Salesforce integration may require Salesforce org access and proper permissions for full functionality testing
9. OAuth authentication may be supported as an alternative to username/password
10. Connection credentials should be stored securely, possibly as a connection artifact

