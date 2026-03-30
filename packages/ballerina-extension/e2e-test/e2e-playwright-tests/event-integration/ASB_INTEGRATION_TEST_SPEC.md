# Azure Service Bus Event Integration - Test Specification

## Application Overview

The Azure Service Bus (ASB) Event Integration feature in WSO2 Integrator: BI allows users to create services that consume messages from Azure Service Bus Event Hubs. The integration can be configured with connection strings and event hub settings.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Azure Service Bus Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers
- **Save** button (in Record Configuration dialog)

### Form Fields
- **Connection String** textbox (required, type: string)
  - Description: "The connection string to connect to the Azure Service Bus namespace."
  - Has Text/Expression toggle
- **Entity Config** textbox (required, type: asb:TopicSubsConfig|asb:QueueConfig)
  - Description: "The entity configuration to connect to the Azure Service Bus."
  - Has Record/Expression toggle
  - When Record mode is selected, opens a Record Configuration dialog with:
    - Type dropdown: TopicSubsConfig or QueueConfig
    - For TopicSubsConfig: topicName (string), subscriptionName (string)
    - For QueueConfig: name (string)
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "asbListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **Azure Service Bus Event Integration** tree item
- **Listeners** section
- **asbListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Handler items appear as tree items under the integration

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="asb-integration-option"`
2. `data-testid="asb-connection-string-input"`
3. `data-testid="asb-event-hub-name-input"`
4. `data-testid="asb-consumer-group-input"`
5. `data-testid="create-asb-integration-button"`
6. `data-testid="configure-asb-integration-button"`
7. `data-testid="delete-asb-integration-button"`

---

## Test Scenarios

### 1. Create ASB Integration

**Description:** Creates ASB Event Hub listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing ASB integration with same listener name
- Azure Service Bus connection string available

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "Azure Service Bus Event Integration" option
6. Wait for the ASB package to be pulled (if first time)
7. Verify the "Create Azure Service Bus Event Integration" form is displayed
8. Locate the "Connection String" textbox field
9. Verify "Text" mode is selected by default (or toggle to Text if needed)
10. Enter Azure Service Bus connection string "Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=testkey" in the Connection String field
11. Locate the "Entity Config" textbox field
12. Option A - Using Expression mode:
    - Verify "Expression" mode is selected (or toggle to Expression)
    - Enter entity config "{name: \"test-queue\"}" for QueueConfig or "{topicName: \"test-topic\", subscriptionName: \"test-sub\"}" for TopicSubsConfig
13. Option B - Using Record mode:
    - Click on "Record" toggle
    - Verify the Record Configuration dialog is displayed
    - Select Type "QueueConfig" or "TopicSubsConfig" from dropdown
    - For QueueConfig: Enter name "test-queue"
    - For TopicSubsConfig: Enter topicName "test-topic" and subscriptionName "test-sub"
    - Click "Save" button
14. Click on "Advanced Configurations" to expand
15. Verify "Listener Name" field has default value "asbListener"
16. (Optional) Modify listener name to "myASBListener"
17. Click on "Create" button
18. Verify the integration is created successfully

**Expected Results:**
- ASB Event Integration is created with connection string
- Integration appears in the "Entry Points" section of the project tree as "Azure Service Bus Event Integration"
- Service designer view is displayed
- Listener shows as "asbListener"
- Entity config is set (QueueConfig or TopicSubsConfig)
- Listener name is set (default or custom)

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- ASB Event Integration option: `div:has-text("Azure Service Bus Event Integration")` (in Artifacts menu)
- Connection String input: `textbox[name*="Connection String"]` or `input[name*="Connection"]`
- Event Hub Name input: `textbox[name*="Event Hub"]` or `input[name*="Event Hub Name"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("Azure Service Bus")` or `treeitem:has-text("ASB")`

---

### 2. Edit ASB Integration

**Description:** Modify ASB connection config

**Prerequisites:**
- ASB Event Integration exists

**Steps:**
1. Verify ASB Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Locate the "Connection String" input field
6. Update connection string to new Azure Service Bus connection string
7. Locate the "Event Hub Name" input field
8. Update event hub name to "updated-event-hub"
9. Update consumer group if needed
10. Click on "Save" or "Create" button
11. Verify the integration is updated

**Expected Results:**
- ASB integration configuration is updated
- Connection string is updated
- Event Hub name is updated to "updated-event-hub"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Connection String input: `textbox[name*="Connection String"]`
- Event Hub Name input: `textbox[name*="Event Hub"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Delete ASB Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- ASB Event Integration exists

**Steps:**
1. Verify ASB Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- Azure Service Bus Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("Azure Service Bus")` or `treeitem:has-text("ASB")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 4. Create ASB Integration with Invalid Connection String

**Steps:**
1. Click on "Add Artifact" → "Azure Service Bus Event Integration"
2. Leave "Connection String" empty or enter invalid format
3. Enter valid event hub name
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with connection string

### 5. Create ASB Integration with Invalid Event Hub Name

**Steps:**
1. Click on "Add Artifact" → "Azure Service Bus Event Integration"
2. Enter valid connection string
3. Leave "Event Hub Name" empty
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates event hub name is required

### 6. Create ASB Integration with Custom Consumer Group

**Steps:**
1. Click on "Add Artifact" → "Azure Service Bus Event Integration"
2. Enter valid connection string
3. Enter valid event hub name
4. Enter consumer group "custom-group-1"
5. Click on "Create" button
6. Verify the integration is created with custom consumer group

**Expected Results:**
- Integration is created with consumer group "custom-group-1"
- Consumer group is displayed in service designer

---

## Test Data

### Valid Connection Strings
- "Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=..."
- Azure Service Bus connection string format

### Invalid Connection Strings
- Empty string
- Invalid format
- Missing required parameters

### Valid Event Hub Names
- "my-event-hub"
- "event-hub-1"
- "user-events"
- "order-events"

### Invalid Event Hub Names
- Empty string
- Invalid characters (if validation exists)

### Valid Consumer Groups
- "$Default" (default)
- "my-consumer-group"
- "consumer-group-1"
- "custom-group"

---

## Notes

1. Azure Service Bus connection string contains sensitive information and should be handled securely
2. Event Hub name must exist in the Azure Service Bus namespace
3. Consumer group is optional - uses "$Default" if not specified
4. Connection string format: "Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=..."
5. Delete operations may require confirmation - handle dialogs appropriately
6. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
7. ASB integration may require Azure Service Bus to be configured and accessible for full functionality testing
8. Connection string may be stored as a separate connection artifact for security
9. Integration may support Azure Active Directory authentication as an alternative

