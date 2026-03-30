# Directory Integration - Test Specification

## Application Overview

The Directory Integration feature in WSO2 Integrator: BI allows users to create services that monitor a local directory for file events. The integration can be configured with directory path, recursive monitoring, and event handlers.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Directory Service** option in Artifacts menu (under "File Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers
  - Handler option: "onFileChange" (similar to FTP)

### Form Fields
- **Path** textbox (required, type: string)
  - Description: "Directory path to be monitored."
  - Has Text/Expression toggle
  - No default value (empty by default)
- **Recursive** checkbox (optional, type: boolean)
  - Description: "Recursively monitor all sub-directories"
  - Default: unchecked (false)
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "fileListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **Directory Service** tree item (file:Service)
- **onFileChange** tree item (under Directory Service)
- **Listeners** section
- **fileListener** tree item (under Listeners, file:Listener)
- **Event Handlers** section (in service designer):
  - Shows "No event handlers found. Add a new event handler." when empty
  - Handler items appear as cards with Event name and Configure/Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="directory-service-option"`
2. `data-testid="directory-path-input"`
3. `data-testid="directory-path-text-toggle"`
4. `data-testid="directory-path-expression-toggle"`
5. `data-testid="directory-recursive-checkbox"`
6. `data-testid="directory-listener-name-input"`
7. `data-testid="add-handler-button"`
8. `data-testid="on-file-change-handler-option"`
9. `data-testid="create-directory-service-button"`
10. `data-testid="configure-directory-service-button"`
11. `data-testid="delete-directory-service-button"`

---

## Test Scenarios

### 1. Create Directory Integration

**Description:** Creates local directory watcher

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing Directory integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "File Integration" section, click on "Directory Service" option
6. Verify the "Create Directory Service" form is displayed
7. Locate the "Path" input field
8. Verify "Text" mode is selected by default
9. Verify path field is empty by default
10. Enter directory path "/tmp/monitor" in the Path field
11. Locate the "Recursive" checkbox
12. Verify checkbox is unchecked by default
13. (Optional) Check the "Recursive" checkbox to enable recursive monitoring
14. Click on "Advanced Configurations" to expand
15. Verify "Listener Name" field has default value "fileListener"
16. (Optional) Modify listener name to "myDirectoryListener"
17. Click on "Create" button
18. Verify the integration is created successfully

**Expected Results:**
- Directory Service is created with specified configuration
- Integration appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Listener shows as "fileListener" (or custom name)
- Path shows as "/tmp/monitor" (or entered path)
- Recursive setting is reflected (if enabled)
- Event Handlers section shows "No event handlers found" message

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- Directory Service option: `div:has-text("Directory Service")` (in Artifacts menu, under File Integration)
- Path input: `textbox[name="Path"]`
- Recursive checkbox: `checkbox[name="Recursive"]` or `input[type="checkbox"]`
- Create button: `button:has-text("Create")`

---

### 2. Edit Directory Integration

**Description:** Modify directory path config

**Prerequisites:**
- Directory integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Click on the "Configure" button (⚙️ icon)
3. Verify the edit form is displayed with current values
4. Locate the "Path" input field
5. Verify current path value is displayed
6. Modify path value to "/new/monitor/path"
7. Locate the "Recursive" checkbox
8. Toggle recursive setting (check if unchecked, uncheck if checked)
9. Click on "Advanced Configurations" to expand
10. Locate the "Listener Name" field
11. (Optional) Modify listener name
12. Click on "Create" or "Save" button (if available)
13. Verify changes are saved

**Expected Results:**
- Directory Service configuration is updated
- New path value is reflected in the service designer
- Recursive setting is updated
- Listener name is updated (if changed)
- Service continues to function with new configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Path input: `textbox[name="Path"]`
- Recursive checkbox: `checkbox[name="Recursive"]`
- Listener Name input: `textbox[name="Listener Name"]`

---

### 3. Configure File Filter

**Description:** Set file type filter

**Prerequisites:**
- Directory integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Verify service designer view is displayed
3. Click on the "Configure" button
4. Verify the edit form is displayed
5. Locate the "Path" input field
6. Verify current path value
7. Modify path to include file filter pattern (e.g., "/tmp/monitor/*.txt" or "/data/**/*.csv")
8. Toggle between "Text" and "Expression" modes if needed
9. If using Expression mode, enter filter expression
10. (Optional) Use wildcards or regex patterns if supported
11. Click on "Create" or "Save" button
12. Verify filter is saved

**Expected Results:**
- File filter is configured in the path
- Path value reflects the filter pattern (e.g., "/tmp/monitor/*.txt")
- Service will monitor only files matching the specified filter
- Filter is applied when processing files

**Element Identifiers:**
- Path input: `textbox[name="Path"]`
- Text/Expression toggle: `button:has-text("Text")` and `button:has-text("Expression")`

---

### 4. Enable Recursive Monitoring

**Description:** Enable recursive monitoring of sub-directories

**Prerequisites:**
- Directory integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Click on the "Configure" button
3. Verify the edit form is displayed
4. Locate the "Recursive" checkbox
5. Verify current recursive setting
6. Check the "Recursive" checkbox (if unchecked)
7. Verify checkbox is checked
8. Click on "Create" or "Save" button
9. Verify recursive setting is saved

**Expected Results:**
- Recursive monitoring is enabled
- Service will monitor the specified directory and all sub-directories
- Recursive setting is reflected in the service designer view

**Element Identifiers:**
- Recursive checkbox: `checkbox[name="Recursive"]` or `input[type="checkbox"]`

---

### 5. Disable Recursive Monitoring

**Description:** Disable recursive monitoring (monitor only top-level directory)

**Prerequisites:**
- Directory integration exists with recursive monitoring enabled
- Service designer view is accessible

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Click on the "Configure" button
3. Verify the edit form is displayed
4. Locate the "Recursive" checkbox
5. Verify checkbox is checked
6. Uncheck the "Recursive" checkbox
7. Verify checkbox is unchecked
8. Click on "Create" or "Save" button
9. Verify recursive setting is saved

**Expected Results:**
- Recursive monitoring is disabled
- Service will monitor only the specified directory (not sub-directories)
- Recursive setting is reflected in the service designer view

**Element Identifiers:**
- Recursive checkbox: `checkbox[name="Recursive"]` or `input[type="checkbox"]`

---

### 6. Add File Handler - onFileChange

**Description:** Add onFileChange handler for file events

**Prerequisites:**
- Directory integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the Directory Service in the project tree
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
- Handler appears in the project tree under Directory Service
- Handler can be configured or deleted

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")`
- onFileChange handler option: `div:has-text("onFileChange")` or `paragraph:has-text("onFileChange")`
- Handler card: `div:has-text("Event: onFileChange")`

---

### 7. Configure Handler with File Filter

**Description:** Configure handler to filter files by type

**Prerequisites:**
- Directory integration exists with onFileChange handler
- Handler is added

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Click on the onFileChange handler
3. Verify handler configuration view is displayed
4. Look for file filter or file type configuration options
5. Configure filter to accept only specific file types (e.g., "*.txt", "*.csv")
6. Verify filter is saved
7. (Optional) Test with different file types

**Expected Results:**
- File filter can be configured for the handler
- Filter is saved and applied
- Only files matching the filter are processed by the handler

**Element Identifiers:**
- Handler configuration view: (specific to handler implementation)
- File filter options: (specific to handler implementation)

---

### 8. Delete Directory Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- Directory integration exists in the project

**Steps:**
1. Navigate to the Directory Service in the project tree
2. Locate the Delete button (🗑️ icon) in the service toolbar
3. Click on the Delete button
4. Verify confirmation dialog is displayed (if applicable)
5. Confirm deletion
6. Verify the integration is removed from the project tree
7. Verify the service designer view is closed or shows "No service selected"
8. Verify listener is removed from Listeners section
9. Verify all handlers are removed

**Expected Results:**
- Directory Service is deleted successfully
- Integration is removed from Entry Points section
- Listener is removed from Listeners section
- All associated handlers are removed
- Service designer view is cleared
- No orphaned resources remain

**Element Identifiers:**
- Delete button: `button[aria-label*="Delete"]` or button with delete icon
- Confirmation dialog: (if applicable)

---

### 9. Create Directory Integration with Expression Path

**Description:** Create integration using expression for path

**Prerequisites:**
- BI extension is active
- Test project is open

**Steps:**
1. Click on the "Add Artifact" button
2. Under "File Integration" section, click on "Directory Service" option
3. Verify the "Create Directory Service" form is displayed
4. Locate the "Path" input field
5. Click on "Expression" toggle (switch from "Text" to "Expression")
6. Verify expression mode is active
7. Enter path expression (e.g., `config:getAsString("monitor.path")` or similar)
8. Verify expression is entered correctly
9. Configure other fields (Recursive, Listener Name) as needed
10. Click on "Create" button
11. Verify the integration is created successfully

**Expected Results:**
- Directory Service is created with expression path
- Expression is saved and evaluated at runtime
- Service designer view shows the expression path

**Element Identifiers:**
- Path Expression toggle: `button:has-text("Expression")`
- Path input: `textbox[name="Path"]`

---

### 10. Create Directory Integration with Recursive Enabled

**Description:** Create integration with recursive monitoring enabled

**Prerequisites:**
- BI extension is active
- Test project is open

**Steps:**
1. Click on the "Add Artifact" button
2. Under "File Integration" section, click on "Directory Service" option
3. Verify the "Create Directory Service" form is displayed
4. Enter directory path "/tmp/monitor"
5. Locate the "Recursive" checkbox
6. Check the "Recursive" checkbox
7. Verify checkbox is checked
8. Configure Listener Name if needed
9. Click on "Create" button
10. Verify the integration is created successfully

**Expected Results:**
- Directory Service is created with recursive monitoring enabled
- Service will monitor the directory and all sub-directories
- Recursive setting is reflected in the service designer view

**Element Identifiers:**
- Recursive checkbox: `checkbox[name="Recursive"]`
- Create button: `button:has-text("Create")`

---

## Notes

- Directory Service monitors local file system directories
- Path can be specified in Text or Expression mode
- Default listener name is "fileListener"
- Recursive monitoring is optional (disabled by default)
- Event handlers are added manually (not automatically created)
- Handler configuration options may vary based on implementation
- File filters can be configured using path patterns or handler-specific options

