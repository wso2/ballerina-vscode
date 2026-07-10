# HTTP Try It Scenario (DRAFT)

> Draft scenario for the HTTP **Try It** feature. Written to match the *actual*
> product behavior in `packages/ballerina-extension/src/features/tryit`, not the
> older `api-integration/HTTP_TRY_IT_TEST_SPEC.md` doc (which describes a
> `.ballerina/tryit.http` REST-Client file that the product no longer generates).
> Intended to be edited before step files are authored.

## Goal

Create a project with a running HTTP service, click **Try It** from the Service
Designer, and verify the generated **Hurl notebook** (`target/TryIt.hurl`) opens
with a request cell for the service resource. Then send the request from the
notebook and verify a live response is returned by the running integration.

## What the product actually does (confirmed from source)

- The Service Designer "Try Service" section renders a **Try It** button
  (`tooltip="Try Service"`, visible text `Try It`, play icon) plus a split-button
  dropdown offering `Try It` and `Try It with AI`
  (`packages/ballerina-visualizer/src/views/BI/ServiceDesigner/index.tsx`,
  `handleServiceTryIt` at ~line 786, button markup at ~line 1030).
- Clicking **Try It** runs the `PALETTE_COMMANDS.TRY_IT` command
  (`src/features/tryit/activator.ts`).
- For an HTTP service it builds a Hurl notebook from the service's OpenAPI spec
  and writes it to `<project>/target/TryIt.hurl` (activator.ts:178), then opens
  it via `vscode.commands.executeCommand('HTTPClient.importHurlString', ...)`
  (activator.ts:263). Service-level Try It is savable (Cmd+S); resource-level
  Try It is read-only.
- If **no** Ballerina process is running for the project, a warning dialog
  appears first (activator.ts:663):
  > The "Try It" feature requires a running Ballerina service.
  > Would you like to run '<project>' now?
  with actions **Run Integration** and **Cancel**. Choosing **Run Integration**
  starts debugging, waits for the service, then opens the notebook.
- Multiple services in the project trigger a **quick pick** to choose which
  service to Try It.

## Steps

| Step | Action | Notes |
|------|--------|-------|
| 01 | Create project | Reuse `createProject` flow from `http-upload` step 01. |
| 02 | Create HTTP service with a `GET /greeting` resource | Reuse `createHttpServiceWithResource('GET', 'greeting')` helper. |
| 03 | Configure resource to return a fixed JSON/string payload | Give the running service a deterministic body to assert against. |
| 04 | Run the integration and wait for the port to serve | Reuse the run + `waitForEndpoint` pattern from `http-upload` step 03. |
| 05 | Create a Http `Post` resource method | Check whether it is created |
| 06 | Open Service Designer and click **Try It** | Click Button with visible text `Try It` / tooltip `Try Service`. |
| 07 | Verify the Hurl notebook opens | Assert `target/TryIt.hurl` exists on disk AND the notebook editor is active. |
| 08 | Verify the request cell content | Cell should contain `GET http://localhost:<port>/greeting`. |
| 09 | Execute the request cell (send) | Run the notebook cell; wait for the response output. |
| 10 | Verify the response | Assert response status 200 and the expected body appears in the cell output. |
| 11 | Try the Post method | Check the responce comeback |
| 12 | Request with **path params** | Add a resource like `GET /greeting/[string name]`; in the Hurl cell replace the sample path segment with a real value and send; assert 200 + the path value echoed in the body. |
| 13 | Request with **query params** | On a resource with a query param (`?name=...`), edit the cell URL query value and send; assert the query value is reflected in the response. |
| 14 | Request with **headers** | Add a custom request header line (e.g. `X-Test: probe`) to the Hurl cell and send; assert 200 (and, if the resource echoes headers, that the header is reflected). |
| 15 | Request with **JSON body** | On the POST resource, set the cell body to `{"content":"hello"}` with `Content-Type: application/json`; send; assert the JSON was accepted (200) and parsed. |
| 16 | **View response status** | After a send, read the cell output and assert the status line shows `200` (and a 4xx case for a bad request, if added). |
| 17 | **View response body** | Assert the response body content in the cell output matches the deterministic payload from step 03. |
| 18 | **View response headers** | Assert response headers are shown in the cell output (e.g. `content-type`). |
| 19 | **Auto start service prompt** | On a *stopped* service, click **Try It**; assert the "requires a running Ballerina service" warning; click **Run Integration**; assert the service starts and the notebook opens (see follow-up flows). |
| 20 | **Try It from resource menu** | From a specific resource's menu/actions in the Service Designer, trigger resource-level Try It; assert a read-only notebook opens containing only that resource's request. |


### Optional / follow-up flows (add as separate steps once the base flow passes)

- **Auto-start prompt**: skip step 04, click Try It on a *stopped* service,
  assert the "requires a running Ballerina service" dialog, click
  **Run Integration**, then continue from step 06.
- **Cancel path**: same as above but click **Cancel**; assert no notebook opens.
- **Multiple services**: create a second HTTP service, click Try It, assert the
  quick pick lists both services, pick one, assert the correct notebook opens.
- **Resource-level Try It** (read-only) vs **Service-level Try It** (savable).

## Selector Policy

