# Kafka Event Integration - Test Specification

## Application Overview

The Kafka Event Integration feature in WSO2 Integrator: BI allows users to create services that consume messages from Kafka topics. The integration can be configured with bootstrap servers, topics, and error handling.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Kafka Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler" or "Handler", icon: ➕) - for adding event handlers
  - Opens dialog with handler options: "onConsumerRecord" and "onError"

### Form Fields
- **Bootstrap Servers** textbox (required, type: string|string[])
  - Description: "List of remote server endpoints of the Kafka brokers."
  - No Text/Expression toggle visible in current UI
- **Topic(s)** textbox (required, type: string|string[])
  - Description: "The topic(s) to subscribe to."
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "kafkaListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **Kafka Event Integration** tree item (with Delete button in toolbar)
- **Listeners** section
- **kafkaListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Handler items (e.g., "onError") appear as tree items under the integration

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="kafka-integration-option"`
2. `data-testid="kafka-bootstrap-servers-input"`
3. `data-testid="kafka-bootstrap-servers-text-toggle"`
4. `data-testid="kafka-bootstrap-servers-expression-toggle"`
5. `data-testid="kafka-topics-input"`
6. `data-testid="kafka-listener-name-input"`
7. `data-testid="add-topic-button"`
8. `data-testid="add-error-handler-button"`
9. `data-testid="create-kafka-integration-button"`
10. `data-testid="configure-kafka-integration-button"`
11. `data-testid="delete-kafka-integration-button"`

---

## Test Scenarios

### 1. Create Kafka Integration

**Description:** Creates Kafka listener with bootstrap servers

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing Kafka integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "Kafka Event Integration" option
6. Verify the "Create Kafka Event Integration" form is displayed
7. Locate the "Bootstrap Servers" input field
8. Verify "Text" mode is selected by default
9. Enter bootstrap servers "localhost:9092" in the Bootstrap Servers field
10. Locate the "Topic(s)" input field
11. Enter topic name "test-topic" in the Topic(s) field
12. Click on "Advanced Configurations" to expand
13. Verify "Listener Name" field has default value "kafkaListener"
14. (Optional) Modify listener name to "myKafkaListener"
15. Click on "Create" button
16. Verify the integration is created successfully

**Expected Results:**
- Kafka Event Integration is created with bootstrap servers "localhost:9092"
- Integration appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Bootstrap servers show as "localhost:9092"
- Topic shows as "test-topic"
- Listener name is set (default or custom)

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- Kafka Event Integration option: `div:has-text("Kafka Event Integration")` (in Artifacts menu)
- Bootstrap Servers input: `textbox[name*="Bootstrap Servers"]` or `input[name*="Bootstrap"]`
- Topic(s) input: `textbox[name*="Topic"]` or `input[name*="Topic"]`
- Listener Name input: `textbox[name*="Listener Name"]` or `input[value="kafkaListener"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("Kafka")`

---

### 2. Edit Kafka Integration

**Description:** Modifies Kafka listener config

**Prerequisites:**
- Kafka Event Integration exists

**Steps:**
1. Verify Kafka Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Locate the "Bootstrap Servers" input field
6. Clear the existing value
7. Type new bootstrap servers "kafka1:9092,kafka2:9092" (multiple servers)
8. Locate the "Topic(s)" input field
9. Update topic to "updated-topic"
10. Click on "Advanced Configurations" to expand
11. Update listener name if needed
12. Click on "Save" or "Create" button
13. Verify the integration is updated

**Expected Results:**
- Kafka integration configuration is updated
- Bootstrap servers are updated to "kafka1:9092,kafka2:9092"
- Topic is updated to "updated-topic"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Bootstrap Servers input: `textbox[name*="Bootstrap Servers"]`
- Topic(s) input: `textbox[name*="Topic"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Configure Multiple Topics

**Description:** Subscribe to multiple Kafka topics

**Prerequisites:**
- Kafka Event Integration exists

**Steps:**
1. Verify Kafka Event Integration is open in the service designer
2. Click on the "Configure" button (⚙️ icon)
3. Verify the integration configuration form is displayed
4. Locate the "Topic(s)" textbox field
5. Enter multiple topics separated by commas: "topic1,topic2,topic3"
6. Note: Multiple topics can be entered as comma-separated values in the same field
7. Click on "Create" or "Save" button (verify the actual button text)
8. Verify the integration is updated with multiple topics

**Expected Results:**
- Multiple topics are configured: "topic1", "topic2", "topic3"
- Integration subscribes to all specified topics
- Topics are displayed in the service designer as "Topic(s): topic1,topic2,topic3"
- Integration can consume messages from all configured topics

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Topic(s) input: `textbox[name*="Topic"]` or `textbox:has-text("Topic(s)")`
- Create/Save button: `button:has-text("Create")` or `button:has-text("Save")`

---

### 4. Add Consumer Error Handler

**Description:** Configure onError handler

**Prerequisites:**
- Kafka Event Integration exists

**Steps:**
1. Verify Kafka Event Integration is open in the service designer
2. Locate the "Event Handlers" section
3. Verify "No event handlers found. Add a new event handler." message is displayed (if no handlers exist)
4. Click on "Add Handler" button (➕ icon with text "Add Handler" or "Handler")
5. Verify the "Select Handler to Add" dialog is displayed
6. Verify two handler options are available:
   - "onConsumerRecord" - for handling consumer records
   - "onError" - for error handling
7. Click on "onError" option
8. Verify the onError handler is added to the integration
9. Verify "onError" appears in the Event Handlers section
10. Verify "onError" appears as a tree item under "Kafka Event Integration" in the project tree

**Expected Results:**
- onError handler is added to the Kafka integration
- Handler appears in the Event Handlers section of the service designer
- Handler appears as a tree item under the integration in the project tree
- Handler has a delete button (🗑️ icon) for removal
- Integration can handle errors using the configured onError handler

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")` or `button:has-text("Handler")` or `button[aria-label*="Add Handler"]`
- Handler selection dialog: dialog with heading "Select Handler to Add"
- onError option: `paragraph:has-text("onError")` or `div:has-text("onError")` in the handler selection dialog
- onError handler in tree: `treeitem:has-text("onError")` under Kafka Event Integration

---

### 5. Delete Kafka Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- Kafka Event Integration exists

**Steps:**
1. Verify Kafka Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- Kafka Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Listener is removed from "Listeners" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("Kafka")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 6. Create Kafka Integration with Expression Mode

**Steps:**
1. Click on "Add Artifact" → "Kafka Event Integration"
2. Locate the "Bootstrap Servers" field
3. Click on "Expression" toggle (if available)
4. Enter expression for bootstrap servers
5. Enter topic name
6. Click on "Create" button
7. Verify the integration is created with expression

**Expected Results:**
- Integration is created with expression-based bootstrap servers
- Expression is properly evaluated

### 7. Create Kafka Integration with Invalid Bootstrap Servers

**Steps:**
1. Click on "Add Artifact" → "Kafka Event Integration"
2. Leave "Bootstrap Servers" empty or enter invalid format
3. Enter valid topic
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with bootstrap servers

### 8. Create Kafka Integration with Invalid Topic

**Steps:**
1. Click on "Add Artifact" → "Kafka Event Integration"
2. Enter valid bootstrap servers
3. Leave "Topic(s)" empty
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates topic is required

### 9. Create Kafka Integration with Duplicate Listener Name

**Steps:**
1. Create Kafka Integration with listener name "kafkaListener"
2. Try to create another Kafka Integration with same listener name
3. Verify error or warning is displayed

**Expected Results:**
- Error or warning indicates listener name conflict
- Second integration is not created (or appropriate handling)

---

## Test Data

### Valid Bootstrap Servers
- "localhost:9092"
- "kafka1:9092,kafka2:9092"
- "192.168.1.100:9092"
- "kafka.example.com:9092"

### Invalid Bootstrap Servers
- Empty string
- Invalid format (e.g., "localhost")
- Invalid port (e.g., "localhost:99999")

### Valid Topics
- "test-topic"
- "topic1,topic2,topic3"
- "my-topic"
- "user-events"

### Invalid Topics
- Empty string
- Invalid characters (if validation exists)

### Valid Listener Names
- "kafkaListener" (default)
- "myKafkaListener"
- "kafkaListener1"
- "customKafkaListener"

---

## Notes

1. Bootstrap Servers can be configured in "Text" or "Expression" mode
2. Multiple bootstrap servers can be specified as comma-separated values
3. Multiple topics can be specified as comma-separated values or added individually
4. Listener name is required and must be unique
5. Error handler configuration may vary based on available options
6. Delete operations may require confirmation - handle dialogs appropriately
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
8. Kafka integration may require Kafka broker to be running for full functionality testing

