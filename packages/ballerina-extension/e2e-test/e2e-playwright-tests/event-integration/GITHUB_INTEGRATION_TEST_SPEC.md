# GitHub Event Integration - Test Specification

## Application Overview

The GitHub Event Integration feature in WSO2 Integrator: BI allows users to create services that receive webhooks from GitHub. The integration can be configured with GitHub connection settings, webhook endpoints, and specific event types.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **GitHub Event Integration** option in Artifacts menu (under "Event Integration" section, marked as Beta)
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
    - IssuesService
    - IssueCommentService
    - PullRequestService
    - PullRequestReviewService
    - PullRequestReviewCommentService
    - ReleaseService
    - LabelService
    - MilestoneService
    - PushService
    - ProjectCardService
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "githubListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **github:IssuesService** or other service tree item (based on Event Channel selected, e.g., github:IssueCommentService, github:PullRequestService, etc.)
- Handler tree items (automatically created based on Event Channel):
  - For IssuesService: onOpened, onClosed, onReopened, onAssigned, onUnassigned, onLabeled, onUnlabeled
  - For other Event Channels: (handler names differ based on channel)
- **Listeners** section
- **githubListener** tree item (under Listeners)
- **Event Handlers** section (in service designer):
  - Shows predefined handlers based on selected Event Channel
  - Displays "Event Channel: [SelectedChannel]" (e.g., "Event Channel: IssuesService")
  - Each handler has Configure and Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="github-integration-option"`
2. `data-testid="github-token-input"`
3. `data-testid="github-repository-input"`
4. `data-testid="github-webhook-path-input"`
5. `data-testid="github-webhook-secret-input"`
6. `data-testid="github-event-types-select"`
7. `data-testid="github-event-type-push-checkbox"`
8. `data-testid="github-event-type-pull-request-checkbox"`
9. `data-testid="add-event-type-button"`
10. `data-testid="create-github-integration-button"`
11. `data-testid="configure-github-integration-button"`
12. `data-testid="delete-github-integration-button"`

---

## Test Scenarios

### 1. Create GitHub Integration

**Description:** Creates GitHub webhook listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing GitHub integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Event Integration" section, click on "GitHub Event Integration" option (marked as Beta)
6. Wait for the GitHub package to be pulled (if first time)
7. Verify the "Create GitHub Event Integration" form is displayed
8. Locate the "Event Channel" combobox field
9. Verify the dropdown shows multiple options: IssuesService, IssueCommentService, PullRequestService, PullRequestReviewService, PullRequestReviewCommentService, ReleaseService, LabelService, MilestoneService, PushService, ProjectCardService
10. Select "IssuesService" from the Event Channel dropdown (or another channel for different event types)
11. Click on "Advanced Configurations" to expand
12. Verify "Listener Name" field has default value "githubListener"
13. (Optional) Modify listener name to "myGitHubListener"
14. Click on "Create" button
15. Verify the integration is created successfully

**Expected Results:**
- GitHub Event Integration is created with selected Event Channel
- Integration appears in the "Entry Points" section of the project tree as "github:IssuesService" (or other service name based on Event Channel)
- Service designer view is displayed
- Listener shows as "githubListener"
- Event Channel shows as "IssuesService" (or selected channel)
- Event Handlers section shows predefined handlers based on Event Channel:
  - For IssuesService: onOpened, onClosed, onReopened, onAssigned, onUnassigned, onLabeled, onUnlabeled
  - For other Event Channels: (handler names differ based on channel)
- Handlers appear as tree items under the service
- Event Channel is set
- Service designer view is displayed
- Webhook path shows as "/github/webhook"
- Selected event types are configured
- Listener name is set

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- GitHub Event Integration option: `div:has-text("GitHub Event Integration")` (in Artifacts menu)
- GitHub Token input: `textbox[name*="Token"]` or `input[name*="GitHub Token"]`
- Webhook Path input: `textbox[name*="Webhook Path"]` or `input[name*="Path"]`
- Event Types checkboxes: `checkbox[value="push"]` or `input[type="checkbox"][name*="Event"]`
- Create button: `button:has-text("Create")`
- Integration tree item: `treeitem:has-text("GitHub")`

---

### 2. Edit GitHub Integration

**Description:** Modify GitHub webhook config

**Prerequisites:**
- GitHub Event Integration exists

**Steps:**
1. Verify GitHub Event Integration exists in the "Entry Points" section
2. Click on the integration tree item to open service designer
3. Click on the "Configure" button (⚙️ icon) in the service designer toolbar
4. Verify the integration configuration form is displayed
5. Update GitHub token if needed
6. Update repository if needed
7. Locate the "Webhook Path" input field
8. Update webhook path to "/github/updated-webhook"
9. Update webhook secret if needed
10. Update event types selection if needed
11. Click on "Save" or "Create" button
12. Verify the integration is updated

**Expected Results:**
- GitHub integration configuration is updated
- Webhook path is updated to "/github/updated-webhook"
- Event types are updated (if changed)
- Service designer shows the updated configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Webhook Path input: `textbox[name*="Webhook Path"]`
- Event Types checkboxes: `checkbox[value="push"]` or event type inputs
- Save button: `button:has-text("Save")` or `button:has-text("Create")`

---

### 3. Configure Event Types

**Description:** Select specific GitHub events

**Prerequisites:**
- GitHub Event Integration exists

**Steps:**
1. Verify GitHub Event Integration is open in the service designer
2. Click on the "Configure" button
3. Verify the integration configuration form is displayed
4. Locate the "Event Types" section
5. Verify available event types are displayed (e.g., push, pull_request, issues, issue_comment, etc.)
6. Deselect currently selected event types (if any)
7. Select new event types:
   - Check "push" checkbox
   - Check "pull_request" checkbox
   - Check "issues" checkbox
8. Verify all selected event types are checked
9. Click on "Save" button
10. Verify the event types are configured

**Expected Results:**
- Event types are configured: "push", "pull_request", "issues"
- Integration will receive webhooks only for selected event types
- Service designer shows the configured event types
- Event type configuration is saved

**Element Identifiers:**
- Event Type "push" checkbox: `checkbox[value="push"]` or `input[type="checkbox"][name*="push"]`
- Event Type "pull_request" checkbox: `checkbox[value="pull_request"]` or `input[type="checkbox"][name*="pull_request"]`
- Event Type "issues" checkbox: `checkbox[value="issues"]` or `input[type="checkbox"][name*="issues"]`
- Save button: `button:has-text("Save")`

---

### 4. Delete GitHub Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- GitHub Event Integration exists

**Steps:**
1. Verify GitHub Event Integration exists in the "Entry Points" section
2. Click on the integration tree item
3. Verify the integration is selected
4. Locate the "Delete" button (🗑️ icon) in the toolbar or context menu
5. Click on "Delete" button
6. If confirmation dialog appears, confirm the deletion
7. Verify the integration is removed

**Expected Results:**
- GitHub Event Integration is deleted
- Integration no longer appears in the "Entry Points" section
- Integration file is removed from the project (if applicable)
- Connection is removed from "Connections" section (if applicable)
- Project tree updates to reflect the deletion

**Element Identifiers:**
- Integration tree item: `treeitem:has-text("GitHub")`
- Delete button: `button[aria-label*="Delete"]` or toolbar button with delete icon

---

## Additional Test Scenarios (Edge Cases)

### 5. Create GitHub Integration with Invalid Webhook Path

**Steps:**
1. Click on "Add Artifact" → "GitHub Event Integration"
2. Leave "Webhook Path" empty or enter invalid format
3. Select event types
4. Click on "Create" button
5. Verify validation error is displayed

**Expected Results:**
- Validation error message is shown
- Integration is not created
- Error message indicates webhook path is required or invalid

### 6. Create GitHub Integration with No Event Types Selected

**Steps:**
1. Click on "Add Artifact" → "GitHub Event Integration"
2. Enter valid webhook path
3. Do not select any event types
4. Click on "Create" button
5. Verify behavior (may allow creation with all events, or require at least one)

**Expected Results:**
- Either integration is created with all events (default)
- OR validation error indicates at least one event type is required

### 7. Configure All Event Types

**Steps:**
1. Open GitHub Integration
2. Click on "Configure"
3. Select all available event types
4. Click on "Save"
5. Verify all event types are configured

**Expected Results:**
- All event types are selected
- Integration receives webhooks for all GitHub events
- Configuration is saved

---

## Test Data

### Valid GitHub Tokens
- Personal Access Token format
- OAuth token format

### Valid Repository Formats
- "owner/repo"
- "github-username/repository-name"
- "organization/repository"

### Valid Webhook Paths
- "/github/webhook"
- "/webhooks/github"
- "/api/github/events"
- "/github/hooks"

### Invalid Webhook Paths
- Empty string
- Missing leading slash
- Invalid characters

### Valid Webhook Secrets
- Any string (used for webhook signature verification)
- Recommended: strong random string

### Available Event Types
- "push" - Repository push events
- "pull_request" - Pull request events
- "issues" - Issue events
- "issue_comment" - Issue comment events
- "create" - Branch/tag creation
- "delete" - Branch/tag deletion
- "release" - Release events
- "repository" - Repository events
- And more GitHub webhook event types

---

## Notes

1. GitHub Event Integration is marked as Beta feature
2. Webhook path determines the endpoint where GitHub will send webhooks
3. Event types can be selected to filter which events trigger the integration
4. If no event types are selected, integration may receive all events (default behavior)
5. Webhook secret is optional but recommended for security (signature verification)
6. GitHub token is optional but may be required for private repositories
7. Repository field is optional - webhook can be configured at organization level
8. Delete operations may require confirmation - handle dialogs appropriately
9. Test IDs are recommended but may not be present - use alternative selectors (text, aria-labels, etc.)
10. GitHub integration may require GitHub webhook to be configured in repository settings for full functionality testing
11. Webhook URL must be publicly accessible for GitHub to send events
12. Event types selection may use checkboxes, multi-select dropdown, or other UI patterns

