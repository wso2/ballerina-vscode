# Twilio Event Integration - Test Specification

## Application Overview

The Twilio Event Integration feature in WSO2 Integrator: BI allows users to create services that receive webhooks from Twilio. The integration can be configured with Twilio account settings and webhook endpoints.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Twilio Event Integration** option in Artifacts menu (under "Event Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- Handler **Configure** buttons (⚙️ icon) - for configuring individual event handlers
- Handler **Delete** buttons (🗑️ icon) - for deleting individual event handlers

### Form Fields
- **Event Channel** combobox (required)
  - Description: "The event channel name"
  - Options:
    - CallStatusService
    - SmsStatusService
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "twilioListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **twilio:CallStatusService** or **twilio:SmsStatusService** tree item (based on Event Channel selected)
- Handler tree items (automatically created based on Event Channel):
  - For CallStatusService: onQueued, onRinging, onInProgress, onCompleted, onBusy, onFailed, onNoAnswer, onCanceled
  - For SmsStatusService: (handler names may differ)
- **Listeners** section
- **twilioListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Shows predefined handlers based on selected Event Channel
  - Each handler has Configure and Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="twilio-integration-option"`
2. `data-testid="twilio-account-sid-input"`
3. `data-testid="twilio-auth-token-input"`
4. `data-testid="twilio-webhook-url-input"`
5. `data-testid="twilio-webhook-path-input"`
6. `data-testid="create-twilio-integration-button"`
7. `data-testid="configure-twilio-integration-button"`
8. `data-testid="delete-twilio-integration-button"`

---

## Test Scenarios

### 1. Create Twilio Integration

**Description:** Creates Twilio webhook listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing Twilio integration with same listener name
- Twilio Account SID and Auth Token available

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "Twilio Event Integration" option
6. Wait for the Twilio package to be pulled (if first time)
7. Verify the "Create Twilio Event Integration" form is displayed
8. Locate the "Event Channel" combobox field
9. Verify the dropdown shows options: CallStatusService, SmsStatusService
10. Select "CallStatusService" from the Event Channel dropdown (or "SmsStatusService" for SMS events)
11. Click on "Advanced Configurations" to expand
12. Verify "Listener Name" field has default value "twilioListener"
13. (Optional) Modify listener name to "myTwilioListener"
14. Click on "Create" button
15. Verify the integration is created successfully

**Expected Results:**
- Twilio Event Integration is created with selected Event Channel
- Integration appears in the "Entry Points" section of the project tree as "twilio:CallStatusService" (or "twilio:SmsStatusService")
- Service designer view is displayed
- Listener shows as "twilioListener"
- Event Handlers section shows predefined handlers based on Event Channel:
  - For CallStatusService: onQueued, onRinging, onInProgress, onCompleted, onBusy, onFailed, onNoAnswer, onCanceled
  - For SmsStatusService: (handler names may differ)
- Handlers appear as tree items under the service
- Event Channel is set
- Service designer view is displayed
- Account SID is configured
- Webhook path shows as "/twilio/webhook"
- Listener name is set

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- Twilio Event Integration option: `div:has-text("Twilio Event Integration")` (in Artifacts menu)
- Account SID input: `textbox[name*="Account SID"]` or `input[name*="SID"]`
- Auth Token input: `textbox[name*="Auth Token"]` or `input[name*="Token"]`
- Webhook Path input: `textbox[name*="Webhook Path"]` or `input[name*="Path"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("Twilio")`

---

### 2. Edit Twilio Integration

**Description:** Modify Twilio webhook config

**Prerequisites:**
- Twilio Event Integration exists

**Steps:**
1. Verify Twilio Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Update Account SID if needed
6. Update Auth Token if needed
7. Locate the "Webhook Path" input field
8. Update webhook path to "/twilio/updated-webhook"
9. Update webhook URL if available
10. Click on "Save" or "Create" button
11. Verify the integration is updated

**Expected Results:**
- Twilio integration configuration is updated
- Webhook path is updated to "/twilio/updated-webhook"
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Account SID input: `textbox[name*="Account SID"]`
- Webhook Path input: `textbox[name*="Webhook Path"]`
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Delete Twilio Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- Twilio Event Integration exists

**Steps:**
1. Verify Twilio Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- Twilio Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("Twilio")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 4. Create Twilio Integration with Invalid Account SID

**Steps:**
1. Click on "Add Artifact" → "Twilio Event Integration"
2. Leave "Account SID" empty or enter invalid format
3. Enter valid auth token
4. Enter valid webhook path
5. Click on "Create" button
6. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates the issue with Account SID

### 5. Create Twilio Integration with Invalid Auth Token

**Steps:**
1. Click on "Add Artifact" → "Twilio Event Integration"
2. Enter valid Account SID
3. Leave "Auth Token" empty
4. Enter valid webhook path
5. Click on "Create" button
6. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates auth token is required

### 6. Create Twilio Integration with Invalid Webhook Path

**Steps:**
1. Click on "Add Artifact" → "Twilio Event Integration"
2. Enter valid Account SID and Auth Token
3. Leave "Webhook Path" empty or enter invalid format
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates webhook path is required or invalid

---

## Test Data

### Valid Account SIDs
- "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" (34 characters, starts with AC)
- Twilio Account SID format

### Invalid Account SIDs
- Empty string
- Invalid format (not starting with AC)
- Wrong length

### Valid Auth Tokens
- Twilio Auth Token (32 characters)
- Valid authentication token format

### Invalid Auth Tokens
- Empty string
- Invalid format
- Wrong length

### Valid Webhook Paths
- "/twilio/webhook"
- "/webhooks/twilio"
- "/api/twilio/events"
- "/twilio/sms"

### Invalid Webhook Paths
- Empty string
- Missing leading slash
- Invalid characters

### Valid Webhook URLs (if applicable)
- "https://example.com/twilio/webhook"
- Full URL format

---

## Notes

1. Twilio Account SID format: "AC" followed by 32 alphanumeric characters
2. Auth Token is sensitive information and should be stored securely
3. Webhook path determines the endpoint where Twilio will send webhooks
4. Webhook URL may be auto-generated based on service deployment
5. Integration receives webhooks for various Twilio events (SMS, voice, etc.)
6. Delete operations may require confirmation - handle dialogs appropriately
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
8. Twilio integration may require Twilio account and proper webhook configuration for full functionality testing
9. Webhook URL must be publicly accessible for Twilio to send events
10. Connection credentials should be stored securely, possibly as a connection artifact

