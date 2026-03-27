# RabbitMQ Event Integration - Test Specification

## Application Overview

The RabbitMQ Event Integration feature in WSO2 Integrator: BI allows users to create services that consume messages from RabbitMQ queues. The integration can be configured with connection settings, exchange bindings, and routing keys.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **RabbitMQ Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers
  - Opens dialog with handler options: "onMessage", "onRequest", "onError"

### Form Fields
- **Queue Name** textbox (required, type: string)
  - Description: "The name of the queue to listen to."
  - Has Text/Expression toggle
- **Host** textbox (required, type: string)
  - Description: "The host used for establishing the connection."
- **Port** textbox (required, type: int)
  - Description: "The port used for establishing the connection."
  - Has "Open Helper Panel" and "Expand Editor" buttons
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "rabbitmqListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **RabbitMQ Event Integration - "{queueName}"** tree item (displays queue name in tree)
- **Listeners** section
- **rabbitmqListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Handler items (e.g., "onMessage", "onRequest", "onError") appear as tree items under the integration

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="rabbitmq-integration-option"`
2. `data-testid="rabbitmq-host-input"`
3. `data-testid="rabbitmq-port-input"`
4. `data-testid="rabbitmq-username-input"`
5. `data-testid="rabbitmq-password-input"`
6. `data-testid="rabbitmq-queue-name-input"`
7. `data-testid="rabbitmq-exchange-name-input"`
8. `data-testid="rabbitmq-exchange-type-select"`
9. `data-testid="rabbitmq-routing-key-input"`
10. `data-testid="add-exchange-binding-button"`
11. `data-testid="create-rabbitmq-integration-button"`
12. `data-testid="configure-rabbitmq-integration-button"`
13. `data-testid="delete-rabbitmq-integration-button"`

---

## Test Scenarios

### 1. Create RabbitMQ Integration

**Description:** Creates RabbitMQ listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing RabbitMQ integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "RabbitMQ Event Integration" option
6. Verify the "Create RabbitMQ Event Integration" form is displayed
7. Locate the "Queue Name" textbox field
8. Verify "Text" mode is selected by default (or toggle to Text if needed)
9. Enter queue name "test-queue" in the Queue Name field
10. Locate the "Host" textbox field
11. Enter host "localhost" in the Host field
12. Locate the "Port" textbox field
13. Enter port "5672" in the Port field
14. Click on "Advanced Configurations" to expand
15. Verify "Listener Name" field has default value "rabbitmqListener"
16. (Optional) Modify listener name to "myRabbitMQListener"
17. Click on "Create" button
18. Verify the integration is created successfully

**Expected Results:**
- RabbitMQ Event Integration is created with connection settings
- Integration appears in the "Entry Points" section of the project tree as "RabbitMQ Event Integration - \"test-queue\""
- Service designer view is displayed
- Listener shows as "rabbitmqListener"
- Queue name shows as "test-queue"
- Listener name is set (default or custom)

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- RabbitMQ Event Integration option: `div:has-text("RabbitMQ Event Integration")` (in Artifacts menu)
- Queue Name input: `textbox[name*="Queue Name"]` or `textbox:has-text("Queue Name")`
- Host input: `textbox[name*="Host"]` or `textbox:has-text("Host")`
- Port input: `textbox[type="text"]` (for port field) or `textbox` with helper panel buttons
- Listener Name input: `textbox[name*="Listener Name"]` or `textbox[value="rabbitmqListener"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("RabbitMQ Event Integration")`

---

### 2. Edit RabbitMQ Integration

**Description:** Modify RabbitMQ config

**Prerequisites:**
- RabbitMQ Event Integration exists

**Steps:**
1. Verify RabbitMQ Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Locate the "Host" input field
6. Update host to "rabbitmq.example.com"
7. Locate the "Port" input field
8. Update port to "5673"
9. Update queue name if needed
10. Update username/password if needed
11. Click on "Save" or "Create" button
12. Verify the integration is updated

**Expected Results:**
- RabbitMQ integration configuration is updated
- Host is updated to "rabbitmq.example.com"
- Port is updated to "5673"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Host input: `textbox[name*="Host"]`
- Port input: `textbox[name*="Port"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Configure Exchange Binding

**Description:** Set up exchange and routing key

**Prerequisites:**
- RabbitMQ Event Integration exists

**Steps:**
1. Verify RabbitMQ Event Integration is open in the service designer
2. Click on the "Configure" button (⚙️ icon)
3. Verify the integration configuration form is displayed
4. Note: Exchange binding configuration may be available in the Configure form or as a separate configuration option
5. If exchange fields are available in the Configure form:
   - Enter exchange name "myExchange" in the "Exchange Name" field
   - Select exchange type from dropdown (e.g., "direct", "topic", "fanout", "headers")
   - Enter routing key "routing.key" in the "Routing Key" field
6. Click on "Create" or "Save" button
7. Verify the exchange binding is configured

**Expected Results:**
- Exchange binding is configured with exchange name "myExchange" (if supported)
- Exchange type is set (e.g., "direct") (if supported)
- Routing key is set to "routing.key" (if supported)
- Integration can consume messages from the exchange with the specified routing key
- Exchange binding appears in the service designer

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Exchange Name input: `textbox[name*="Exchange"]` or `input[name*="Exchange Name"]` (if available)
- Exchange Type select: `select[name*="Exchange Type"]` or `dropdown[name*="Type"]` (if available)
- Routing Key input: `textbox[name*="Routing Key"]` or `input[name*="Routing"]` (if available)
- Create/Save button: `button:has-text("Create")` or `button:has-text("Save")`

**Note:** Exchange binding configuration may not be available in the initial creation form. It may be configured through the Configure button or may require additional setup steps.

---

### 4. Delete RabbitMQ Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- RabbitMQ Event Integration exists

**Steps:**
1. Verify RabbitMQ Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- RabbitMQ Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("RabbitMQ")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 5. Create RabbitMQ Integration with Invalid Connection

**Steps:**
1. Click on "Add Artifact" → "RabbitMQ Event Integration"
2. Leave "Host" empty or enter invalid host
3. Enter valid queue name
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with connection

### 6. Create RabbitMQ Integration with Invalid Queue Name

**Steps:**
1. Click on "Add Artifact" → "RabbitMQ Event Integration"
2. Enter valid host and port
3. Leave "Queue Name" empty
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates queue name is required

### 7. Configure Exchange Binding with Invalid Routing Key

**Steps:**
1. Open RabbitMQ Integration
2. Click on "Add Exchange Binding"
3. Enter exchange name
4. Select exchange type
5. Leave routing key empty (if required)
6. Click on "Save"
7. Verify validation error is displayed

**Expected Results:**
- Validation error is shown
- Exchange binding is not saved
- Error message indicates the issue

---

## Test Data

### Valid Hosts
- "localhost"
- "rabbitmq.example.com"
- "192.168.1.100"

### Valid Ports
- 5672 (default)
- 5673
- 15672 (management port)

### Valid Queue Names
- "test-queue"
- "my-queue"
- "user-events"
- "order-queue"

### Valid Exchange Types
- "direct"
- "topic"
- "fanout"
- "headers"

### Valid Routing Keys
- "routing.key"
- "user.created"
- "order.*"
- "*.event"

### Valid Usernames/Passwords
- "guest" / "guest" (default)
- Custom credentials

---

## Notes

1. RabbitMQ connection may use default credentials (guest/guest) or require custom authentication
2. Exchange binding is optional - integration can work with direct queue consumption
3. Exchange type determines message routing behavior
4. Routing key patterns may support wildcards depending on exchange type
5. Delete operations may require confirmation - handle dialogs appropriately
6. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
7. RabbitMQ integration may require RabbitMQ server to be running for full functionality testing
8. Connection settings may be stored as a separate connection artifact

