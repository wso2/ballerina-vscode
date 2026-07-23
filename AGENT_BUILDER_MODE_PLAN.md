# Agent Builder Mode — Ballerina Extension Change Plan

Plan for running the existing Ballerina VS Code extension in a stripped-down **Agent Builder** mode, driven by an environment variable set by the WSO2 Agent Builder app (product-integrator variant). Covers only extension-side (`ballerina-vscode`) changes; app-side and WI-extension work is listed as external dependencies.

## Target behavior (from requirements + Agent Builder 1.0.0 doc)

1. Agent Builder app sets an env var (e.g. `AGENT_BUILDER_MODE=true`) on the extension host.
2. Welcome + project creation stay as-is (owned by WSO2 Integrator / WI extension).
3. On **new project creation**: scaffold a default **AI Chat Agent** (identical to `AIChatAgentWizard` output, agent named after the project) as part of project creation and land directly on its diagram — no Overview/home/workspace pages ever shown. Opening an **existing** project: with agent(s) → the **first** agent's diagram; without an agent → a warning view ("No AI agent found") offering *Continue with Agent Builder* (scaffold agent, open it) or *Open with WSO2 Integrator* (close the project).
4. No home/back navigation, no breadcrumbs, no project explorer tree. The flow diagram only ever contains the single AI Agent node (Chat Trigger → AI Agent → Return); adding other nodes is not allowed, the default Chat trigger cannot be replaced, and no additional triggers can be added. Agent-internal editing (tools, memory, model, prompt, Chat/Try-It) remains fully functional.

## Design principles

- Single source of truth: the env var is read once into the existing xstate machine context (`stateMachine.ts`), then flows to the webview through the existing `getVisualizerLocation` RPC. No parallel mechanism.
- Mirror existing precedents: `isInDevant()` / `CLOUD_STS_TOKEN` for env detection, `INITIAL_SCAFFOLD_PROMPT` for env-driven startup behavior, `isBIProject` setContext for `when`-clause gating.
- Restrict by removing entry points *and* guarding the underlying actions (command palette and RPC fallbacks can bypass hidden buttons).

---

## Phase 1 — Mode plumbing

**1.1 Detection helper** — `packages/ballerina-extension/src/utils/config.ts`
Add next to `isInWI()` (L232) / `isInDevant()` (L236):

```ts
export function isAgentBuilderMode(): boolean {
    return process.env.AGENT_BUILDER_MODE === "true";
}
```

**1.2 Machine context** — `packages/ballerina-extension/src/stateMachine.ts`
- Add `isAgentBuilder: boolean` to `MachineContext` (L60) and initialize it in the machine's default `context` (L80–87), same as `isInDevant: isInDevant()`.
- In `setContextValues()` (L1134): add `commands.executeCommand('setContext', 'isAgentBuilderMode', isAgentBuilderMode())` — enables `when`-clause gating in this repo's `package.json` and in the WI extension.

**1.3 Propagate to webview**
- `packages/ballerina-core/src/state-machine-types.ts`: add `isAgentBuilder?: boolean` to `VisualizerLocation` (near `isBI`/`isInDevant`).
- `packages/ballerina-extension/src/RPCLayer.ts` `getContext()` (L133): include `isAgentBuilder: context.isAgentBuilder`.
- Webview side: views already call `rpcClient.getVisualizerLocation()`; optionally add a tiny `useIsAgentBuilder()` hook in `ballerina-visualizer` to avoid repeating the fetch.

---

## Phase 2 — Startup routing: skip home pages, land on agent diagram

Today's cold-start: `initialize` → (`renderInitialView` if isBI) → `activateLS` → `fetchProjectInfo` → `fetchProjectStructure` → `extensionReady`, then the first `OPEN_VIEW` (fired externally, e.g. WI extension) resolves via `findView` (L661) to `PackageOverview`/`WorkspaceOverview`.

