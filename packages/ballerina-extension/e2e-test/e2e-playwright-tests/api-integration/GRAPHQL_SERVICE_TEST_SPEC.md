# GraphQL Service - Test Specification

## Application Overview

The GraphQL Service feature in WSO2 Integrator: BI allows users to create GraphQL services from scratch or by importing a GraphQL schema. The service can be configured with a base path and port, and supports adding Query and Mutation resolvers.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **GraphQL Service** option in Artifacts menu (marked as Beta)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Try It** button (text: "Try It", icon: ▶️) - for testing service
- **Add Query** button (for adding query resolvers)
- **Add Mutation** button (for adding mutation resolvers)
- **Delete** button (icon: 🗑️) - for deleting service/resolver
- **Save** button (in resolver creation form)

### Form Fields
- **Service Contract** radio buttons:
  - "Design From Scratch" (default)
  - "Import GraphQL Schema"
- **Base Path** input field (required, default: "/graphql")
- **Port** input field (required, default: "8080", type: int)
- **Advanced Configurations** expandable section
- **Query/Mutation Name** input field
- **Resolver Configuration** fields

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **GraphQL Service - /{basePath}** tree item
- **Queries** section
- **Mutations** section

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="graphql-service-option"`
2. `data-testid="graphql-base-path-input"`
3. `data-testid="graphql-port-input"`
4. `data-testid="design-from-scratch-radio"`
5. `data-testid="import-graphql-schema-radio"`
6. `data-testid="create-graphql-service-button"`
7. `data-testid="configure-graphql-service-button"`
8. `data-testid="add-query-resolver-button"`
9. `data-testid="add-mutation-resolver-button"`
10. `data-testid="query-name-input"`
11. `data-testid="mutation-name-input"`
12. `data-testid="save-resolver-button"`
13. `data-testid="delete-graphql-service-button"`

---

## Test Scenarios

### 1. Create GraphQL Service

**Description:** Creates GraphQL service with schema

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing GraphQL service with base path "/graphql"

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Integration as API" section, click on "GraphQL Service" option (marked as Beta)
6. Verify the "Create GraphQL Service" form is displayed
7. Verify "Design From Scratch" radio button is selected by default
8. Verify "Base Path" input field has default value "/graphql"
9. Verify "Port" input field has default value "8080"
10. Click on "Advanced Configurations" to expand (if collapsed)
11. Click on "Create" button
12. Verify the service is created successfully

**Expected Results:**
- GraphQL Service is created with base path "/graphql" and port "8080"
- Service appears in the "Entry Points" section of the project tree as "GraphQL Service - /graphql"
- Service designer view is displayed
- Port shows as "8080"
- Base Path shows as "/graphql"
- Queries and Mutations sections are available

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- GraphQL Service option: `div:has-text("GraphQL Service")` (in Artifacts menu)
- Base Path input: `input[placeholder="/graphql"]` or `textbox[name*="Base Path"]`
- Port input: `textbox[value="8080"]` or `input[name*="Port"]`
- Create button: `button:has-text("Create")`
- Service tree item: `treeitem:has-text("GraphQL Service")`

---

### 2. Add Query Resolver

**Description:** Add query field to GraphQL schema

**Prerequisites:**
- GraphQL Service exists

**Steps:**
1. Verify GraphQL Service is open in the service designer
2. Locate the "Queries" section
3. Click on "Add Query" button (or similar action button)
4. Verify the query resolver creation form is displayed
5. Enter query name "getUser" in the "Query Name" input field
6. Configure query parameters if needed
7. Configure return type if needed
8. Click on "Save" button
9. Verify the query resolver is added successfully

**Expected Results:**
- Query resolver "getUser" is added to the GraphQL service
- Query appears in the Queries section
- Query can be used in GraphQL queries

**Element Identifiers:**
- Add Query button: `button:has-text("Add Query")` or `button[aria-label*="Add Query"]`
- Query Name input: `input[name*="Query Name"]` or `textbox[name*="Query"]`
- Save button: `button:has-text("Save")`

---

### 3. Add Mutation Resolver

**Description:** Add mutation field to GraphQL schema

**Prerequisites:**
- GraphQL Service exists

**Steps:**
1. Verify GraphQL Service is open in the service designer
2. Locate the "Mutations" section
3. Click on "Add Mutation" button (or similar action button)
4. Verify the mutation resolver creation form is displayed
5. Enter mutation name "createUser" in the "Mutation Name" input field
6. Configure mutation parameters if needed
7. Configure return type if needed
8. Click on "Save" button
9. Verify the mutation resolver is added successfully

**Expected Results:**
- Mutation resolver "createUser" is added to the GraphQL service
- Mutation appears in the Mutations section
- Mutation can be used in GraphQL mutations

**Element Identifiers:**
- Add Mutation button: `button:has-text("Add Mutation")` or `button[aria-label*="Add Mutation"]`
- Mutation Name input: `input[name*="Mutation Name"]` or `textbox[name*="Mutation"]`
- Save button: `button:has-text("Save")`

---

### 4. Edit GraphQL Resolver

**Description:** Modify existing resolver

**Prerequisites:**
- GraphQL Service exists with at least one query or mutation resolver

**Steps:**
1. Verify GraphQL Service has resolvers listed
2. Locate the resolver to edit (e.g., query "getUser")
3. Click on the resolver item or edit icon (if available)
4. Verify the resolver configuration form is displayed
5. Modify the resolver name or configuration
6. Update parameters or return type if needed
7. Click on "Save" button
8. Verify the resolver is updated

**Expected Results:**
- Resolver configuration is updated
- Resolver in the list shows the updated configuration
- Service maintains the updated resolver

**Element Identifiers:**
- Resolver item: resolver list item in Queries or Mutations section
- Edit button: `button[aria-label*="Edit"]` or edit icon
- Save button: `button:has-text("Save")`

**Note:** If direct editing is not available, the resolver may need to be deleted and recreated with the new configuration.

---

### 5. Delete GraphQL Service

**Description:** Delete service and verify cleanup

**Prerequisites:**
- GraphQL Service exists

**Steps:**
1. Verify GraphQL Service exists in the "Entry Points" section
2. Click on the service tree item "GraphQL Service - /graphql" (or current base path)
3. Verify the service is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the service is removed

**Expected Results:**
- GraphQL Service is deleted
- Service no longer appears in the "Entry Points" section
- Service file is removed from the project (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Service tree item: `treeitem:has-text("GraphQL Service")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 6. Create GraphQL Service with Custom Port

