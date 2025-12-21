# AI Flow Redesign - Integration Testing Checklist

This checklist covers all integration tests needed to validate the migration from XState to class-based executor architecture.

## Phase 6: Integration Testing and Validation

### 1. Agent Generation - Plan Mode

**Test Scenario**: Generate a new HTTP service with plan approval workflow

**Steps**:
1. Open AI chat panel
2. Submit prompt: "Create an HTTP service with a GET endpoint that returns a list of users"
3. Set `isPlanMode: true`

**Expected Behavior**:
- ✅ TaskWrite tool creates task list
- ✅ Plan approval UI appears with tasks
- ✅ User can approve/decline plan
- ✅ After approval, first task starts automatically
- ✅ Each task completion requests user approval
- ✅ Task status updates visible in UI (pending → in_progress → review → completed)
- ✅ Modified files displayed after each approval
- ✅ All tasks complete successfully

**Validation**:
- Check plan stored in RuntimeStateManager: `runtimeStateManager.getCurrentPlan()`
- Verify ApprovalManager handles approvals correctly
- Confirm temp project created and cleaned up
- Check chat history persisted in ChatStateManager

---

### 2. Agent Generation - Edit Mode

**Test Scenario**: Direct code modification without plan approval

**Steps**:
1. Open AI chat panel with existing Ballerina file
2. Submit prompt: "Add error handling to the main function"
3. Set `isPlanMode: false`

**Expected Behavior**:
- ✅ No TaskWrite tool used
- ✅ Direct file edits via FileEdit/FileWrite tools
- ✅ File changes displayed in chat
- ✅ No approval workflow
- ✅ Code integrated to workspace automatically

**Validation**:
- Verify no plan created in RuntimeStateManager
- Check file modifications applied correctly
- Confirm no approval requests sent

---

### 3. Data Mapper - Function Mapping

**Test Scenario**: Generate data transformation function

**Steps**:
1. Open Data Mapper visualizer
2. Select source and target schemas
3. Trigger function mapping generation

**Expected Behavior**:
- ✅ FunctionMappingExecutor instantiated correctly
- ✅ Mapping code generated with LLM
- ✅ Code validation and repair applied
- ✅ Result integrated to workspace

**Validation**:
- Check FunctionMappingExecutor.execute() completes
- Verify mapping function syntax valid
- Confirm no state machine errors

---

### 4. Data Mapper - Inline Mapping

**Test Scenario**: Generate inline data transformation expression

**Steps**:
1. Open Data Mapper visualizer
2. Select source and target fields
3. Trigger inline mapping generation

**Expected Behavior**:
- ✅ InlineMappingExecutor instantiated correctly
- ✅ Inline expression generated
- ✅ Expression validated
- ✅ Result returned to Data Mapper UI

**Validation**:
- Check InlineMappingExecutor.execute() completes
- Verify expression syntax valid

---

### 5. Data Mapper - Context Types

**Test Scenario**: Generate type definitions from attachments

**Steps**:
1. Attach JSON/YAML schema files
2. Trigger context type generation

**Expected Behavior**:
- ✅ ContextTypesExecutor instantiated correctly
- ✅ Type definitions generated
- ✅ Ballerina record types created
- ✅ Result integrated to workspace

**Validation**:
- Check ContextTypesExecutor.execute() completes
- Verify types compile without errors

---

### 6. Plan Approval Workflow

**Test Scenario**: Approve/decline plan modifications

**Steps**:
1. Generate agent code with plan mode
2. When plan approval appears:
   - **Test A**: Click "Approve"
   - **Test B**: Click "Decline" with comment

**Expected Behavior**:
- ✅ ApprovalManager.requestPlanApproval() called
- ✅ Promise resolves when user clicks button
- ✅ Approval: Agent starts first task
- ✅ Decline: Agent receives rejection with comment
- ✅ Agent re-plans based on feedback

**Validation**:
- Check ApprovalManager promise resolution
- Verify RPC methods called correctly
- Confirm state updates in RuntimeStateManager

