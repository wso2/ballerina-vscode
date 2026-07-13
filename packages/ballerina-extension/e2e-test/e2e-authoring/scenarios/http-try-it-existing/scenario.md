# HTTP Try It — Existing Service Scenario

## Goal

Unlike `http-try-it` (which creates the project, service, and resource through
the UI), this scenario opens a **pre-existing fixture project** that already
contains a compiled HTTP service, and verifies Try It works against it without
any authoring step.

Fixture: `e2e-playwright-tests/data/http_try_it_existing_project`
(`service.bal`, pre-baked, not modified at runtime):

```ballerina
import ballerina/http;

listener http:Listener httpListener = new (9090);

service / on httpListener {
    resource function get greeting() returns json {
        return {message: "Hello, Ballerina!"};
    }
}
```

No project-creation step, no HTTP-service-creation step, no return-node step —
the scenario starts from this fixture directly.

## Steps

| Step | Action | Notes |
|------|--------|-------|
| 01 | Open the fixture workspace, navigate to the existing HTTP service | The Integrator Overview must show the service already discovered from source; open its Service Designer. |
| 02 | Click **Try It** from the Service Designer toolbar, auto-start via **Run Integration**, confirm **Test** | Reuse the auto-start-and-wait-for-hurl pattern from `http-try-it` steps 04–05. |
| 03 | Execute the generated Hurl request cell and verify a live response | Same verification approach as `http-try-it`: notebook cell success state + direct HTTP probe (`GET /greeting`). |

## Selector Policy

Same as `http-try-it`: `data-testid`, stable roles/accessible text only, no
Emotion/generated class selectors.

## Status / Coverage (confirmed via authoring daemon)

**Authored & proven (steps 01–03, run end-to-end in a fresh daemon session):**

- **How an already-existing service is surfaced (was Gap 1):** no card/testid
  lookup is needed. The Integrator Overview's architecture diagram discovers
  the service straight from `service.bal` and renders a node containing the
  text `http:Service` — the *same* node shape a freshly-created service would
  get. `webview.getByText('http:Service', { exact: false }).first().click()`
  opens the Service Designer directly, which already shows the **Try It**
  button (no artifact-creation step, no distinct "existing service" UI).
- **Workspace entry point (was Gap 2):** the workspace opens directly into a
  usable state — `getBIWebview()` (which just waits for the `WSO2 Integrator`
  webview label) resolves immediately with no prior activity-bar click or
  navigation step. The project was never created through the wizard in this
  session, and that doesn't matter: opening the folder is sufficient for the
  Integrator webview and its Overview/diagram to be ready.
- Steps 02–03 reuse the proven `http-try-it` auto-start-and-wait-for-hurl
  pattern (Try It → Hurl Client pick → **Run Integration** → poll for
  `target/TryIt.hurl` while dismissing "Test with Try It Client?" whenever it
  surfaces) and the execute-cell-then-HTTP-probe verification, unchanged.
- **Notebook-tab-open race (found here, not present in `http-try-it`'s daemon
  steps):** checking for the `TryIt.hurl` editor tab immediately after
  `fs.existsSync(target/TryIt.hurl)` becomes true is flaky — the file write and
  the tab rendering are not atomic; a single check can observe the file but not
  yet the tab. Fixed in `steps/02_try_it_autorun.step.js` with a short
  (15s) poll of `hostSnapshot()` for the `tab "TryIt.hurl` text instead of one
  check. The promoted spec's equivalent assertion
  (`expect(locator).toBeVisible({ timeout: 30000 })`) already auto-retries and
  did not need this fix.

**Promoted spec:** `e2e-playwright-tests/api-integration/http-try-it-existing.spec.ts`
(registered in `test.list.ts`, Group 1), using
`initTest(true, true, undefined, undefined, PROJECT_TEMPLATE)` with
`PROJECT_TEMPLATE = data/http_try_it_existing_project`.

## Gaps

None outstanding for the base flow (steps 01–03). Not yet covered: resource-
level Try It, multiple-services quick pick, and the request-shape variations
(path/query/header/JSON body) already deferred in `http-try-it`'s own scenario
— out of scope here since this scenario's purpose is specifically the
existing-project entry point, not exhaustive Try It coverage.
