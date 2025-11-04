# Tracing Feature Specification

> **For AI Agents**: This document provides comprehensive specification for implementing the Tracing feature. Use this as the source of truth for all implementation decisions, architecture patterns, and integration points.

## Quick Reference

**Key Components**:
- `TracerMachine` - XState state machine managing tracing lifecycle
- `TraceServer` - Express HTTP server (port 4318) receiving OTLP traces
- `TraceTreeView` - VS Code TreeDataProvider for bottom panel tree view
- `activate.ts` - Feature activation, command registration, context management

**Key Context Variables**:
- `ballerina.tracingEnabled` - Boolean, set when tracing is enabled/disabled
- `ballerina.tracesEmpty` - Boolean, set when traces exist or are empty

**Key Commands**:
- `ballerina.showTraceWindow` - Reveals trace panel
- `ballerina.enableTracing` - Enables tracing for workspace

**Placeholder Messages**: Configured in `package.json` via `viewsWelcome`, shown when TreeDataProvider returns empty array.

**See Also**: [Architecture](#architecture) | [State Machine Flow](#state-machine-flow) | [VS Code Context Management](#vs-code-context-management) | [Tree Data Provider Implementation](#tree-data-provider-implementation)

## Overview

The Tracing feature enables Ballerina developers to collect, visualize, and analyze distributed traces from their Ballerina programs. It implements an OpenTelemetry Protocol (OTLP) compliant trace receiver that captures traces sent from Ballerina programs and displays them in a VS Code tree view panel located in the bottom panel area.

## Key Features

- **OTLP Trace Collection**: Receives traces via OTLP/HTTP protocol (both JSON and Protobuf formats)
- **State Management**: Uses XState to manage tracing lifecycle (enabled/disabled, server start/stop)
- **Project-Level Configuration**: Enables/disables tracing per workspace via marker files
- **Trace Visualization**: Tree view in bottom panel displaying spans in hierarchical structure
- **Trace Storage**: In-memory storage of traces with query capabilities
- **Command Integration**: VS Code command to show/reveal trace panel

## Architecture

### Components

The tracing feature consists of four main components (see [File Structure](#file-structure) for implementation files):

1. **TracerMachine** (`tracer-machine.ts`)
   - XState-based state machine managing tracing lifecycle
   - Handles enable/disable, server start/stop operations
   - Manages workspace directory tracking
   - **API**: See [TracerMachine API](#tracemachine-api)
   - **States**: See [State Machine Flow](#state-machine-flow)

2. **TraceServer** (`trace-server.ts`)
   - Express.js HTTP server listening on port 4318 (OTLP default)
   - Receives OTLP/HTTP traces (JSON and Protobuf)
   - Stores traces in-memory
   - Provides REST API for trace retrieval
   - **API**: See [TraceServer API](#traceserver-api)
   - **Protocol Support**: See [OTLP Protocol Support](#otlp-protocol-support)

3. **TraceTreeView** (`trace-tree-view.ts`)
   - VS Code TreeDataProvider for displaying traces and spans
   - Returns empty array when tracing is disabled or no traces exist (triggers placeholder messages)
   - Returns trace/span nodes when tracing is enabled and traces are available
   - Placeholder messages are configured in `package.json` via `viewsWelcome` contribution
   - Located in bottom panel (terminal/output/debug console area)
   - Handles user interactions (expand/collapse, selection)
   - Displays span details (name, duration, status, attributes) when enabled
   - **Implementation**: See [Tree Data Provider Implementation](#tree-data-provider-implementation)
   - **Structure**: See [Tree View Structure](#tree-view-structure)

4. **Activation Module** (`activate.ts`)
   - Registers VS Code commands (`ballerina.showTraceWindow`, `ballerina.enableTracing`)
   - Initializes TracerMachine with workspace directories
   - Creates TreeDataProvider instance
   - Creates and registers TreeView in bottom panel with TreeDataProvider
   - Subscribes to TracerMachine state changes to update VS Code context
   - Manages VS Code context (`ballerina.tracingEnabled`, `ballerina.tracesEmpty`) for conditional UI
   - Updates context when tracing state changes (enabled/disabled)
   - Handles trace panel reveal/show actions
   - **Integration**: See [Integration Points](#integration-points)
   - **Context Management**: See [VS Code Context Management](#vs-code-context-management)

## State Machine Flow

The TracerMachine uses XState to manage the following states:

### Top-Level States

- **`init`**: Initial state when machine is created
  - Checks for `trace_enabled.bal` marker file in workspace directories
  - Transitions to `enabled` if marker exists, otherwise `disabled`

- **`enabled`**: Tracing is enabled for the project
  - Nested states: `serverStopped`, `serverStarting`, `serverStarted`, `serverFailedToStart`, `serverStopping`
  - User can manually start/stop the trace server
  - User can disable tracing (will stop server first if running)
  - Sets VS Code context `ballerina.tracingEnabled` to `true`
  - Trace panel shows tree view with traces/spans

- **`disabled`**: Tracing is disabled for the project
  - Trace server cannot be started in this state
  - User can enable tracing to transition to `enabled` state
  - Sets VS Code context `ballerina.tracingEnabled` to `false`
  - Trace panel shows message prompting user to enable tracing

### Events

- `ENABLE`: Enable tracing in all workspace directories
- `DISABLE`: Disable tracing and stop server if running
- `START_SERVER`: Start the OTLP trace server
- `STOP_SERVER`: Stop the OTLP trace server
- `REFRESH`: Re-initialize state machine (re-check marker files)
- `ADD_WORKSPACES`: Add workspace directory to context
- `REMOVE_WORKSPACES`: Remove workspace directory from context

### State Transitions

```
init → enabled (if trace_enabled.bal exists)
init → disabled (if trace_enabled.bal does not exist)

enabled → disabled (on DISABLE event)
disabled → enabled (on ENABLE event)

enabled.serverStopped → enabled.serverStarting → enabled.serverStarted
enabled.serverStarted → enabled.serverStopping → enabled.serverStopped
enabled.serverStarting → enabled.serverFailedToStart
```

## File Structure

```
tracing/
├── activate.ts              # Feature activation and command registration
├── index.ts                 # Public API exports
├── tracer-machine.ts        # XState state machine implementation
├── trace-server.ts          # OTLP HTTP server implementation
├── trace-tree-view.ts       # TreeDataProvider for trace/span tree view
├── test-utils.ts            # Test utility functions
├── test/
│   ├── tracer-machine.test.ts
│   ├── test-utils.ts        # Test-specific utilities
│   └── test-project/        # Test Ballerina project
└── AGENTS.md                # This file (specification for AI agents)
```

**Note**: `trace-tree-provider.ts` was removed from file structure as it's consolidated into `trace-tree-view.ts`.

## Configuration

### Project-Level Tracing

Tracing is enabled/disabled per workspace via a marker file (see [Usage Flow](#usage-flow) for end-to-end scenarios):

- **Marker File**: `trace_enabled.bal` (content: `"true"`)
- **Location**: Workspace root directory
- **Creation**: When user enables tracing via UI
- **Deletion**: When user disables tracing via UI

The TracerMachine checks for this file on initialization to determine initial state.

### Server Configuration

- **Default Port**: 4318 (OTLP/HTTP standard port)
- **Protocol**: HTTP
- **Endpoints**:
  - `POST /v1/traces` - OTLP trace ingestion endpoint
  - `GET /api/traces` - REST API to retrieve stored traces
  - `GET /health` - Health check endpoint

## Data Models

### Trace

```typescript
interface Trace {
    traceId: string;        // Hex-encoded trace ID
    spans: Span[];          // All spans in this trace
    resource: Resource;     // Resource attributes
    scope: Scope;           // Instrumentation scope
    firstSeen: Date;        // First time trace was seen
    lastSeen: Date;         // Last time trace was updated
}
```

### Span

```typescript
interface Span {
    spanId: string;         // Hex-encoded span ID
    traceId: string;        // Hex-encoded trace ID
    parentSpanId: string;   // Hex-encoded parent span ID (empty for root)
    name: string;           // Span name
    kind: string;           // Span kind (e.g., SERVER, CLIENT, INTERNAL)
}
```

### Resource

```typescript
interface Resource {
    name: string;           // Resource name
    attributes: Attribute[]; // Resource attributes
}
```

### Scope

```typescript
interface Scope {
    name: string;           // Instrumentation scope name
    version?: string;       // Optional version
    attributes?: Attribute[]; // Optional scope attributes
}
```

### Attribute

```typescript
interface Attribute {
    key: string;
    value: string;
}
```

## TraceServer API

The TraceServer provides the following interface:

```typescript
interface TraceServer {
    start(port: number): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getTraces(): Trace[];
    clearTraces(): void;
    getTrace(traceId: string): Trace;
    getTraceBySpanId(spanId: string): Trace;
    getTraceByResource(resource: string): Trace;
    getTraceByScope(scope: string): Trace;
    getTraceByFirstSeen(firstSeen: Date): Trace;
    getTraceByLastSeen(lastSeen: Date): Trace;
}
```

## TracerMachine API

The TracerMachine singleton provides:

```typescript
{
    initialize(workspaceDirs?: string[]): void;
    addWorkspace(workspaceDir: string): void;
    removeWorkspace(workspaceDir: string): void;
    isEnabled(): boolean;
    isServerStarted(): boolean;
    getState(): any;
    startServer(): void;
    stopServer(): void;
    enable(): void;
    disable(): void;
    refresh(workspaceDirs?: string[]): void;
    onUpdate(callback: (state: any) => void): void;
    getTraceServer(): TraceServer;
}
```

## OTLP Protocol Support

The TraceServer supports:

1. **JSON Format**: Standard OTLP JSON payload
   - Content-Type: `application/json`
   - Structure: `{ resourceSpans: [...] }`

2. **Protobuf Format**: OTLP Protobuf binary payload
   - Content-Type: `application/x-protobuf`
   - Uses protobufjs library for decoding
   - Supports complete OTLP trace schema

The server automatically detects the content type and handles both formats.

## Integration Points

### Extension Activation

The tracing feature is activated in `extension.ts`:

```typescript
import { activateTracing } from './features/tracing';

// In extension activation function:
activateTracing(ballerinaExtInstance);
```

### VS Code Commands

- **Command ID**: `ballerina.showTraceWindow`
  - **Action**: Reveals/shows the trace tree view in the bottom panel
  
- **Command ID**: `ballerina.enableTracing`
  - **Action**: Enables tracing for the current workspace
  - **Implementation**: Calls `TracerMachine.enable()`
  - **Registration**: Registered in `activate.ts`

### VS Code Views

The trace view must be registered in `package.json` under `views` and `viewsWelcome`:

```json
{
  "contributes": {
    "views": {
      "debug": [
        {
          "id": "ballerina-traceView",
          "name": "Ballerina Traces"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "ballerina-traceView",
        "contents": "Tracing is disabled. Enable tracing to view traces from your Ballerina program.\n[Enable Tracing](command:ballerina.enableTracing)",
        "when": "!ballerina.tracingEnabled"
      },
      {
        "view": "ballerina-traceView",
        "contents": "No traces collected yet. Run your Ballerina program to see traces here.",
        "when": "ballerina.tracingEnabled && ballerina.tracesEmpty"
      }
    ],
    "commands": [
      {
        "command": "ballerina.showTraceWindow",
        "title": "Show Traces",
        "icon": "$(list-tree)"
      },
      {
        "command": "ballerina.enableTracing",
        "title": "Enable Tracing"
      }
    ]
  }
}
```

**View Configuration**:
- **View ID**: `ballerina-traceView`
- **View Container**: Bottom panel (`"debug"` container - shared with Debug Console, Terminal, Output)
- **Tree Data Provider**: Custom TreeDataProvider implementation
- **View Name**: "Ballerina Traces"
- **Always Visible**: The view is always visible in the bottom panel
- **Placeholder Messages**: Configured via `viewsWelcome` contribution based on context

**Placeholder Messages**:
- **When tracing disabled**: Shows "Tracing is disabled" message with button to enable tracing
- **When tracing enabled but no traces**: Shows "No traces collected yet" message
- **When tracing enabled with traces**: Tree view is displayed normally

### VS Code Context Management

The tracing feature uses VS Code context to control the trace panel UI:

**Context Variables**:
- `ballerina.tracingEnabled` (Boolean)
  - Set to `true`: When tracing is enabled (TracerMachine in `enabled` state)
  - Set to `false`: When tracing is disabled (TracerMachine in `disabled` state)
- `ballerina.tracesEmpty` (Boolean, optional)
  - Set to `true`: When tracing is enabled but no traces have been collected yet
  - Set to `false`: When traces exist in TraceServer
  - Used for showing empty state placeholder message

**Context Updates**:
- Context is set during TracerMachine state transitions
- Updated in `activate.ts` via TracerMachine state subscriptions:
  - Subscribe to TracerMachine state changes using `TracerMachine.onUpdate()`
  - When TracerMachine transitions from `disabled` → `enabled`: Set `ballerina.tracingEnabled` to `true`, `ballerina.tracesEmpty` to `true`
  - When TracerMachine transitions from `enabled` → `disabled`: Set `ballerina.tracingEnabled` to `false`
  - On TracerMachine initialization: Set context based on initial state detected
- Updated in TreeDataProvider or TraceServer listener:
  - When TraceServer receives new traces: Set `ballerina.tracesEmpty` to `false`
  - When TraceServer is cleared: Set `ballerina.tracesEmpty` to `true`
  - This can be done via event listener or callback when traces are added/removed

**Implementation**:
```typescript
// When tracing is enabled
await vscode.commands.executeCommand('setContext', 'ballerina.tracingEnabled', true);
await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', true);

// When tracing is disabled
await vscode.commands.executeCommand('setContext', 'ballerina.tracingEnabled', false);

// When traces are received
await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', false);

// When traces are cleared
await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', true);
```

**TreeDataProvider Behavior**:
- **When `ballerina.tracingEnabled === false`**:
  - `getChildren()` returns empty array `[]` (no children)
  - VS Code automatically shows the placeholder message from `viewsWelcome` configuration
  - Placeholder message is defined in package.json with `when: "!ballerina.tracingEnabled"`
  
- **When `ballerina.tracingEnabled === true`**:
  - `getChildren()` returns trace nodes from TraceServer
  - `getTreeItem()` renders trace/span tree items normally
  - Shows full hierarchical trace structure
  - If no traces exist, `getChildren()` returns empty array and placeholder message is shown (when `ballerina.tracesEmpty` context is `true`)

**TraceServer Integration**:
- TreeDataProvider should subscribe to TraceServer for updates
- When TraceServer receives new traces via `/v1/traces` endpoint:
  - TraceServer should notify TreeDataProvider (via event emitter or callback)
  - TreeDataProvider triggers `onDidChangeTreeData` event to refresh tree view
  - Update `ballerina.tracesEmpty` context to `false` when first trace arrives
- When TraceServer traces are cleared:
  - TreeDataProvider triggers `onDidChangeTreeData` event
  - Update `ballerina.tracesEmpty` context to `true` if all traces are cleared

### Ballerina Program Integration

Ballerina programs must be configured to send traces to the OTLP endpoint:
- **Endpoint**: `http://localhost:4318/v1/traces`
- **Protocol**: OTLP/HTTP
- The program should use OpenTelemetry SDK configured for OTLP exporter
- **Server Start**: User manually starts trace server via UI (see [Usage Flow](#usage-flow) step 3)
- **Trace Collection**: See [Usage Flow](#usage-flow) step 4 for trace collection details

## Usage Flow

1. **Initial state (tracing disabled)**:
   - TracerMachine initializes in `disabled` state
   - VS Code context `ballerina.tracingEnabled` is set to `false`
   - TreeDataProvider returns empty array `[]`
   - VS Code shows placeholder message from `viewsWelcome`: "Tracing is disabled. Enable tracing to view traces."
   - User can click "Enable Tracing" button in the placeholder message

2. **User enables tracing**:
   - User action triggers `TracerMachine.enable()` (via command from placeholder button)
   - Creates `trace_enabled.bal` marker file in workspace
   - State machine transitions to `enabled` state
   - VS Code context `ballerina.tracingEnabled` is set to `true`
   - VS Code context `ballerina.tracesEmpty` is set to `true`
   - TreeDataProvider now returns empty array (no traces yet)
   - VS Code shows placeholder message: "No traces collected yet. Run your Ballerina program to see traces here."

3. **User runs Ballerina program**:
   - Program detects `trace_enabled.bal` file
   - Program configures OTLP exporter to send to `localhost:4318`
   - User manually starts trace server via UI (or auto-start in future)

4. **Traces are collected**:
   - Ballerina program sends traces via OTLP/HTTP to `http://localhost:4318/v1/traces`
   - TraceServer receives and stores traces in memory
   - Traces are grouped by traceId
   - TraceServer notifies TreeDataProvider (via callback/event) that new traces arrived
   - VS Code context `ballerina.tracesEmpty` is set to `false`
   - TreeDataProvider's `onDidChangeTreeData.fire()` is triggered
   - Tree view refreshes and displays traces (placeholder message is automatically hidden by VS Code)

5. **User views traces**:
   - Opens trace panel via `ballerina.showTraceWindow` command (if not already visible)
   - Trace panel is visible in bottom panel
   - When `ballerina.tracingEnabled === true`: Tree view displays traces and spans in hierarchical structure
   - Root nodes represent traces (grouped by traceId)
   - Child nodes represent spans (organized by parent-child relationships)
   - User can expand/collapse to navigate the trace hierarchy
   - Span details visible on selection (name, duration, status, attributes)

6. **User disables tracing**:
   - User action triggers `TracerMachine.disable()`
   - Stops trace server if running
   - Deletes `trace_enabled.bal` marker file
   - State machine transitions to `disabled` state
   - VS Code context `ballerina.tracingEnabled` is set to `false`
   - TreeDataProvider returns empty array `[]`
   - VS Code shows placeholder message again: "Tracing is disabled. Enable tracing to view traces."

## Tree View Structure

The trace panel displays different content based on the tracing state (see [VS Code Context Management](#vs-code-context-management) for context variables):

### When Tracing is Disabled

The trace panel shows a placeholder message configured in `viewsWelcome`:

**Placeholder Content** (from package.json):
```
Tracing is disabled. Enable tracing to view traces from your Ballerina program.
[Enable Tracing](command:ballerina.enableTracing)
```

**Properties**:
- Displayed automatically by VS Code when TreeDataProvider returns empty array
- Configured via `viewsWelcome` contribution in package.json
- Includes clickable button/command link to enable tracing
- Shown when `!ballerina.tracingEnabled` context is true

### When Tracing is Enabled

The trace tree view displays traces and spans in the following hierarchical structure:

```
📊 Ballerina Traces (root)
├── 🔍 Trace: abc123...
│   ├── 📦 Span: http.request (root span)
│   │   ├── 📦 Span: db.query
│   │   ├── 📦 Span: cache.get
│   │   └── 📦 Span: db.query
│   └── 📦 Span: http.response
├── 🔍 Trace: def456...
│   └── 📦 Span: function.call
└── 🔍 Trace: ghi789...
    ├── 📦 Span: main
    └── 📦 Span: handler
        └── 📦 Span: process
```

**Empty State** (when enabled but no traces yet):
Placeholder message from `viewsWelcome`:
```
No traces collected yet. Run your Ballerina program to see traces here.
```

- Shown when `ballerina.tracingEnabled && ballerina.tracesEmpty` contexts are both true
- Automatically hidden when traces arrive and `ballerina.tracesEmpty` is set to `false`

### Tree Node Types

1. **Trace Nodes** (root level):
   - Display trace ID (truncated)
   - Show resource name
   - Show instrumentation scope
   - Show timestamp (first seen, last seen)
   - Expandable to show child spans

2. **Span Nodes** (nested under traces):
   - Display span name
   - Show span kind (SERVER, CLIENT, INTERNAL, etc.)
   - Show duration (calculated from start/end times)
   - Show status (OK, ERROR, UNSET)
   - Expandable if has child spans
   - Context menu for viewing full details

### Tree Data Provider Implementation

The TreeDataProvider should (see [Tree Node Types](#tree-node-types) for node structure details):
- Implement `TreeDataProvider<TraceNode | SpanNode>`
- Provide `getChildren()` with conditional logic:
  - **When disabled** (`!ballerina.tracingEnabled`): Return empty array `[]` (placeholder message will be shown)
  - **When enabled but empty** (`ballerina.tracingEnabled && ballerina.tracesEmpty`): Return empty array `[]` (empty state placeholder will be shown)
  - **When enabled with traces**: Return trace nodes from `TraceServer.getTraces()`
- Provide `getTreeItem()` for tree item rendering based on node type
- Provide `onDidChangeTreeData` event emitter for tree refresh notifications
- Subscribe to TracerMachine state changes (via `TracerMachine.onUpdate()`) to know when tracing is enabled/disabled
- Subscribe to TraceServer updates (via callback or event listener) to refresh tree when new traces arrive
- Filter/build tree structure from `TraceServer.getTraces()` when enabled
- Update `ballerina.tracesEmpty` context when traces are added/cleared
- Support refresh via context menu or command
- Trigger `onDidChangeTreeData.fire()` when:
  - TracerMachine state changes (enabled/disabled)
  - TraceServer receives new traces
  - TraceServer traces are cleared

**Key Implementation Details**:

**Context-Aware Rendering**:
```typescript
// TreeDataProvider implementation
// Placeholder messages are handled by VS Code via viewsWelcome configuration
// TreeDataProvider just returns appropriate data (empty array or trace nodes)

getChildren(element?: TraceNode | SpanNode): ProviderResult<(TraceNode | SpanNode)[]> {
    // Check if tracing is enabled (from TracerMachine state)
    const isEnabled = TracerMachine.isEnabled();
    
    if (!isEnabled) {
        // Return empty array - VS Code will show placeholder from viewsWelcome
        return [];
    }
    
    // Get traces from TraceServer
    const traces = TraceServer.getTraces();
    
    if (traces.length === 0) {
        // Return empty array - VS Code will show empty state placeholder
        // Make sure ballerina.tracesEmpty context is set to true
        return [];
    }
    
    // Update context - traces exist now
    // Note: Context should be tracked internally or updated when traces first arrive
    await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', false);
    
    // Return trace nodes
    if (!element) {
        // Root level - return all traces
        return traces.map(trace => new TraceNode(trace));
    } else if (element instanceof TraceNode) {
        // Trace node - return child spans
        return this.getSpansForTrace(element.traceId);
    } else if (element instanceof SpanNode) {
        // Span node - return child spans if any
        return this.getChildSpans(element.spanId);
    }
    
    return [];
}
```

**Placeholder Message Handling**:
- **No need for MessageNode type**: Placeholder messages are handled by VS Code via `viewsWelcome`
- **Empty array triggers placeholder**: When `getChildren()` returns `[]`, VS Code checks `viewsWelcome` configuration
- **Context conditions**: Placeholder messages are shown based on `when` clause conditions in package.json
- **Automatic switching**: VS Code automatically switches between placeholder and tree view based on:
  - Empty array from TreeDataProvider
  - Context variable values (`ballerina.tracingEnabled`, `ballerina.tracesEmpty`)

**Node Types**:
- **TraceNode**: Represents a single trace
  - Root level when enabled
  - Expandable to show child spans
  
- **SpanNode**: Represents a single span
  - Child of TraceNode or other SpanNode
  - Expandable if has child spans
  - Built by matching `parentSpanId` to `spanId`

**Context Change Handling**:
- Subscribe to TracerMachine state changes via `TracerMachine.onUpdate()` callback
- When TracerMachine state changes from `disabled` → `enabled`: 
  - Update `ballerina.tracingEnabled` context to `true`
  - Trigger `onDidChangeTreeData.fire()` to refresh tree view
- When TracerMachine state changes from `enabled` → `disabled`:
  - Update `ballerina.tracingEnabled` context to `false`
  - Trigger `onDidChangeTreeData.fire()` to refresh tree view (will show placeholder)
- When TraceServer receives traces:
  - Update `ballerina.tracesEmpty` context to `false`
  - Trigger `onDidChangeTreeData.fire()` to refresh tree view

**Tree Structure Building** (when enabled):
- Root level: All traces from `TraceServer.getTraces()`
- Trace level: Spans filtered by `traceId`, organized by parent-child relationships
- Span hierarchy: Built by matching `parentSpanId` to `spanId`
- Root spans: Spans with empty or missing `parentSpanId`
- Updates: Trigger `onDidChangeTreeData` event when TraceServer receives new traces

## Future Enhancements

Areas for potential future improvements:

1. **Auto-start server**: Automatically start server when tracing is enabled and program runs
2. **Persistent storage**: Store traces to disk for persistence across sessions
3. **Enhanced tree view**: Better icons, colors, and visual indicators for different span types
4. **Filtering/Search**: Filter traces by resource, scope, time range, span name, etc.
5. **Export formats**: Export traces to standard formats (Jaeger, Zipkin, etc.)
6. **Performance metrics**: Calculate and display latency, throughput metrics per trace/span
7. **Multi-workspace support**: Better handling of multiple workspace directories
8. **Configuration UI**: Settings panel for server port, storage options, tree view preferences
9. **Span details panel**: Side panel showing full span details (attributes, events, links)
10. **Timeline visualization**: Optional timeline/gantt chart view alongside tree view

## Testing

Tests are located in `test/tracer-machine.test.ts`. Key test scenarios:

1. Initial state detection (enabled/disabled based on marker file)
2. Enable/disable state transitions
3. Server start/stop operations
4. Trace collection and retrieval
5. Workspace directory management

Run tests with:
```bash
npm test -- tracer-machine.test.ts
```

## Dependencies

- **xstate**: State machine library
- **express**: HTTP server framework
- **protobufjs**: Protobuf decoding for OTLP
- **vscode**: VS Code API (TreeDataProvider, TreeView)

## Error Handling

- Server start failures transition to `serverFailedToStart` state
- Errors are stored in context and can be retrieved
- Failed operations can be retried
- Invalid OTLP payloads are logged but don't crash the server

## Performance Considerations

- Traces are stored in-memory (Map-based storage)
- No persistence by default (lost on extension restart)
- Trace store can grow large with high-traffic applications
- Consider implementing trace retention/eviction policies for production use

## Security Considerations

- Server only listens on localhost (127.0.0.1)
- No authentication required (local development tool)
- Should not be exposed to network in production environments
- Protobuf payload size limit: 10MB (configurable in express)

## Maintenance Notes

- State machine logic is centralized in `tracer-machine.ts`
- Trace storage logic is in `trace-server.ts`
- Tree view UI is implemented using VS Code TreeDataProvider API in `trace-tree-view.ts`
- Tree structure building logic should handle parent-child relationships from spans
- Marker file approach is simple but could be replaced with config file
- Tree view should refresh automatically when TraceServer receives new traces
- VS Code context `ballerina.tracingEnabled` must be kept in sync with TracerMachine state
- Context updates should happen in `activate.ts` when state transitions occur (via TracerMachine.onUpdate subscription)
- TreeDataProvider should subscribe to TracerMachine state changes (via `TracerMachine.onUpdate()`) and TraceServer updates to refresh UI appropriately
- TraceServer should provide a way to notify listeners when traces are added/cleared (event emitter or callback mechanism)

## Related Files

- Extension activation: `src/extension.ts`
- Core extension context: `src/BalExtensionContext.ts`
- Ballerina extension: `package.json` (command registration)

---

**Last Updated**: 2025-01-02
**Maintainer**: Ballerina Extension Team

