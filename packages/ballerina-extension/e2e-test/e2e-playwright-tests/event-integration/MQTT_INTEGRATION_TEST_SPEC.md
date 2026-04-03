# MQTT Event Integration - Test Specification

## Application Overview

The MQTT Event Integration feature in WSO2 Integrator: BI allows users to create services that subscribe to MQTT topics. The integration can be configured with broker connection settings, topics, and Quality of Service (QoS) levels.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **MQTT Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers

### Form Fields
- **Service URI** textbox (required, type: string)
  - Description: "The URI of the MQTT broker."
  - Has Text/Expression toggle
- **Client ID** textbox (required, type: string)
  - Description: "A unique identifier to identify by the MQTT broker."
- **Subscriptions** textbox (required, type: string|string[])
  - Description: "The topics to subscribe to."
  - Has Text/Expression toggle
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "mqttListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **MQTT Event Integration** tree item
- **Listeners** section
- **mqttListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Handler items appear as tree items under the integration

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="mqtt-integration-option"`
2. `data-testid="mqtt-broker-url-input"`
3. `data-testid="mqtt-client-id-input"`
4. `data-testid="mqtt-username-input"`
5. `data-testid="mqtt-password-input"`
6. `data-testid="mqtt-topic-input"`
7. `data-testid="mqtt-qos-level-select"`
8. `data-testid="create-mqtt-integration-button"`
9. `data-testid="configure-mqtt-integration-button"`
10. `data-testid="delete-mqtt-integration-button"`

---

## Test Scenarios

### 1. Create MQTT Integration

**Description:** Creates MQTT listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing MQTT integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "MQTT Event Integration" option
6. Verify the "Create MQTT Event Integration" form is displayed
7. Locate the "Service URI" textbox field
8. Verify "Text" mode is selected by default (or toggle to Text if needed)
9. Enter service URI "tcp://localhost:1883" in the Service URI field
10. Locate the "Client ID" textbox field
11. Enter client ID "mqtt-client-1" in the Client ID field
12. Locate the "Subscriptions" textbox field
13. Verify "Text" mode is selected by default (or toggle to Text if needed)
14. Enter subscription "test/topic" in the Subscriptions field
15. Click on "Advanced Configurations" to expand
16. Verify "Listener Name" field has default value "mqttListener"
17. (Optional) Modify listener name to "myMQTTListener"
18. Click on "Create" button
19. Verify the integration is created successfully

**Expected Results:**
- MQTT Event Integration is created with service URI "tcp://localhost:1883"
- Integration appears in the "Entry Points" section of the project tree as "MQTT Event Integration"
- Service designer view is displayed
- Listener shows as "mqttListener"
- Topic(s) shows as "test/topic"
- Listener name is set (default or custom)

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- MQTT Event Integration option: `div:has-text("MQTT Event Integration")` (in Artifacts menu)
- Broker URL input: `textbox[name*="Broker URL"]` or `input[name*="Broker"]`
- Topic input: `textbox[name*="Topic"]` or `input[name*="Topic"]`
- QoS Level select: `select[name*="QoS"]` or `dropdown[name*="QoS"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("MQTT")`

---

### 2. Edit MQTT Integration

**Description:** Modify MQTT broker config

**Prerequisites:**
- MQTT Event Integration exists

**Steps:**
1. Verify MQTT Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Locate the "Broker URL" input field
6. Update broker URL to "tcp://mqtt.example.com:1883"
7. Update client ID if needed
8. Update username/password if needed
9. Locate the "Topic" input field
10. Update topic to "updated/topic"
11. Click on "Save" or "Create" button
12. Verify the integration is updated

**Expected Results:**
- MQTT integration configuration is updated
- Broker URL is updated to "tcp://mqtt.example.com:1883"
- Topic is updated to "updated/topic"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Broker URL input: `textbox[name*="Broker URL"]`
- Topic input: `textbox[name*="Topic"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Configure QoS Settings

**Description:** Set quality of service level

**Prerequisites:**
- MQTT Event Integration exists

**Steps:**
1. Verify MQTT Event Integration is open in the service designer
2. Click on the "Configure" button
3. Verify the integration configuration form is displayed
4. Locate the "QoS Level" dropdown/select field
5. Verify current QoS level is displayed
6. Click on the QoS Level dropdown
7. Select different QoS level (e.g., change from "1" to "2")
8. Verify QoS level options are: "0" (At most once), "1" (At least once), "2" (Exactly once)
9. Click on "Save" button
10. Verify the QoS setting is updated

**Expected Results:**
- QoS level is updated (e.g., to "2")
- Service designer shows the new QoS level
- Integration uses the configured QoS level for message delivery
- QoS setting is saved in the integration configuration

**Element Identifiers:**
- QoS Level select: `select[name*="QoS"]` or `dropdown[name*="QoS Level"]`
- QoS option "0": `option[value="0"]` or `option:has-text("0")`
- QoS option "1": `option[value="1"]` or `option:has-text("1")`
- QoS option "2": `option[value="2"]` or `option:has-text("2")`
- Save button: `button:has-text("Save")`

---

### 4. Delete MQTT Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- MQTT Event Integration exists

**Steps:**
1. Verify MQTT Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- MQTT Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("MQTT")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 5. Create MQTT Integration with Invalid Broker URL

**Steps:**
1. Click on "Add Artifact" → "MQTT Event Integration"
2. Leave "Broker URL" empty or enter invalid URL format
3. Enter valid topic
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with broker URL

### 6. Create MQTT Integration with Invalid Topic

**Steps:**
1. Click on "Add Artifact" → "MQTT Event Integration"
2. Enter valid broker URL
3. Leave "Topic" empty
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates topic is required

### 7. Configure QoS with Invalid Level

**Steps:**
1. Open MQTT Integration
2. Click on "Configure"
3. Try to set invalid QoS level (if possible)
4. Click on "Save"
5. Verify validation error is displayed

**Expected Results:**
- Validation error is shown
- QoS setting is not saved
- Error message indicates valid QoS levels (0, 1, 2)

---

## Test Data

### Valid Broker URLs
- "tcp://localhost:1883"
- "tcp://mqtt.example.com:1883"
- "ssl://mqtt.example.com:8883"
- "ws://mqtt.example.com:9001"

### Invalid Broker URLs
- Empty string
- Invalid format (e.g., "localhost")
- Missing protocol (e.g., "localhost:1883")

### Valid Topics
- "test/topic"
- "sensor/temperature"
- "user/+/events"
- "home/+/room/+/device"

### Invalid Topics
- Empty string
- Invalid characters (if validation exists)

### Valid QoS Levels
- "0" (At most once)
- "1" (At least once) - default/common
- "2" (Exactly once)

### Valid Client IDs
- "mqtt-client-1"
- "sensor-client"
- "user-device-123"

---

## Notes

1. MQTT broker URL must include protocol (tcp://, ssl://, ws://, wss://)
2. QoS level determines message delivery guarantee:
   - QoS 0: At most once (fire and forget)
   - QoS 1: At least once (acknowledged delivery)
   - QoS 2: Exactly once (assured delivery)
3. Client ID is optional but recommended for connection management
4. Username/password are optional but may be required by broker
5. Topics may support wildcards (+ for single level, # for multi-level)
6. Delete operations may require confirmation - handle dialogs appropriately
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
8. MQTT integration may require MQTT broker to be running for full functionality testing
9. SSL/TLS connections may require additional certificate configuration