---

### 7. Task Completion Approval

**Test Scenario**: Approve/decline completed task

**Steps**:
1. Generate agent code with plan mode
2. Approve plan
3. Wait for first task completion
4. When task approval appears:
   - **Test A**: Click "Approve"
   - **Test B**: Click "Decline" with feedback

**Expected Behavior**:
- ✅ Compilation check runs before approval request
- ✅ If errors exist, task completion blocked
- ✅ ApprovalManager.requestTaskApproval() called
- ✅ Modified files integrated to workspace before approval
- ✅ Approval: Next task starts automatically
- ✅ Decline: Agent redoes task based on feedback

**Validation**:
- Check diagnostics tool called for compilation check
- Verify integrateCodeToWorkspace() called before approval
- Confirm ApprovalManager resolves correctly

---

### 8. Checkpoint Capture & Restore

**Test Scenario**: Create checkpoint and restore conversation

**Steps**:
1. Submit 3 agent prompts (conversation with 3 messages)
2. Checkpoint should auto-capture after each user message
3. Select checkpoint #2 from UI
4. Restore to checkpoint #2

**Expected Behavior**:
- ✅ ChatStateManager.captureCheckpoint() called after each message
- ✅ Checkpoint stored with messageId reference
- ✅ Workspace files snapshot created
- ✅ Restore: Workspace files reverted
- ✅ Restore: Chat history truncated to checkpoint message
- ✅ UI reset to checkpoint state

**Validation**:
- Check checkpoint storage in ChatStateManager
- Verify max 10 checkpoints enforced
- Confirm workspace restoration works correctly

---

### 9. Abort Functionality

**Test Scenario**: Cancel ongoing agent execution

**Steps**:
1. Start agent generation with long prompt
2. Click "Stop" button while generation in progress

**Expected Behavior**:
- ✅ AbortController.abort() triggered
- ✅ LLM stream cancellation
- ✅ Temp project cleanup executed
- ✅ Chat returns to idle state
- ✅ ApprovalManager.cancelAllPending() called
- ✅ UI shows "Generation stopped" message

**Validation**:
- Check AbortController signal propagated
- Verify cleanup executed despite abort
- Confirm no pending approvals remain

---

### 10. Auto-Approve Mode

**Test Scenario**: Enable auto-approval for task completions

**Steps**:
1. Enable auto-approve setting in UI
2. Generate agent code with plan mode
3. Approve plan
4. Watch tasks complete automatically

**Expected Behavior**:
- ✅ RuntimeStateManager.setAutoApproveEnabled(true) called
- ✅ Plan approval still requires manual approval
- ✅ Task completions auto-approved
- ✅ No task approval UI shown
- ✅ Tasks execute sequentially without pausing

**Validation**:
- Check RuntimeStateManager.isAutoApproveEnabled()
- Verify task-writer tool skips approval requests
- Confirm all tasks complete without user interaction

---

### 11. Parallel Eval Execution

**Test Scenario**: Run multiple eval tests concurrently

**Steps**:
1. Navigate to `test/ai/evals/code/`
2. Run eval test suite: `npm run evals`
3. Verify tests run in parallel (Promise.all)

**Expected Behavior**:
- ✅ Each test creates isolated ExecutionContext
- ✅ Each test has unique temp project path
- ✅ No shared state between concurrent tests
- ✅ AgentExecutor instances isolated per test
- ✅ All tests pass without interference

**Validation**:
- Check test execution logs for parallelism
- Verify each test has unique projectId
- Confirm no race conditions or state corruption

**Command**:
```bash
cd /Users/wso2/repos/vscode-extensions/workspaces/ballerina/ballerina-extension
npm run evals
```

---

### 12. Connector Generator Tool

**Test Scenario**: Generate connector from OpenAPI spec

**Steps**:
1. Submit agent prompt: "Create a connector for the Stripe API"
2. Agent uses ConnectorGenerator tool
3. UI prompts for OpenAPI spec
4. User provides spec or cancels

