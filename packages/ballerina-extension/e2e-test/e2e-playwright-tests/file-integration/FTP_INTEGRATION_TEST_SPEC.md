# FTP Integration - Test Specification

## Application Overview

The FTP Integration feature in WSO2 Integrator: BI allows users to create services that monitor a directory in an FTP server for file events. The integration can be configured with FTP server connection details, path, and event handlers.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **FTP Service** option in Artifacts menu (under "File Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers
  - Handler option: "onFileChange"

### Form Fields
- **Host** textbox (required, type: string)
  - Description: "Target FTP server url."
  - Default value: "127.0.0.1"
- **Port** textbox (required, type: int)
  - Description: "Target FTP server port."
  - Default value: "21"
  - Has helper panel and expand editor buttons
- **Protocol** combobox (required)
  - Description: "The protocol to connect to the FTP server"
  - Options:
    - ftp
    - sftp
  - Default: "ftp"
- **Path** textbox (required, type: string)
  - Description: "The path to be monitored."
  - Has Text/Expression toggle
  - Default value: "/"
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "ftpListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **FTP Service** tree item (ftp:Service)
- **onFileChange** tree item (under FTP Service)
- **Listeners** section
- **ftpListener** tree item (under Listeners, ftp:Listener)
- **Event Handlers** section (in service designer):
  - Shows "No event handlers found. Add a new event handler." when empty
  - Handler items appear as cards with Event name and Configure/Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="ftp-service-option"`
2. `data-testid="ftp-host-input"`
3. `data-testid="ftp-port-input"`
4. `data-testid="ftp-protocol-combobox"`
5. `data-testid="ftp-path-input"`
6. `data-testid="ftp-path-text-toggle"`
7. `data-testid="ftp-path-expression-toggle"`
8. `data-testid="ftp-listener-name-input"`
9. `data-testid="add-handler-button"`
10. `data-testid="on-file-change-handler-option"`
11. `data-testid="create-ftp-service-button"`
12. `data-testid="configure-ftp-service-button"`
13. `data-testid="delete-ftp-service-button"`

---

## Test Scenarios

### 1. Create FTP Integration

**Description:** Creates FTP file listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing FTP integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "File Integration" section, click on "FTP Service" option
6. Verify the "Create FTP Service" form is displayed
7. Locate the "Host" input field
8. Verify default value is "127.0.0.1"
9. (Optional) Modify host to "ftp.example.com"
10. Locate the "Port" input field
11. Verify default value is "21"
12. (Optional) Modify port to "2121"
13. Locate the "Protocol" combobox
14. Verify default value is "ftp"
15. (Optional) Change protocol to "sftp"
16. Locate the "Path" input field
17. Verify "Text" mode is selected by default
18. Verify default value is "/"
19. (Optional) Modify path to "/uploads"
20. Click on "Advanced Configurations" to expand
21. Verify "Listener Name" field has default value "ftpListener"
22. (Optional) Modify listener name to "myFtpListener"
23. Click on "Create" button
24. Verify the integration is created successfully

**Expected Results:**
- FTP Service is created with specified configuration
- Integration appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Listener shows as "ftpListener" (or custom name)
- Protocol shows as "ftp" (or "sftp" if changed)
- Event Handlers section shows "No event handlers found" message

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- FTP Service option: `div:has-text("FTP Service")` (in Artifacts menu, under File Integration)
- Host input: `input[placeholder*="Host"]` or `textbox[name="Host"]`
- Port input: `input[type="number"]` or `textbox[name="Port"]`
- Protocol combobox: `combobox[name="Protocol"]`
- Path input: `textbox[name="Path"]`
- Create button: `button:has-text("Create")`

---

### 2. Edit FTP Integration

**Description:** Modify FTP server config

**Prerequisites:**
- FTP integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Click on the "Configure" button (⚙️ icon)
3. Verify the edit form is displayed with current values
4. Locate the "Host" input field
5. Modify host value to "new-ftp.example.com"
6. Locate the "Port" input field
7. Modify port value to "2222"
8. Locate the "Protocol" combobox
9. Change protocol from "ftp" to "sftp" (or vice versa)
10. Locate the "Path" input field
11. Modify path value to "/new-path"
12. Click on "Advanced Configurations" to expand
13. Locate the "Listener Name" field
14. (Optional) Modify listener name
15. Click on "Create" or "Save" button (if available)
16. Verify changes are saved

**Expected Results:**
- FTP Service configuration is updated
- New host, port, protocol, and path values are reflected in the service designer
- Listener name is updated (if changed)
- Service continues to function with new configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Host input: `textbox[name="Host"]`
- Port input: `textbox[name="Port"]`
- Protocol combobox: `combobox[name="Protocol"]`
- Path input: `textbox[name="Path"]`

---

### 3. Configure File Pattern

**Description:** Set file matching pattern

**Prerequisites:**
- FTP integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Verify service designer view is displayed
3. Click on the "Configure" button
4. Verify the edit form is displayed
5. Locate the "Path" input field
6. Verify current path value
7. Modify path to include file pattern (e.g., "/uploads/*.txt" or "/data/**/*.csv")
8. Toggle between "Text" and "Expression" modes if needed
9. If using Expression mode, enter pattern expression
10. Click on "Create" or "Save" button
11. Verify pattern is saved

**Expected Results:**
- File pattern is configured in the path
- Path value reflects the pattern (e.g., "/uploads/*.txt")
- Service will monitor files matching the specified pattern

**Element Identifiers:**
- Path input: `textbox[name="Path"]`
- Text/Expression toggle: `button:has-text("Text")` and `button:has-text("Expression")`

---

### 4. Add File Handler - onCreate

**Description:** Add onCreate handler for file events

**Prerequisites:**
- FTP integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Verify service designer view is displayed
3. Locate the "Event Handlers" section
4. Verify "No event handlers found" message or existing handlers list
5. Click on the "Add Handler" button
6. Verify handler selection dialog is displayed
7. Locate the "onFileChange" handler option
8. Click on "onFileChange" handler option
9. Verify handler is added to the Event Handlers section
10. Verify handler card shows "Event: onFileChange"
11. Verify Configure and Delete buttons are available (may be disabled initially)

**Expected Results:**
- onFileChange handler is added successfully
- Handler appears in the Event Handlers section
- Handler appears in the project tree under FTP Service
- Handler can be configured or deleted

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")`
- onFileChange handler option: `div:has-text("onFileChange")` or `paragraph:has-text("onFileChange")`
- Handler card: `div:has-text("Event: onFileChange")`

---

### 5. Check if File Content is Filtered

**Description:** Verify file content filtering options

**Prerequisites:**
- FTP integration exists with onFileChange handler
- Handler is configured

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Click on the onFileChange handler
3. Verify handler configuration view is displayed
4. Look for file content filtering options
5. Check if there are options to filter by:
   - File size
   - File type/extension
   - File name pattern
   - Content type
6. Verify any filtering options are available and functional

**Expected Results:**
- File content filtering options are available (if supported)
- Filtering can be configured for the handler
- Filters are applied when processing files

**Element Identifiers:**
- Handler configuration view: (specific to handler implementation)
- Filter options: (specific to handler implementation)

---

### 6. Define a Content Type

**Description:** Set content type for file processing

**Prerequisites:**
- FTP integration exists with onFileChange handler
- Handler is configured

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Click on the onFileChange handler
3. Verify handler configuration view is displayed
4. Look for "Content Type" or "MIME Type" configuration option
5. Enter or select content type (e.g., "text/plain", "application/json", "text/csv")
6. Verify content type is saved
7. (Optional) Test with different content types

**Expected Results:**
- Content type can be defined for the handler
- Content type is saved and applied
- Files are processed according to the specified content type

**Element Identifiers:**
- Content Type input: (specific to handler implementation)

---

### 7. Enable Stream

**Description:** Enable streaming mode for file processing

**Prerequisites:**
- FTP integration exists with onFileChange handler
- Handler is configured

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Click on the onFileChange handler
3. Verify handler configuration view is displayed
4. Look for "Stream" or "Streaming" option
5. Enable streaming mode (toggle or checkbox)
6. Verify streaming is enabled
7. (Optional) Configure streaming options if available

**Expected Results:**
- Streaming mode can be enabled
- Streaming option is saved
- Files are processed in streaming mode

**Element Identifiers:**
- Stream toggle/checkbox: (specific to handler implementation)

---

### 8. Cannot Edit File Content Once Added

**Description:** Verify that file content cannot be edited after handler is added

**Prerequisites:**
- FTP integration exists with onFileChange handler
- Handler has been configured with file content

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Click on the onFileChange handler
3. Verify handler configuration view is displayed
4. Look for file content or file handling configuration
5. Attempt to edit file content settings
6. Verify edit options are disabled or not available
7. Verify error message if edit is attempted

**Expected Results:**
- File content configuration is read-only after handler is added
- Edit options are disabled or not available
- Appropriate message is shown if edit is attempted

**Element Identifiers:**
- File content configuration: (specific to handler implementation)

---

### 9. Add onDelete Handler

**Description:** Add onDelete handler for file deletion events

**Prerequisites:**
- FTP integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Verify service designer view is displayed
3. Locate the "Event Handlers" section
4. Click on the "Add Handler" button
5. Verify handler selection dialog is displayed
6. Check available handler options
7. Look for "onDelete" or similar deletion handler option
8. If available, click on the handler option
9. Verify handler is added
10. If not available, verify only "onFileChange" is available

**Expected Results:**
- If onDelete handler exists, it is added successfully
- Handler appears in the Event Handlers section
- If onDelete handler doesn't exist, verify only available handlers are shown

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")`
- Handler options: (in handler selection dialog)

---

### 10. Delete FTP Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- FTP integration exists in the project

**Steps:**
1. Navigate to the FTP Service in the project tree
2. Locate the Delete button (🗑️ icon) in the service toolbar
3. Click on the Delete button
4. Verify confirmation dialog is displayed (if applicable)
5. Confirm deletion
6. Verify the integration is removed from the project tree
7. Verify the service designer view is closed or shows "No service selected"
8. Verify listener is removed from Listeners section
9. Verify all handlers are removed

**Expected Results:**
- FTP Service is deleted successfully
- Integration is removed from Entry Points section
- Listener is removed from Listeners section
- All associated handlers are removed
- Service designer view is cleared
- No orphaned resources remain

**Element Identifiers:**
- Delete button: `button[aria-label*="Delete"]` or button with delete icon
- Confirmation dialog: (if applicable)

---

## Notes

- FTP Service supports both FTP and SFTP protocols
- Path can be specified in Text or Expression mode
- Default listener name is "ftpListener"
- Event handlers are added manually (not automatically created)
- Handler configuration options may vary based on implementation

