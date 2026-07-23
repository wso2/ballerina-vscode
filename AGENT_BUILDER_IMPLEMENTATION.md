# Agent Builder Mode — Implementation Summary

Implementation of the stripped-down **WSO2 Agent Builder** mode for the Ballerina VS Code
extension, driven by the `AGENT_BUILDER_MODE=true` environment variable on the extension host.
This document summarizes what was actually built. See `AGENT_BUILDER_MODE_PLAN.md` for the
original design/rationale.

---

## How the mode is enabled

- The extension host env var **`AGENT_BUILDER_MODE=true`** turns the mode on.
- Read once via `isAgentBuilderMode()` in `packages/ballerina-extension/src/utils/config.ts`.
- In production this comes from the WSO2 product's `product.json` (external dependency).
- For local dev: the `"Ballerina Extension (Agent Builder)"` launch config in
  `.vscode/launch.json`, **or** a gitignored `packages/ballerina-extension/.env` containing
  `AGENT_BUILDER_MODE=true` (applies to every extension launch config).

One env read → one machine-context flag (`isAgentBuilder`) → propagated to the webview via the
existing `getVisualizerLocation` RPC → consumed by the four webview surfaces.

---

## Changes by phase

### Phase 1 — Mode plumbing
- **`utils/config.ts`** — added `isAgentBuilderMode()` (reads `process.env.AGENT_BUILDER_MODE`).
- **`stateMachine.ts`** — added `isAgentBuilder` to `MachineContext`, initialized it in the
  machine's default context, and set the `isAgentBuilderMode` VS Code context key in
  `setContextValues()` (for `when`-clause gating and the WI extension). Initial `view` is
  `undefined` in agent mode so `MainPanel` shows the loading ring instead of an overview flash.
- **`ballerina-core/src/state-machine-types.ts`** — added `isAgentBuilder?: boolean` to
  `VisualizerLocation` and `MACHINE_VIEW.AgentBuilderNoAgent`.
- **`RPCLayer.ts`** — `getContext()` now returns `isAgentBuilder`.

### Phase 2 — Startup routing (skip home pages → agent diagram)
- **`stateMachine.ts`**
  - `getAgentBuilderLocation(projectStructure)` — resolves the first `ai` service's diagram
    location, else `{ view: AgentBuilderNoAgent }`.
  - `findFirstAiService()` — scans `directoryMap[SERVICE]` across projects for `moduleName === "ai"`.
  - `getDefaultRootLocation()` — the single helper all overview fallbacks now call (agent diagram
    in agent mode, else Workspace/Package overview).
  - Guarded transition in `fetchProjectStructure.onDone`: **only when a project/workspace is open**
    (`isAgentBuilderMode() && (projectPath || workspacePath)`) it `send`s an `OPEN_VIEW` for the
    agent location. With no folder open it falls through so the WSO2 Integrator welcome owns the
    screen (our webview never opens).
  - Overview fallbacks in `findView`, `showView`, and `UPDATE_PROJECT_INFO` routed through
    `getDefaultRootLocation()`.
- **`rpc-managers/visualizer/rpc-manager.ts`** — `goHome` and `reviewAccepted` use
  `getDefaultRootLocation()` in agent mode. (The undo/redo and `source-utils.ts` timeout-fallback
  guards were later replaced by the Phase 4 central clamp.)

### Phase 3 — Agent creation flow (on-demand, not automatic)
- **`utils/agent-scaffold.ts`** — static **scaffolding utility** (not used during project creation) that
  writes fixed file contents (`connections.bal`, `agents.bal`, `main.bal`) with hardcoded names
  (`wso2ModelProvider`, `aiAgent`, `chatAgentListener`, `/aiAgent`). Kept for manual
  "Continue with Agent Builder" flow if needed. File placement matches wizard/LS output.
- **`utils/bi.ts`** — `createBIProjectPure` **no longer auto-scaffolds** agent files. Projects are created
  with empty placeholders; users add AI agents via the Artifacts page.
- **`stateMachine.ts`**
  - `getAgentBuilderLocation` now routes "no agent found" → `MACHINE_VIEW.BIComponentView` (Artifacts page,
    filtered to AI Integration section only in agent mode) instead of `AgentBuilderNoAgent`.
  - The function accepts both `projectStructure` and `projectPath` to return complete location info.
- **`MainPanel.tsx`** — passes `isAgentBuilder` flag to `ComponentListView`.
- **`ballerina-visualizer/src/views/BI/ComponentListView/index.tsx`** — filters panels when `isAgentBuilder`:
  shows only the **AI Integration** section (hides Automation, Workflow, Integration API, Event, File, Other Artifacts).

Open-time routing has three outcomes: agent(s) exist → first agent's diagram; none → Artifacts page
(AI Integration only); new project → empty project, user creates AI agent from Artifacts page.

