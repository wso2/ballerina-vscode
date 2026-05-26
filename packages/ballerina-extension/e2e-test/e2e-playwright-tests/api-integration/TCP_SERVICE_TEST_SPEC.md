# TCP Service - Test Specification

## Application Overview

The TCP Service feature in WSO2 Integrator: BI allows users to create TCP services that can listen on a specific port and handle TCP connections. The service can be configured with a port and listener name.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **TCP Service** option in Artifacts menu (marked as Beta)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service

### Form Fields
- **Port** input field (required, type: int)
- **Listener Name** input field (optional)
- **Advanced Configurations** expandable section (if available)

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **TCP Service** tree item
- **Listeners** section
- **TCP Listener** tree item

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="tcp-service-option"`
2. `data-testid="tcp-port-input"`
3. `data-testid="tcp-listener-name-input"`
4. `data-testid="create-tcp-service-button"`
5. `data-testid="configure-tcp-service-button"`
6. `data-testid="delete-tcp-service-button"`

---

## Test Scenarios

### 1. Create TCP Service

**Description:** Creates TCP service with port config

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing TCP service on the same port

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Integration as API" section, click on "TCP Service" option (marked as Beta)
6. Verify the "Create TCP Service" form is displayed
7. Locate the "Port" input field
8. Enter port number "8080" in the Port field
9. (Optional) Enter listener name "tcpListener" in the Listener Name field
10. Click on "Advanced Configurations" to expand (if available)
11. Click on "Create" button
12. Verify the service is created successfully

**Expected Results:**
- TCP Service is created with port "8080"
- Service appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Port shows as "8080"
- Listener appears in "Listeners" section (if listener name was provided)

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- TCP Service option: `div:has-text("TCP Service")` (in Artifacts menu)
- Port input: `input[name*="Port"]` or `textbox[name*="Port"]`
- Listener Name input: `input[name*="Listener"]` or `textbox[name*="Listener Name"]`
- Create button: `button:has-text("Create")`
- Service tree item: `treeitem:has-text("TCP Service")`

---

### 2. Edit TCP Service Port

**Description:** Modify TCP listener port

**Prerequisites:**
- TCP Service exists

**Steps:**
1. Verify TCP Service exists in the "Entry Points" section
2. Click on the service tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the service configuration form is displayed
5. Locate the "Port" input field
6. Clear the existing port value
7. Type new port number "9090"
8. Click on "Save" or "Create" button (verify the actual button text)
9. Verify the service is updated

**Expected Results:**
- TCP Service port is updated to "9090"
- Service designer shows the new port
- Listener configuration reflects the updated port

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Port input: `input[name*="Port"]` or `textbox[name*="Port"]`
- Save/Create button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Delete TCP Service

**Description:** Delete service and verify cleanup

**Prerequisites:**
- TCP Service exists

**Steps:**
1. Verify TCP Service exists in the "Entry Points" section
2. Click on the service tree item
3. Verify the service is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the service is removed

**Expected Results:**
- TCP Service is deleted
- Service no longer appears in the "Entry Points" section
- Service file is removed from the project (if applicable)
- Listener is removed from "Listeners" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Service tree item: `treeitem:has-text("TCP Service")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 4. Create TCP Service with Invalid Port

**Steps:**
1. Click on "Add Artifact" → "TCP Service"
2. Leave "Port" empty or enter invalid port (e.g., "abc", "-1", "0")
3. Click on "Create" button
4. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Service is not created
- Error message indicates the issue with port

### 5. Create TCP Service with Duplicate Port

**Steps:**
1. Create TCP Service with port "8080"
2. Try to create another TCP Service with port "8080"
3. Verify error or warning is displayed

**Expected Results:**
- Error or warning indicates port conflict
- Second service is not created (or appropriate handling)

### 6. Create TCP Service with Custom Listener Name

**Steps:**
1. Click on "Add Artifact" → "TCP Service"
2. Enter port "8080"
3. Enter listener name "myCustomTCPListener"
4. Click on "Create" button
5. Verify the service is created with custom listener name

**Expected Results:**
- TCP Service is created with custom listener name
- Listener appears in "Listeners" section with name "myCustomTCPListener"

### 7. Cancel TCP Service Creation

**Steps:**
1. Click on "Add Artifact" → "TCP Service"
2. Enter port "8080"
3. Click on "Cancel" button
4. Verify form is closed

**Expected Results:**
- Service creation form is closed
- No service is created
- Project tree remains unchanged

---

## Test Data

### Valid Ports
- 8080
- 9090
- 3000
- 5000
- 9999

### Invalid Ports
- Empty value
- "abc" (non-numeric)
- "-1" (negative)
- "0" (zero)
- "65536" (out of range, if validation exists)

### Valid Listener Names
- "tcpListener"
- "myTCPListener"
- "tcpListener1"
- "customListener"

### Invalid Listener Names
- Empty string (if required)
- Names with special characters (if validation exists)

---

## Notes

1. TCP Service is marked as Beta feature
2. Port field accepts integer values only (typically 1-65535)
3. Listener name may be optional or auto-generated if not provided
4. Port conflicts should be handled appropriately
5. Delete operations may require confirmation - handle dialogs appropriately
6. Service may need to be stopped before deletion
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
8. TCP Service configuration may differ from HTTP Service in terms of available options

