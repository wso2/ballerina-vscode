Run two integrations of a multi-package workspace concurrently.

The scenario opens the two-package workspace template
(`e2e-playwright-tests/data/concurrent_run_workspace`: `alpha_runner` and
`beta_runner`, each a long-running automation printing a unique start marker),
opens alpha_runner's package overview and runs it, then opens beta_runner's
overview and runs it, verifying:

1. No prompt of any kind appears for the second run — neither the
   "This integration is already running" notification nor VS Code's
   "task is already active" modal (task identities are per integration).
2. Both runs keep dedicated task terminals ("Ballerina Run - <package>")
   with intact output.
3. Re-running beta_runner prompts "This integration is already running.
   Do you want to stop it and start it again?"; declining leaves both runs
   alive.

Promoted spec: `e2e-playwright-tests/run-concurrent/run-concurrent.spec.ts`.

Known UI facts discovered while authoring (kept for future iterations):
- Selecting a workspace tree node does NOT focus the integration; the focused
  project changes only when the package overview is opened via the node's
  inline "Open Overview" action.
- A run started from the workspace overview opens the
  "Select an integration to run" quickpick whose items are project PATHS;
  typing the package name filters it.