### Phase 4 — Navigation lockdown
- **Central navigation clamp (state machine)** — the restriction is enforced once, at
  history-entry creation, instead of per `openView` call site. `stateMachine.ts` defines
  `AGENT_BUILDER_ALLOWED_VIEWS` (agent diagram + agent-internal surfaces: `BIDiagram`,
  `AgentBuilderNoAgent`, `AIAgentDesigner`, `BIAgentToolForm`, `DataMapper`/`InlineDataMapper`,
  connection wizards, config-variable views, `ReviewMode`, `ConfigurationCollector`) and
  `isAgentBuilderViewAllowed()`. The clamp is applied in:
  - `findView` (both branches, i.e. after `getView` artifact resolution and for explicit views) —
    a blocked navigation stays on the current view; if history is empty (e.g. a
    `resetHistory` navigation like `configGenerator`'s Run-time `PackageOverview`), the resolved
    agent root is pushed instead (`resolveAgentBuilderRootEntry`).
  - `showView`'s `VIEW_UPDATE` re-resolution — if a source edit makes the artifact re-resolve to a
    disallowed view (e.g. the `PackageOverview` fallback), the current entry is kept.
  - `addToHistory` RPC (webview-initiated pushes bypass `findView`).
  This covers every entry point — extension commands (Run/config/test/tryit/docs), debug-hit
  navigation, webview RPCs, undo/redo timeout fallbacks — without per-call-site guards. The
  `webViewLoaded` `onDone` assign now also syncs `documentUri` from the resolved location so a
  blocked navigation can't leave a stale target URI in the machine context.
- **`components/TopNavigationBar/index.tsx`** — early-returns `null` in agent mode (hides home,
  back, breadcrumb trail everywhere).
- **`components/TitleBar/index.tsx`** — hides its own back button in agent mode (each view keeps
  its TitleBar title so screens aren't headerless).
- **`rpc-manager.ts` `goHome`** — clears history and reopens the agent root, never overview.
- Command/handler guards for navigation/creation commands.
- The earlier per-call-site guards on the undo/redo timeout fallbacks (`rpc-manager.ts`) and the
  update-timeout fallback (`source-utils.ts`) were reverted — the central clamp makes them
  redundant (their `PackageOverview` fallback is blocked, so the current view stays put, which is
  also better UX than force-jumping to the root).

### Phase 5 — Project explorer suppression
- **`stateMachine.ts`** — `refreshProjectExplorer()` / `notifyTreeView()` skipped in agent mode.
- The `isAgentBuilderMode` context key is the contract for the WI extension to hide its view
  container (external).

### Phase 6 — Restrict the diagram to the single AI Agent node
- **`ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`** — passes
  `disableNodeAddition: isAgentBuilder` and `isAgentBuilder` to the diagram; agent-only palette
  filtering; node-deletion guards.
- **`bi-diagram` `Diagram.tsx` / `DiagramContext.tsx`** — added `isAgentBuilder` (alongside the
  existing `disableNodeAddition`) threaded through context.
- **`EmptyNodeWidget.tsx` / `NodeLinkWidget.tsx`** — hide the add-node (`+`) affordance when
  `disableNodeAddition`.
- **`AgentCallNode/AgentCallNodeWidget.tsx`** — hides the **Delete** item in the agent node's menu
  when `isAgentBuilder` (the node is the flow invariant).

### Phase 7 — Cosmetics
- **`views/visualizer/webview.ts`** — webview/title and the loading `<h1>` show
  **"WSO2 Agent Builder"** in agent mode (`agentBuilderTitle`).

---

## Key decisions & deviations from the plan
- **On-demand agent creation, not automatic scaffolding** — projects are created empty; users add AI agents
  via the Artifacts page (AI Integration section only). The scaffold utility exists for manual "Continue with Agent Builder"
  flow but is not called during standard project creation.
- **Artifacts page, not custom "no agent" view** — when no AI agent exists, users see the Artifacts page filtered to show only
  the AI Integration section. This reuses existing UI and clearly guides users to the creation action.
- **No-folder case** — the forced navigation is gated on an open project/workspace so the WI
  welcome (not our webview) handles the empty state.
- **`disableNodeAddition` kept separate** from `isAgentBuilder` (a consolidation was tried and
  reverted).

---

## Known gaps / pending
- **Model provider setup** — after creating an AI agent via the Artifacts page, the agent fails to run with
  `ballerina.ai.wso2ProviderConfig is not configured correctly` until the WSO2 model provider is
  configured (requires WSO2 / BI Copilot sign-in, which writes `Config.toml`). Future: wire
  `configureDefaultModelProvider` into the post-creation flow (e.g., show a prompt after agent is added).
- **Run-triggered navigation** — fixed as a class by the Phase 4 central clamp: Run's
  `PackageOverview` navigation (`configGenerator.ts`) and artifact resolutions to non-agent views
  (`TypeDiagram` etc.) are blocked at history-entry creation. The temporary `openView` diagnostic
  has been removed; blocked navigations are logged as `[AGENT_BUILDER] Blocked …`. Note that
  `ViewConfigVariables` (opened by Run when configurables are missing) is currently **allowed** —
  if users get stranded there (no back button in agent mode), drop it from
  `AGENT_BUILDER_ALLOWED_VIEWS`.

## External dependencies (not in this repo)
- **product-integrator** — set `AGENT_BUILDER_MODE=true` via `product.json` runtime env.
- **WI extension (`wso2.wso2-integrator`)** — hide its project-explorer container under agent
  mode, provide the "Create Agent" welcome, and not fire overview-opening startup commands.

---

## Testing locally
1. `rush build --to ballerina` (builds all changed packages incl. `bi-diagram`, visualizer).
2. Enable the mode (launch config or `.env`).
3. For webview hot-reload: `pnpm start` in `packages/ballerina-visualizer` (serves `:9000`) and
   use the watch launch config; otherwise use the *(no watch)* config with bundled assets.
4. Reload the Extension Development Host window after extension-side changes.

Scenarios: new project → empty project, show Artifacts page (AI Integration only); existing agent project → first agent's diagram;
project without an agent → Artifacts page (AI Integration only); env unset → zero behavior change; navigation lockdown
(no home/back/breadcrumb, no `+`, agent node Delete hidden). User creates AI agent from Artifacts, then diagram opens on save.
