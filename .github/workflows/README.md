# Workflows status

Copied from `wso2/vscode-extensions` and ported for the ballerina-vscode monorepo. Paths
have been rewritten (`workspaces/ballerina/ballerina-extension` → `packages/ballerina-extension`,
`workspaces/common-libs/` → `submodules/wso2-vscode-extensions/workspaces/common-libs/`),
but many workflows still contain branches that referenced **other extensions** (`mi`, `bi`,
`choreo`, `apk`, `hurl-client`, `api-designer`, `wso2-platform`, `mcp-inspector`) which do
not exist in this repo. Those branches are dead code — they remain so the workflows can be
diffed against upstream, but they need to be pruned before they actually run.

## Ballerina language server workflows (already ported)

| File | Source | Notes |
|---|---|---|
| `ls-build-master.yml` | ballerina-language-server repo | Path-filtered to `packages/ballerina-language-server/**` |
| `ls-pull-request.yml` | ballerina-language-server repo | Path-filtered |
| `ls-daily-build.yml` | ballerina-language-server repo | Schedule-driven |
| `ls-publish-release.yml` | ballerina-language-server repo | Manual release |
| `ls-trivy.yml` | ballerina-language-server repo | Security scan |

Each has `defaults.run.working-directory: packages/ballerina-language-server` injected so
`./gradlew …` steps still resolve.

## VSCode extension workflows (need review)

| File | Status | Action items |
|---|---|---|
| `build.yml` | Reusable `workflow_call`. Heavily multi-extension. | Strip `mi`, `bi`, `choreo`, `apk`, `hurl-client`, `wso2-platform`, `api-designer`, `mcp-inspector`, `fhir-tools` matrix branches and inputs. |
| `daily-build.yml` | Calls `build.yml`. Probably mostly OK if `build.yml` is tightened. | Verify inputs match the trimmed `build.yml`. |
| `test-pr.yml` | Calls `build.yml` on PRs. | Same. |
| `publish-vsix.yml` | Publishes to VSCode Marketplace + OpenVSX. Multi-extension. | Reduce extension input to just `ballerina` (and any other extensions you plan to host here). |
| `release-vsix.yml` | Creates GitHub release VSIX. Multi-extension. | Same. |
| `save-cache.yml` | Pre-builds rush cache. | Uses `@gigara/rush-github-action-build-cache-plugin` which we removed (`common/config/rush/rush-plugins.json`). Either re-enable plugin or drop this workflow. |
| `cache-cleanup.yml` | Cleans caches on PR close. | Generic — likely usable as-is. |
| `sync-main-with-releases.yml` | Syncs `main` ↔ `stable/**` branches. | Only useful if you adopt the same `stable/*` release-branch model. |

## Required GitHub secrets

The ported workflows reference (at minimum):

- `BALLERINA_BOT_USERNAME` / `BALLERINA_BOT_TOKEN` (LS publish, sync workflows)
- `BALLERINA_CENTRAL_ACCESS_TOKEN` (LS publish)
- `CHOREO_BOT_TOKEN` / `CHOREO_BOT_EMAIL` / `CHOREO_BOT_USERNAME` (sync-main-with-releases)
- `VSCE_PAT` / `OVSX_PAT` (publish-vsix → VSCode Marketplace, OpenVSX)
- `packageUser` / `packagePAT` (LS gradle, via env vars)

Configure these in the new repo's settings before triggering anything.
