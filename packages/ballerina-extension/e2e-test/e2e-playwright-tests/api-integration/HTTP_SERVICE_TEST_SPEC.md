# HTTP Service - Test Specification

## Application Overview

The HTTP Service feature in WSO2 Integrator: BI allows users to create REST APIs from scratch or by importing an OpenAPI definition. The service can be configured with a base path, custom listeners, and resources with various HTTP methods (GET, POST, PUT, DELETE, PATCH).

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **HTTP Service** option in Artifacts menu
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Try It** button (text: "Try It", icon: ▶️) - for testing service
- **Add Resource** button (text: "Add Resource", icon: ➕)
- **Delete** button (icon: 🗑️) - for deleting service/resource
- **Save** button (in resource creation form)
- **Cancel** button (in resource creation form)

### Form Fields
- **Service Contract** radio buttons:
  - "Design From Scratch" (default)
  - "Import From OpenAPI Specification"
- **Service Base Path** input field (required, placeholder: "/")
- **Advanced Configurations** expandable section:
  - **Listener Configuration** radio buttons:
    - "Shared Listener (Port 9090)" (default)
    - "Custom Listener"
- **HTTP Method** selection (GET, POST, PUT, DELETE, PATCH, DEFAULT)
- **Resource Path** input field (required, placeholder: "path/foo")
- **Path Param** button
- **Query Parameter** button
- **Header** button
- **Responses** section with default 200 response
- **Add more resources** checkbox

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **HTTP Service - /{basePath}** tree item
- **Listeners** section
- **httpDefaultListener** tree item

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="add-artifact-button"`
2. `data-testid="http-service-option"`
3. `data-testid="service-base-path-input"`
4. `data-testid="design-from-scratch-radio"`
5. `data-testid="import-openapi-radio"`
6. `data-testid="advanced-configurations-expand"`
7. `data-testid="shared-listener-radio"`
8. `data-testid="custom-listener-radio"`
9. `data-testid="create-service-button"`
10. `data-testid="configure-service-button"`
11. `data-testid="add-resource-button"`
12. `data-testid="http-method-get"`
13. `data-testid="http-method-post"`
14. `data-testid="resource-path-input"`
15. `data-testid="save-resource-button"`
16. `data-testid="delete-service-button"`

---

## Test Scenarios

### 1. Create HTTP Service with Default Config

**Description:** Creates HTTP service with base path

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing HTTP service with base path "/"

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button (or use the ➕ icon in the toolbar)
4. Verify the Artifacts menu is displayed
5. Under "Integration as API" section, click on "HTTP Service" option
6. Verify the "Create HTTP Service" form is displayed
7. Verify "Design From Scratch" radio button is selected by default
8. Verify "Service Base Path" input field has default value "/"
9. Click on "Advanced Configurations" to expand (if collapsed)
10. Verify "Shared Listener (Port 9090)" radio button is selected by default
11. Click on "Create" button
12. Verify the service is created successfully

**Expected Results:**
- HTTP Service is created with base path "/"
- Service appears in the "Entry Points" section of the project tree as "HTTP Service - /"
- Service designer view is displayed
- Listener shows as "httpDefaultListener"
- Base Path shows as "/"
- Resources section shows "No resources found. Add a new resource."

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- HTTP Service option: `div:has-text("HTTP Service")` (in Artifacts menu)
- Service Base Path input: `input[placeholder="/"]` or `textbox[name*="Service Base Path"]`
- Create button: `button:has-text("Create")`
- Service tree item: `treeitem:has-text("HTTP Service - /")`

---

### 2. Edit HTTP Service Base Path

**Description:** Edits existing service base path

**Prerequisites:**
- HTTP Service exists with base path "/"

**Steps:**
1. Verify HTTP Service exists in the "Entry Points" section
2. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
3. Verify the service configuration form is displayed
4. Locate the "Service Base Path" input field
5. Clear the existing value "/"
6. Type new base path "/api/v1"
7. Click on "Create" or "Save" button (verify the actual button text)
8. Verify the service is updated

**Expected Results:**
- Service base path is updated to "/api/v1"
- Service tree item updates to "HTTP Service - /api/v1"
- Base Path in service designer shows "/api/v1"

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Service Base Path input: `input[placeholder="/"]` or `textbox[name*="Service Base Path"]`
- Save/Create button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Add GET Resource to HTTP Service

**Description:** Add GET method resource with path

**Prerequisites:**
- HTTP Service exists

**Steps:**
1. Verify HTTP Service is open in the service designer
2. Scroll to the "Resources" section
3. Verify "No resources found. Add a new resource." message is displayed
4. Click on "Add Resource" button (➕ icon)
5. Verify the "Select HTTP Method to Add" dialog is displayed
6. Verify HTTP methods are displayed: GET, POST, PUT, DELETE, PATCH, DEFAULT
7. Click on "GET" option
8. Verify the "New Resource Configuration" form is displayed
9. Verify "HTTP Method" shows "GET" (read-only)
10. Locate the "Resource Path" input field
11. Type resource path "users" in the input field
12. Verify "Save" button is enabled (after entering path)
13. Click on "Save" button
14. Verify the resource is added successfully

**Expected Results:**
- GET resource with path "users" is added to the service
- Resource appears in the Resources section
- Resource shows method "GET" and path "users"
- "No resources found" message is no longer displayed

**Element Identifiers:**
- Add Resource button: `button:has-text("Add Resource")` or `button[aria-label*="Add Resource"]`
- GET method option: `div:has-text("GET")` or `button:has-text("GET")`
- Resource Path input: `input[placeholder*="path/foo"]` or `textbox[name*="Resource Path"]`
- Save button: `button:has-text("Save")`

---

### 4. Add POST Resource to HTTP Service

**Description:** Add POST method resource with body

**Prerequisites:**
- HTTP Service exists

**Steps:**
1. Verify HTTP Service is open in the service designer
2. Click on "Add Resource" button
3. Verify the HTTP method selection dialog is displayed
4. Click on "POST" option
5. Verify the "New Resource Configuration" form is displayed
6. Verify "HTTP Method" shows "POST"
7. Type resource path "users" in the "Resource Path" input field
8. (Optional) Click on "Path Param" button to add path parameters
9. (Optional) Click on "Query Parameter" button to add query parameters
10. (Optional) Click on "Header" button to add headers
11. Verify the "Responses" section shows default "200" response
12. Click on "Save" button
13. Verify the resource is added successfully

**Expected Results:**
- POST resource with path "users" is added to the service
- Resource appears in the Resources section with method "POST"
- Resource can be configured with request body (if applicable)

**Element Identifiers:**
- POST method option: `div:has-text("POST")` or `button:has-text("POST")`
- Path Param button: `button:has-text("Path Param")`
- Query Parameter button: `button:has-text("Query Parameter")`
- Header button: `button:has-text("Header")`
- Save button: `button:has-text("Save")`

---

### 5. Edit Resource Path

**Description:** Modify existing resource path

**Prerequisites:**
- HTTP Service exists with at least one resource

**Steps:**
1. Verify HTTP Service has resources listed in the Resources section
2. Locate the resource to edit (e.g., GET /users)
3. Click on the resource item or edit icon (if available)
4. Verify the resource configuration form is displayed
5. Locate the "Resource Path" input field
6. Clear the existing path value
7. Type new path "customers"
8. Click on "Save" button
9. Verify the resource path is updated

**Expected Results:**
- Resource path is updated from "users" to "customers"
- Resource in the list shows the new path
- Service maintains the updated resource configuration

**Element Identifiers:**
- Resource item: `div:has-text("GET")` or resource list item
- Resource Path input: `input[placeholder*="path/foo"]` or `textbox[name*="Resource Path"]`
- Save button: `button:has-text("Save")`

**Note:** If direct editing is not available, the resource may need to be deleted and recreated with the new path.

---

### 6. Delete Resource from Service

**Description:** Remove resource from HTTP service

**Prerequisites:**
- HTTP Service exists with at least one resource

**Steps:**
1. Verify HTTP Service has resources listed
2. Locate the resource to delete (e.g., GET /users)
3. Hover over the resource item to reveal action buttons
4. Click on the "Delete" button (🗑️ icon) or right-click and select "Delete"
5. If confirmation dialog appears, confirm the deletion
6. Verify the resource is removed

**Expected Results:**
- Resource is removed from the service
- Resource no longer appears in the Resources section
- If no resources remain, "No resources found. Add a new resource." message is displayed

**Element Identifiers:**
- Delete button: `button[aria-label*="Delete"]` or `button:has-text("Delete")`
- Resource item: resource list item in Resources section

---

### 7. Delete HTTP Service

**Description:** Delete entire service and verify cleanup

**Prerequisites:**
- HTTP Service exists

**Steps:**
1. Verify HTTP Service exists in the "Entry Points" section
2. Click on the service tree item "HTTP Service - /" (or current base path)
3. Verify the service is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the service is removed

**Expected Results:**
- HTTP Service is deleted
- Service no longer appears in the "Entry Points" section
- Service file is removed from the project (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Service tree item: `treeitem:has-text("HTTP Service")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