**2.1 Initial navigation as a guarded machine transition** — modeled inside the machine itself, same style as the guarded `onDone` transitions in `initialize` (L183–228). No external subscriber.

In `fetchProjectStructure.onDone` (L283), add a guarded transition ahead of the default one:

```ts
onDone: [
    {
        target: "extensionReady",
        cond: () => isAgentBuilderMode(),
        actions: [
            assign({ projectStructure: (ctx, e) => e.data.projectStructure }),
            raise((ctx, e) => ({ type: "OPEN_VIEW", viewLocation: getAgentBuilderLocation(e.data.projectStructure) }))
        ]
    },
    { target: "extensionReady", /* existing */ }
]
```

`getAgentBuilderLocation()` (new, in `stateMachine.ts`) inspects `directoryMap[DIRECTORY_MAP.SERVICE]` (types in `packages/ballerina-core/src/interfaces/bi.ts` L390):
- One or more `ai` services **found** → the **first** entry: `{ documentUri: artifact.path, position: artifact.position }`. `findViewByArtifact` (`utils/state-machine-utils.ts` L335) already maps an `ai` service to `MACHINE_VIEW.BIDiagram` — exactly the diagram in the spec screenshot. (Projects created via Phase 3.1 always land here, since the agent is scaffolded at creation time.)
- **None** → `{ view: MACHINE_VIEW.AgentBuilderNoAgent }` — the "No AI agent found" choice view (Phase 3.2).

The raised `OPEN_VIEW` is consumed by the existing `extensionReady` handler (L306) → `viewActive` → `findView`/`showView`, so the agent view flows through the exact same pipeline as every other view. Because the guard sits on the machine's own lifecycle, the `lsError` → `RETRY` → `initialize` path re-runs it automatically.

**2.2 Guard default-view fallbacks** — add a small helper in `stateMachine.ts`, e.g. `getDefaultRootLocation(): VisualizerLocation` returning the agent diagram location (or wizard) in agent mode, else Package/Workspace Overview. Use it in every place that currently hardcodes overview fallbacks:

| Location | Current fallback |
|---|---|
| `stateMachine.ts` `findView` L666–681 | pushes Workspace/PackageOverview when `context.view` is empty |
| `stateMachine.ts` `showView` L718–725, L755–760 | resolves to Workspace/PackageOverview |
| `stateMachine.ts` `UPDATE_PROJECT_INFO` action L157 | opens WorkspaceOverview |
| `rpc-managers/visualizer/rpc-manager.ts` `goHome()` L89 | opens Workspace/PackageOverview |
| `rpc-managers/visualizer/rpc-manager.ts` `undo()`/`redo()` fallbacks L146, L160, timeout L205 | PackageOverview |
| `utils/source-utils.ts` L262 | PackageOverview |

**2.3 Avoid overview flash** — default machine context is `view: MACHINE_VIEW.PackageOverview` (L84). In agent mode initialize it to `undefined` so `MainPanel.tsx` (L330) keeps showing `LoadingRing` until the forced navigation lands.

---

## Phase 3 — AI Chat Agent artifact creation & open-time behavior (three conditions)