- Use `data-testid`, stable roles, and stable accessible text only.
- Do not use Emotion or generated class selectors.
- Add missing product `data-testid` values (rebuild + reinstall VSIX) before
  promoting a UI-driven selector — see the skill's "Missing Test IDs" step.

## Status / Coverage (confirmed via authoring daemon)

**Authored & proven (daemon steps 01–05, run end-to-end):**
- `steps/01_project` → `steps/05_send_and_response` cover scenario steps 01–10:
  create project, HTTP service + `GET /greeting` returning fixed JSON, then drive
  Try It entirely from the **toolbar button** (no palette run): Try It → Hurl
  Client pick → **Run Integration** (auto-starts the service) → **Test with Try
  It Client?** → `target/TryIt.hurl` generated + notebook opens, execute cell
  (success state), response verified via HTTP probe.

**Try It auto-start is racy (important):** clicking Run Integration starts the
service, but the notebook is then produced by one of two competing flows — the
Try It button's own post-start continuation, OR a debug-session hook
(`config-provider.ts:433`) that re-prompts "Test with Try It Client?" and builds
it when confirmed. Which wins varies, and the info toast collapses in ~10s. The
robust driver (in `steps/04` and the spec) is a single loop that polls for the
generated `TryIt.hurl` while clicking "Test" (toast **or** Notification Center)
whenever it surfaces. Notification action buttons need plain clicks (a forced
click fails "outside of the viewport").

**Promoted spec:** `e2e-playwright-tests/api-integration/http-try-it.spec.ts`
(registered in `test.list.ts`, Group 1) covers the same core flow using the
committed `initTest` harness + `empty_project` template.

**Confirmed product behavior (from source + live run):**
- Try It button: Service Designer `Button` with visible text `Try It`
  (accessible name has a leading space from the play icon — match by text or
  `/Try It/`, not exact `Try It`).
- First Try It surfaces a **native quick pick** ("Try It (Try service with Hurl
  Client)" vs "Try It with AI …") — select via `getByRole('option', { name:
  /Try It.*Hurl Client/ })` at the workbench level (not inside the webview).
- Generated file is `<project>/target/TryIt.hurl` (a **Hurl notebook**, opened
  via `HTTPClient.importHurlString`), NOT `.ballerina/tryit.http`.
- The request cell is a `hurl` code cell; execute via focusing
  `.cell.code .monaco-editor` + `Ctrl+Enter`; success shows
  `.codicon-notebook-state-success`.
- Hurl generation format (`src/features/tryit/hurl-builder.ts`, verified): request
  line `METHOD <baseUrl><path>` with path params replaced by sample values;
  header params as `Name: value`; JSON body as `Content-Type: application/json`
  + `# Modify the JSON payload…` + sample JSON; query params as a
  `[QueryStringParams]` section. Markdown cells document path/query params.
- The `http-service-card` id and `function-card-HTTP Service` testid both exist
  on the artifact card.

**Deferred (documented, not yet automated) — scenario steps 12–20:**
- **12–15 path/query/header/JSON-body**: need extra resource shapes (path-param
  resource, query param, header param, POST + payload). The generated `TryIt.hurl`
  templates are deterministic (see format above) — the robust assertion is on the
  generated file plus an HTTP probe of the running service, NOT editing/reading
  notebook cells. Reuse the `configureUploadResourceIO`-style flow to add query +
  payload.
- **16–18 response status/body/headers**: the Hurl client renders its response in
  a sandboxed output-renderer iframe that Playwright cannot read reliably. The
  proven approach: assert the cell's success state + verify the response via a
  direct HTTP probe (`fetch`), which issues the same request the cell does.
- **19 auto-start prompt**: DONE — this is now the primary run mechanism in the
  proven flow (Try It → Run Integration → Test), see the racy-flow note above.
- **20 resource-menu Try It**: resource-level Try It passes `resourceMetadata`
  and opens a read-only single-resource notebook; needs the per-resource action
  located/`data-testid`'d in `ServiceDesigner/index.tsx`.

## Gaps

_Selector/behavior facts are now in "Status / Coverage" above. Remaining open
questions for extending to steps 12–20:_

- **Notebook cell output is not readable.** The Hurl client renders its response
  in a sandboxed output-renderer iframe; Playwright cannot read the status/body/
  headers from it. Verify responses with a direct HTTP probe instead (the cell
  issues the same request). Only the cell's `codicon-notebook-state-success`
  execution state is reliably observable.
- **Auto-start prompt ordering (step 19).** The "requires a running Ballerina
  service" warning competes with a "1 service found … Test with Try It Client?"
  info prompt, and the Try It button renders icon-only right after a task
  terminate. Disambiguate the prompt sequence (and a robust way to stop the
  service) before automating.
- **Resource-menu Try It (step 20).** Locate the per-resource Try It action in
  `ServiceDesigner/index.tsx`; may need a `data-testid` on the resource row.

**Harness fixes made while authoring (in `e2e-authoring/scripts/`):**
`daemon.mjs` now exposes `Buffer`/`URL`/timers to the step VM context and no
longer crashes when a step logs then throws; `prelude.js` `ensureWorkbench`
re-acquires the window after the project-open reload (Playwright `firstWindow`
does not re-fire for a reload). Both were prerequisites for the flow to run.