### 8. Create HTTP Service with Custom Listener

**Description:** Configure custom port and listener name

**Prerequisites:**
- BI extension is active
- Test project is open

**Steps:**
1. Click on "Add Artifact" button
2. Click on "HTTP Service" option
3. Verify the service creation form is displayed
4. Enter base path "/api" in the "Service Base Path" field
5. Click on "Advanced Configurations" to expand
6. Click on "Custom Listener" radio button
7. Verify additional fields appear for custom listener configuration (port, listener name)
8. Enter custom port "8080" (if field is available)
9. Enter listener name "customHttpListener" (if field is available)
10. Click on "Create" button
11. Verify the service is created with custom listener

**Expected Results:**
- HTTP Service is created with custom listener configuration
- Service appears in "Entry Points" section
- Listener appears in "Listeners" section with custom name
- Service designer shows the custom listener name

**Element Identifiers:**
- Custom Listener radio: `radio:has-text("Custom Listener")` or `input[value="custom"]`
- Port input: `input[name*="port"]` or `textbox[name*="Port"]`
- Listener name input: `input[name*="listener"]` or `textbox[name*="Listener Name"]`
- Create button: `button:has-text("Create")`

---

## Additional Test Scenarios (Edge Cases)

### 9. Create HTTP Service with Invalid Base Path

