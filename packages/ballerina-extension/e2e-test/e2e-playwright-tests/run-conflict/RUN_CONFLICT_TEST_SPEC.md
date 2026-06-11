# Run Conflict (Single-Instance) - Test Specification

## Application Overview

WSO2 Integrator allows only **one running integration at a time** (decision for 5.0.0, see
wso2/product-integrator#1012). When the user starts a run while another integration is
already running, the extension must show a prompt and handle both choices gracefully:

- **Yes** → stop the running integration, wait for the process to fully terminate
  (port released), then start the new run.
- **No** → leave the running integration untouched; the new launch is cancelled cleanly
  (no broken debug session, no Try-It popup).

The conflict handling lives in `BIRunAdapter.launchRequest`
(`src/features/debugger/config-provider.ts`, introduced by wso2/vscode-extensions#2076).

## UI Elements Identified

- **Run Integration** button (aria-label "Run Integration") - editor toolbar
- **Conflict notification** - info notification: "There is already a running integration.
  Do you want to stop it and start this integration?" with **Yes** / **No** buttons
- **Force-start notification** - warning notification after a 10 s termination timeout:
  "The previous run has not stopped yet (terminate was already sent). Force start anyway?"
  with **Force Start** / **Cancel new launch** buttons
- **Terminal panel** - task terminal running `bal run`

> Note: the e2e harness enables Do Not Disturb by default (`toggleNotifications(true)` in
> `initTest`). This suite re-enables notifications so the conflict prompt is visible, and
> restores DND at the end.

## Missing Test IDs Recommendations

1. `data-testid="run-conflict-notification"`
2. `data-testid="run-conflict-yes-button"` / `data-testid="run-conflict-no-button"`
3. `data-testid="force-start-notification"`

## Test Scenarios

### 1. Second run shows conflict prompt (Description: Run while another run is active)

**Steps:**
1. Create an automation and overwrite `automation.bal` with a long-running main
   (sleeps ~5 min) so the first run stays alive.
2. Click **Run Integration**; wait for "Running executable" in the terminal.
3. Click **Run Integration** again.
4. Verify the notification "There is already a running integration..." appears with
   **Yes** and **No** buttons.

### 2. Decline keeps the current run (Description: Choose "No" on the prompt)

**Steps:**
1. With the prompt visible, click **No**.
2. Verify the notification disappears.
3. Verify the original process is still running ("Running executable" still in terminal,
   task not terminated).
4. Verify no error notification and no Try-It view is opened for the cancelled session.

### 3. Accept stops old run and starts new (Description: Choose "Yes" on the prompt)

**Steps:**
1. Click **Run Integration** again; the conflict prompt appears.
2. Click **Yes**.
3. Verify the old task terminates and a new `bal run` task starts
   (fresh "Compiling source" → "Running executable" sequence in the terminal).
4. Verify exactly one integration is running afterwards (a further Run click prompts again).

### 4. (Manual / future) Cross-package switch

Covered manually with the `run-switch-sample` workspace (listener → automation,
listener → listener on another port). Automating this requires a multi-package
workspace template in `data/` and project-explorer-driven run, which the current
harness does not support yet.

### 5. (Manual) Force-start timeout path

Requires a process that ignores SIGTERM for >10 s to trigger the force-start prompt;
validated manually.
