# Workflows status

Ported from `wso2/vscode-extensions` and `ballerina-platform/ballerina-language-server`,
then pruned to a ballerina-only monorepo. Paths have been rewritten to the new layout
(`packages/ballerina-extension`, `submodules/wso2-vscode-extensions/workspaces/common-libs/`).

## Ballerina language server workflows

| File | Source | Trigger |
|---|---|---|
| `ls-build-master.yml` | ballerina-language-server repo | push to main, scoped to `packages/ballerina-language-server/**` |
| `ls-publish-release.yml` | ballerina-language-server repo | manual release |
| `ls-trivy.yml` | ballerina-language-server repo | scheduled security scan + manual |

(The LS PR build and LS daily build are merged into `pull-request.yml` and
`daily-build.yml` respectively.)

Each has `defaults.run.working-directory: packages/ballerina-language-server` injected so
`./gradlew …` steps resolve correctly from repo root.

## VSCode extension workflows

| File | Trigger | Notes |
|---|---|---|
| `build.yml` | `workflow_call` only | Reusable build pipeline (ballerina-only) |
| `daily-build.yml` | nightly cron + manual | Runs the LS multi-branch pack/test/Windows-build matrix **and** calls `build.yml` for the extension (with `runTests: true`, `runBalE2ETests: true`), then dispatches success/failure notifications |
| `pull-request.yml` | PRs + manual | Detects changes with `dorny/paths-filter`; runs LS gradle build (Ubuntu+Windows) and/or `build.yml` for the extension depending on what changed |
| `release-vsix.yml` | manual dispatch | Builds, creates GitHub release, opens version-bump PR back to `stable/ballerina` |
| `publish-vsix.yml` | manual dispatch | Publishes a built VSIX (passed by `workflowRunId`) to VSCode Marketplace + OpenVSX |
| `cache-cleanup.yml` | PR closed + manual | Generic — usable as-is |
| `sync-main-with-releases.yml` | PR merged to `stable/ballerina**` | Opens an auto-sync PR back to `main` |

## Required GitHub secrets

- `packageUser` / `packagePAT` — LS Gradle (GitHub Packages, `read:packages` scope)
- `BALLERINA_BOT_USERNAME` / `BALLERINA_BOT_TOKEN` — LS publish workflow
- `BALLERINA_CENTRAL_ACCESS_TOKEN` — LS publish to Ballerina Central
- `CHOREO_BOT_TOKEN` / `CHOREO_BOT_EMAIL` / `CHOREO_BOT_USERNAME` — release-vsix, sync-main
- `VSCE_TOKEN` — publish-vsix → VSCode Marketplace
- `OPENVSX_TOKEN` — publish-vsix → OpenVSX
- `BI_TEAM_CHAT_API` — release/daily notifications
- `TOOLING_TEAM_CHAT_API` — failure notifications
- `CLOUD_EDITOR_BUILDER_REPO` / `CLOUD_EDITOR_BUILDER_REPO_TOKEN` — optional cloud-editor dispatch on stable release
- `BALLERINA_AUTH_*` / `BALLERINA_DEV_COPLIOT_*` / `COPILOT_*` / `APPINSIGHTS_INSTRUMENTATION_KEY` — passed through to the build composite action

Configure these in the new repo's settings before triggering anything.

## Composite actions under `.github/actions/`

| Action | Used by |
|---|---|
| `build` | `build.yml` — runs rush install + `rush build --to ballerina` |
| `updateVersion` | `build` — bumps `packages/<name>/package.json` |
| `release` | `release-vsix.yml` — creates GitHub release with the VSIX |
| `pr` | `release-vsix.yml` — opens version-bump PR + Google Chat notification |
| `dailyBuildNotification` | `daily-build.yml` — success chat notification |
| `failure-notification` | `daily-build.yml`, `release-vsix.yml` — failure chat notification |