**Steps:**
1. Click on "Add Artifact" → "HTTP Service"
2. Leave "Service Base Path" empty or enter invalid path (e.g., "invalid path")
3. Click on "Create" button
4. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Service is not created
- Error message indicates the issue with base path

### 10. Add Resource Without Path

**Steps:**
1. Open existing HTTP Service
2. Click on "Add Resource" → "GET"
3. Leave "Resource Path" empty
4. Verify "Save" button is disabled
5. Try to click "Save" (should not work)

**Expected Results:**
- Save button remains disabled
- Resource is not created
- Form indicates required field

### 11. Cancel Resource Creation

**Steps:**
1. Open HTTP Service
2. Click on "Add Resource" → "GET"
3. Enter resource path "test"
4. Click on "Cancel" button
5. Verify form is closed

**Expected Results:**
- Resource creation form is closed
- No resource is added
- Resources section remains unchanged

---

## Test Data

### Valid Base Paths
- "/"
- "/api"
- "/api/v1"
- "/users"
- "/products/v1"

### Invalid Base Paths
- Empty string
- "invalid path" (spaces)
- "no-leading-slash"

### Valid Resource Paths
- "users"
- "users/{id}"
- "products"
- "api/customers"

### HTTP Methods
- GET
- POST
- PUT
- DELETE
- PATCH
- DEFAULT

---

## Notes

1. Some UI elements may use icons instead of text labels - test selectors should account for both
2. The service designer may load asynchronously - add appropriate waits
3. Resource editing may require clicking on the resource item first
4. Delete operations may require confirmation - handle dialogs appropriately
5. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)