**Expected Behavior**:
- ✅ ApprovalManager.requestConnectorSpec() called
- ✅ UI shows OpenAPI spec upload dialog
- ✅ User provides spec: Tool generates connector code
- ✅ User cancels: Tool returns gracefully
- ✅ Generated connector integrated to workspace

**Validation**:
- Check ApprovalManager.resolveConnectorSpec() resolution
- Verify connector code generated correctly
- Confirm RPC methods for spec provision work

---

### 13. Library Provider Tool

**Test Scenario**: Search and use Ballerina libraries

**Steps**:
1. Submit agent prompt: "Create an HTTP service that uses MySQL"
2. Agent searches libraries with LibraryProvider tool
3. Tool returns library suggestions
4. Agent uses suggested libraries in code

**Expected Behavior**:
- ✅ Tool queries Language Server for libraries
- ✅ Compact library list returned first
- ✅ Detailed info fetched for selected libraries
- ✅ Library context stored in LS resources
- ✅ Agent imports and uses libraries correctly

**Validation**:
- Check library search results accurate
- Verify library imports added to generated code
- Confirm LS context.json updated

---

### 14. Diagnostics Tool

**Test Scenario**: Fix compilation errors

**Steps**:
1. Generate code with intentional syntax error
2. Agent marks task as completed
3. Diagnostics tool runs before approval

**Expected Behavior**:
- ✅ Diagnostics tool compiles Ballerina code
- ✅ Compilation errors detected
- ✅ Task completion BLOCKED
- ✅ Error message returned to agent
- ✅ Agent fixes errors and retries
- ✅ After fix, diagnostics pass
- ✅ Task approval proceeds

**Validation**:
- Check diagnostics tool called in handleTaskCompletion()
- Verify task-writer returns approval: false on errors
- Confirm agent receives error details and fixes code

---

### 15. UX Consistency Verification

**Goal**: Ensure user experience identical to previous state machine implementation

**Manual Checks**:
- ✅ Chat UI renders messages identically
- ✅ Plan tasks display with correct status icons
- ✅ Approval buttons appear at correct times
- ✅ File edits shown in chat with syntax highlighting
- ✅ Progress indicators work during generation
- ✅ Error messages formatted correctly
- ✅ Review actions (Accept/Decline) visible when needed

**User Flows to Test**:
1. New user first-time agent usage
2. Experienced user with existing chat history
3. Error recovery scenarios
4. Multi-turn conversation flow
5. Checkpoint-based workflow

---

## Success Criteria

All tests above must pass with no regressions:
- ✅ All existing features work identically
- ✅ No state machine errors or crashes
- ✅ Parallel execution safe (evals pass)
- ✅ Event flow to frontend unchanged
- ✅ Chat history and checkpoints persist correctly
- ✅ Abort functionality works per-request
- ✅ UX identical for end users
- ✅ No TypeScript compilation errors
- ✅ Extension VSIX packages successfully

---

## Post-Migration Cleanup (Optional)

After validation passes, consider cleaning up:

1. **Remove unused state machine imports** from:
   - `src/features/ai/agent/index.ts` (line 30, 136-138)
   - `src/features/ai/agent/stream-handlers/handlers/finish-handler.ts`
   - `src/features/ai/agent/stream-handlers/handlers/abort-handler.ts`
   - `src/RPCLayer.ts`
   - `src/stateMachine.ts`

2. **Delete old state machine files** (if confirmed safe):
   - `src/views/ai-panel/aiChatMachine.ts`
   - `src/views/ai-panel/chatStatePersistence.ts`

3. **Update frontend visualizer** to remove XState hooks:
   - Remove `useActor` imports
   - Replace with RPC-based state handling

4. **Remove state machine dependencies** from `package.json`:
   - Check if `xstate` can be removed
   - Run `pnpm prune` to cleanup

5. **Update documentation**:
   - Update `CLAUDE.md` with new architecture
   - Document executor pattern
   - Remove state machine references