**Steps:**
1. Click on "Add Artifact" → "GraphQL Service"
2. Enter base path "/api/graphql"
3. Change port from "8080" to "9090"
4. Click on "Create" button
5. Verify the service is created with custom port

**Expected Results:**
- GraphQL Service is created with port "9090"
- Service designer shows the custom port

### 7. Create GraphQL Service by Importing Schema

**Steps:**
1. Click on "Add Artifact" → "GraphQL Service"
2. Click on "Import GraphQL Schema" radio button
3. Verify file upload or schema input field appears
4. Upload or paste GraphQL schema
5. Verify schema is parsed and displayed
6. Click on "Create" button
7. Verify the service is created with imported schema

**Expected Results:**
- GraphQL Service is created with imported schema
- Queries and mutations from schema are available

### 8. Add Query Resolver Without Name

**Steps:**
1. Open GraphQL Service
2. Click on "Add Query"
3. Leave "Query Name" empty
4. Verify "Save" button is disabled
5. Try to click "Save" (should not work)

**Expected Results:**
- Save button remains disabled
- Query resolver is not created
- Form indicates required field

### 9. Delete Query Resolver

**Steps:**
1. Open GraphQL Service with existing query resolver
2. Locate the query resolver in Queries section
3. Click on delete button or right-click and select "Delete"
4. Confirm deletion if prompted
5. Verify resolver is removed

**Expected Results:**
- Query resolver is removed
- Resolver no longer appears in Queries section

---

## Test Data

### Valid Base Paths
- "/graphql"
- "/api/graphql"
- "/graphql/v1"
- "/gql"

### Valid Ports
- 8080 (default)
- 9090
- 3000
- 5000

### Valid Query Names
- "getUser"
- "getUsers"
- "getProduct"
- "getProducts"

### Valid Mutation Names
- "createUser"
- "updateUser"
- "deleteUser"
- "createProduct"

### Invalid Ports
- Empty value
- Non-numeric value
- Negative number
- Port 0

---

## Notes

1. GraphQL Service is marked as Beta feature
2. Port field accepts integer values only
3. Query and Mutation resolvers may have different configuration options
4. Import GraphQL Schema option may require file upload or schema text input
5. Resolver editing may require clicking on the resolver item first
6. Delete operations may require confirmation - handle dialogs appropriately
7. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)