The agent is scaffolded **statically at project-creation time**; open-time routing then only ever sees two cases (agent exists / doesn't). The `AIChatAgentWizard` auto-create mode from earlier drafts is dropped — no marker mechanism, no wizard involvement in agent mode.

**Scaffold content** — static file templates added next to the existing scaffold constants in `utils/bi.ts` (`createBIProjectPure` already writes `agents.bal`, `main.bal`, etc. this way, L393–482), **identical to what `AIChatAgentWizard` generates — same file placement, same source**. No custom file layout (a dedicated `<projectname>.bal` is not a requirement) and no separate method that mutates the project afterwards: run the wizard once on a reference project and freeze its output as the template. That output comprises the `ai` service with the default Chat trigger, e.g.:

```ballerina
import ballerina/ai;
import ballerina/http;

listener ai:Listener chatAgentListener = new (listenOn = check http:getDefaultListener());

service /aiChatAgent on chatAgentListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {
        string stringResult = check aiChatAgent.run(request.message, request.sessionId);
        return {message: stringResult};
    }
}
```

placed in whichever file the wizard's flow puts it, plus: the agent declaration and `wso2ModelProvider` model provider in `agents.bal` (already part of the scaffold set, L452); the `chatAgentListener` where the wizard's listener step puts it (`AIChatAgentWizard.tsx` L293–316 targets `main.bal`); and the `Config.toml` entries for the default model (same effect as `configureDefaultModelProvider`, `rpc-managers/ai-agent/rpc-manager.ts`). Naming: agent source name = **project name**, camelCase-sanitized for the service path / agent variable (the wizard's `toCamelCase`/`toBaseName` rules, L84–115). The scaffold must be **100% identical to wizard output**, guaranteed by a test that diffs a scaffolded project against a wizard-created reference project byte-for-byte (re-run whenever the `ballerina/ai` module or the wizard changes). With that guarantee, `findViewByArtifact` → `BIDiagram` and the agent side panels behave identically for both creation paths.

**3.1 Condition 1 — creating a new project from Agent Builder**
- Thread a new `isAgentBuilder` (or `createAIAgent`) flag through the creation path: `ProjectRequest` type (`packages/ballerina-core`), `createProject` RPC (`rpc-managers/bi-diagram/rpc-manager.ts` L736), `BI_COMMANDS.CREATE_BI_PROJECT` handler (`features/bi/activator.ts` L197), into `createBIProjectPure` (L393) / `createBIWorkspaceWithProject` / `createEmptyBIWorkspace` (`utils/bi.ts`). The webview creation form sets it from `isAgentBuilder` context (or the handler defaults it from `isAgentBuilderMode()`).
- When set, `createBIProjectPure` writes the agent template files in the same pass as the rest of the scaffold, then `openInVSCode()` (L656) as today. After the reload, routing (Phase 2.1) finds the `ai` service → first-agent diagram. The existing `resolveMissingDependencies` state (`stateMachine.ts` L585, runs `bal build` with progress notifications) pulls `ballerina/ai` on first open.

**3.2 Condition 2 — opening a project with no AI agent**
- Routing resolves to **`AgentBuilderNoAgentView`** (new): `MACHINE_VIEW.AgentBuilderNoAgent` in `packages/ballerina-core/src/state-machine-types.ts`, a `MainPanel.tsx` case, and a small view with a warning ("No AI agent found in this project") and two actions:
  - **Continue with Agent Builder** → new RPC (e.g. `createDefaultAgent()` on the ai-agent RPC manager) that writes the **same template files** (shared constants from 3.1) into the open project, refreshes artifacts (`SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS`, `views/visualizer/activate.ts` L177), then `openView` on the new `ai` service → diagram. Show progress + Retry on failure.
  - **Open with WSO2 Integrator** → close the project: `commands.executeCommand('workbench.action.closeFolder')` (returns to the app's welcome; the user opens the project in WSO2 Integrator themselves). No session-fallback mode, no mode flipping.

**3.3 Condition 3 — opening a project with one or more AI agents**
- `getAgentBuilderLocation()` opens the **first** `ai` service in `directoryMap[DIRECTORY_MAP.SERVICE]` (project-structure order — deterministic). No agent picker; other agents in the project are simply not surfaced until multi-agent support.

---

## Phase 4 — Navigation lockdown

**4.1 TopNavigationBar** — `packages/ballerina-visualizer/src/components/TopNavigationBar/index.tsx` (used per-view by all BI views; the global `NavigationBar` in `MainPanel.tsx` L915 is already commented out). When `isAgentBuilder`: **early-return `null`** — hides home, back, and the breadcrumb trail in one place for every view. Each view keeps its own `TitleBar` (e.g. "AI Chat Agent"), so the screen isn't headerless.

**4.2 Extension-side guards** — `rpc-managers/visualizer/rpc-manager.ts`:
- `goHome()` (L89): in agent mode, clear history and reopen the agent diagram root (via `getDefaultRootLocation()`), not overview.
- `goBack()` (L76) can stay: history's root entry is the agent diagram, so back never escapes; verify sub-view back (tool form → diagram) still works.

**4.3 Command guards** — navigation commands remain invokable from the command palette even with UI hidden. Gate them:
- `package.json` (`ballerina-extension`): add `menus.commandPalette` entries with `"when": "!isAgentBuilderMode"` for BI navigation/creation commands (`BI.show.overview`, add-artifact commands `BI_COMMANDS.ADD_*`, `ballerina.open.bi.new`, etc.).
- Defense in depth: early-return in handlers that navigate away — `BI_COMMANDS.SHOW_OVERVIEW` (`features/bi/activator.ts` L138), `BI_COMMANDS.ADD_PROJECT` (L165), `SHARED_COMMANDS.SETUP_BALLERINA` (`views/visualizer/activate.ts` L184 — welcome must never render inside agent mode; the app owns welcome).

**4.4 Keep working**: `ballerina.open.agent.chat` (Chat panel), Try-It, run/debug, tracing, config view if reachable from the agent surfaces — untouched.

---

## Phase 5 — Project explorer (tree view)

The BI project explorer is **not** registered in this repo — it belongs to the `wso2.wso2-integrator` (WI) extension. This repo only drives it via `BI_COMMANDS.PROJECT_EXPLORER` / `PROJECT_EXPLORER_REFRESH` / `NOTIFY_PROJECT_EXPLORER` from `refreshProjectExplorer()` (`stateMachine.ts` L1098) and `notifyTreeView()` (L1111).

Extension-side work:
- Skip `refreshProjectExplorer()` / `notifyTreeView()` calls when `isAgentBuilderMode()` (avoids focusing/revealing the view).
- The `isAgentBuilderMode` setContext key from Phase 1.2 is the contract for the WI extension to hide its view container.

**External dependency (WI extension repo):** add `when: !isAgentBuilderMode` (or read the env var directly) on its viewsContainer/view contributions, and ensure whatever fires the initial `OPEN_VIEW`/welcome on startup defers to agent mode.

---

## Phase 6 — Restrict the diagram to the single AI Agent node

Target: the agent's chat-flow `BIDiagram` (`packages/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`).

- **Hide add-node (+)**: in agent mode pass `onAddNode`/`onAddNodePrompt` as `undefined` to `MemoizedDiagram` (wired at ~L3179). Verify `@wso2/bi-diagram` hides the + button when the handler is absent; if not, add a `disableNodeAddition` prop to the diagram package.
- **Belt-and-braces palette filter**: in `fetchNodesAndAISuggestions` (L949), when agent mode, filter the categories from `transformCategories` (L986, `FlowDiagram/utils.ts`) to an empty/agent-only set before `setCategories` — covers any code path that still opens `SidePanelView.NODE_LIST`.
- **Protect the invariant nodes**: guard node deletion/cut for the agent call node (and Return) in agent mode (`onDeleteNode` handler in `FlowDiagram/index.tsx`; the existing `findAgentCallNodes`/`removeAgentNode` helpers in `ComponentDiagram/index.tsx` L195 show how agent nodes are identified).
- **Lock the Chat trigger**: the default Chat trigger cannot be replaced with another trigger type, and additional triggers cannot be added.
  - Adding: already unreachable — ComponentListView/Overview are never rendered, and `ADD_*` / service-creation commands are gated (Phase 4.3). Verify no "add trigger/listener" affordance is reachable from the agent diagram or its side panels.
  - Editing: gate the reachable edit surfaces in agent mode — listener artifacts resolve to `MACHINE_VIEW.BIListenerConfigView` (`findViewByArtifact`, `utils/state-machine-utils.ts` L357–366): block this route in `getDefaultRootLocation()`-guarded navigation or render it read-only; sweep the ai-service header/edit actions in `AIAgentDesigner` (`views/BI/AIChatAgent/index.tsx`) and service-edit popups for listener-changing forms and hide them.
- **Keep**: everything inside the AI Agent node — Add Tool / Add MCP Server / Memory / Model config (`PanelManager.tsx` `SidePanelView.ADD_TOOL`, `NEW_TOOL`, `AGENT_LIST`, `MODEL_PROVIDER_LIST`, etc.) and the AI suggestions are unaffected.

---

## Phase 7 — Cosmetics

- Webview title: `views/visualizer/webview.ts` `biTitle` (L41) / `webviewTitle` (L160) → return "WSO2 Agent Builder" when `isAgentBuilderMode()`. Same for the loading `<h1>` (L207) and icon selection (`stateMachine.ts` L567).
- Review remaining "WSO2 Integrator" strings surfaced in agent-mode views (e.g. `MainPanel.tsx` `gitIssueUrl`, wizard subtitle) — optional.

---

## External dependencies (not in this repo)

| Owner | Work |
|---|---|
| product-integrator | Set `AGENT_BUILDER_MODE=true` for the Agent Builder flavor via `lib/vscode/product.json` → `runtimeEnv.common` (same mechanism as `WSO2_INTEGRATOR_RUNTIME`; auto-propagates to the extension host through `runtimeEnvironment.ts`). |
| WI extension (`wso2.wso2-integrator`) | Hide project-explorer viewsContainer under agent mode; "Create Agent" welcome form; don't fire overview-opening startup commands in agent mode. |

## Risks / edge cases

- **First-run latency / offline**: `ballerina/ai` is pulled from Central on first open via `resolveMissingDependencies` (`bal build`); offline failure surfaces as unresolved modules — verify the error UX in agent mode, and the Retry path for the runtime scaffold (Phase 3.2).
- **Webview reload / VS Code window restore**: after the guarded transition has run once, panel close/reopen goes through `viewActive` and history (whose root entry is the agent view), and "Developer: Reload Window" re-runs the full machine lifecycle including the guard — verify both, plus the `closeOrphanWebviewTabs` path in `openWebView` (L555).
- **`bi-diagram` package behavior** with undefined `onAddNode` needs verification (Phase 6).
- **Escape hatches audit**: popup views (`StateMachinePopup`), `updateView` SKIP handling (L907), debugger `config-provider.ts` L535/566 openView calls — sweep for any path that can land on a non-agent view.
- **Multi-root workspaces**: agent builder should always produce single-package projects; guard `WorkspaceOverview` branches anyway (covered by `getDefaultRootLocation()`).

## Open decisions

1. Exact env var name/value (`AGENT_BUILDER_MODE=true` assumed; align with product.json).
2. Default model provider in the static scaffold: WSO2 default provider (`wso2ModelProvider` + `configureDefaultModelProvider`) assumed — confirm for non-WSO2/BYO-key setups (the wizard branches on `getAiModuleOrg`).
3. `AgentBuilderNoAgentView` detection scope: keyed on `ai` services in the project structure — confirm this matches "no AI agent" for edge cases (agent declared but no service, `_agent_chat.bal` test wrappers).

Resolved: agent scaffolded statically at creation time (no marker, no wizard auto-create); agent name = project name; first agent opens when multiple exist; "Open with WSO2 Integrator" closes the project; breadcrumb bar fully hidden; Chat trigger locked (no replacement, no additional triggers).

## Test plan

1. Create new project in agent mode → agent artifacts scaffolded **identical to `AIChatAgentWizard` output** (diff against a wizard-created reference project), package compiles, `bal build` pulls `ballerina/ai` → lands on the agent diagram; no overview/welcome flash.
2. Reopen existing agent project (single agent) → straight to its diagram, no duplicate creation. Project with **multiple** agents → first agent's diagram, deterministically.
3. Open existing project **without** an AI agent → `AgentBuilderNoAgentView`; "Continue with Agent Builder" scaffolds the agent at runtime, refreshes artifacts, lands on diagram (Retry on failure); "Open with WSO2 Integrator" closes the folder.
4. Env unset → zero behavior change (full regression on BI mode: overview, tree, wizard, navigation).
5. Lockdown probing: command palette BI commands, goHome/goBack RPCs, undo-timeout fallback → never leave agent surfaces; no breadcrumb bar rendered anywhere.
6. Diagram: + button absent, node list never shows non-agent nodes, agent node not deletable; Chat trigger can't be replaced and no second trigger can be added; tools/memory/model editing and Chat panel work end-to-end.
7. Window reload, webview close/reopen, LS error → `lsError` → RETRY path re-enters agent mode correctly.

---

## Flow summary

**Project creation (inside the Agent Builder app, welcome owned by WI):**

```
Create form → CREATE_BI_PROJECT(isAgentBuilder) → createBIProjectPure scaffolds project
        └── same pass also writes the agent artifacts (Chat trigger service,
            agent + model provider), identical to wizard output             [Phase 3.1]
                └── openInVSCode() reloads window on the new folder
```

**Cold start (project opens in the editor):**

```
AGENT_BUILDER_MODE=true on extension host (product.json runtimeEnv)
        │
        ▼
Extension activates → state machine starts
  context: { isAgentBuilder: true, view: undefined }        [Phase 1, 2.3]
        │
        ▼
initialize ──(isBI)──► renderInitialView (webview opens, LoadingRing — no overview flash)
        │
        ▼
activateLS ──► fetchProjectInfo ──► fetchProjectStructure
        │
        ▼  onDone, cond: isAgentBuilderMode()               [Phase 2.1]
raise OPEN_VIEW( getAgentBuilderLocation(projectStructure) )
        │
        ├── ai service(s) EXIST ───────────► FIRST { documentUri, position }
        │   (incl. every freshly               └► findViewByArtifact → BIDiagram
        │    created project, 3.1)
        │
        └── no ai agent ───────────────────► AgentBuilderNoAgentView       [Phase 3.2]
            (existing project)                 ├─ Continue with Agent Builder
                                               │    └► write agent template files →
                                               │       refresh artifacts → BIDiagram
                                               └─ Open with WSO2 Integrator
                                                    └► workbench.action.closeFolder
        │
        ▼
extensionReady ──OPEN_VIEW──► viewActive: findView → showView → viewReady
        │
        ▼
Webview renders agent diagram
  · TopNavigationBar hidden entirely (no home/back/breadcrumbs) [Phase 4]
  · No project explorer (setContext → WI extension)             [Phase 5]
  · No + node button, palette filtered, agent node + Chat
    trigger locked                                              [Phase 6]
```

**Steady state (all escape attempts converge back):**

| Attempt | Intercepted by |
|---|---|
| goHome / undo-redo fallback | `getDefaultRootLocation()` → agent diagram [2.2, 4.2] |
| goBack past history root | history root *is* the agent view — no-op |
| Breadcrumb navigation | bar not rendered [4.1] |
| Command palette (SHOW_OVERVIEW, ADD_*, SETUP_BALLERINA) | `when: !isAgentBuilderMode` + handler guards [4.3] |
| Add node on diagram | no + button, empty palette [6] |
| Replace Chat trigger / add second trigger | listener & service edit surfaces gated; add paths blocked [6, 4.3] |

One env read → one machine context flag → machine owns all routing via one guarded transition and one default-location helper → agent scaffolding is a plain creation-time template shared by both creation paths → four webview surfaces read the flag once each.
