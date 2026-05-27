# Contributing to ballerina-vscode

This is a rush.js monorepo containing the Ballerina VS Code extension, the Ballerina
language server, the TextMate grammar, and the supporting webview / diagram packages
that the extension renders. Shared `@wso2/*` libraries (ui-toolkit, font, copilot-utilities,
etc.) are consumed from the `wso2/vscode-extensions` repo via a git submodule.

## Repository layout

```
ballerina-vscode/
├── packages/                         # First-class workspace packages
│   ├── ballerina-extension/          # The VS Code extension (TypeScript)
│   ├── ballerina-language-server/    # Gradle-built Java language server
│   ├── ballerina-grammar/            # TextMate grammar source
│   ├── ballerina-core/               # Shared types
│   ├── ballerina-rpc-client/         # Extension <-> webview RPC
│   ├── ballerina-visualizer/         # Main webview
│   ├── ballerina-side-panel/         # Side-panel webviews
│   ├── ballerina-low-code-diagram/   # Low-code diagram renderer
│   ├── ballerina-statement-editor/   # Statement editor
│   ├── ballerina-data-mapper/        # Data mapper
│   ├── bi-diagram/                   # BI diagram
│   ├── sequence-diagram/             # Sequence diagram
│   ├── component-diagram/            # Component diagram
│   ├── type-diagram/                 # Type diagram
│   ├── persist-layer-diagram/        # Persist layer diagram
│   ├── graphql/                      # GraphQL view
│   ├── graphql-design-diagram/       # GraphQL design diagram
│   ├── type-editor/                  # Type editor
│   ├── record-creator/               # Record creator
│   ├── trace-visualizer/             # Trace visualizer
│   ├── overview-view/                # Overview view
│   └── syntax-tree/                  # Syntax tree utilities
│
├── submodules/
│   └── wso2-vscode-extensions/       # Submodule for shared common-libs
│                                     #   (font-wso2-vscode, ui-toolkit,
│                                     #    playwright-vscode-tester,
│                                     #    copilot-utilities, wso2-platform-core)
│                                     # Pinned to release/ballerina-5.12.x
│
├── common/
│   ├── config/rush/                  # Rush configuration
│   ├── autoinstallers/rush-plugins/  # @gigara/rush-github-action-build-cache-plugin
│   └── scripts/                      # install-run-rush.js, env-webpack-helper.js
│
├── .vscode/                          # Launch/debug configs + tasks
├── .github/
│   ├── workflows/                    # CI workflows (see workflows/README.md)
│   └── actions/                      # Composite actions used by workflows
├── rush.json                         # Project registry
├── rush-config.json                  # Per-project rush settings template
└── ballerina-extension.code-workspace
```

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20, < 23 (LTS 22.x recommended) | Use [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | 10.11.0 (auto-installed by rush) | Don't install globally |
| Rush | 5.155.1 (auto-installed via `common/scripts/install-run-rush.js`) | A global `rush` shim is enough |
| Java JDK | 21 | The LS needs 21 (some submodules require 21+) |
| Ballerina distribution | 2201.13.x | [Install](https://ballerina.io/downloads/) |
| Docker | Optional | Only needed for persist-service LS integration tests |
| GitHub PAT with `read:packages` | Required for LS build | Authenticates against `maven.pkg.github.com/ballerina-platform/*` |

### Configuring credentials for the language server

The Gradle build pulls Ballerina language artifacts from GitHub Packages. Put your
PAT in `~/.gradle/gradle.properties`:

```properties
packageUser=<your-github-username>
packagePAT=<token-with-read:packages-scope>
```

These are also read from the `packageUser`/`packagePAT` env vars if you prefer
that — `build.gradle` falls back to `findProperty(...)` if env vars are unset.

### Configuring JAVA_HOME

```bash
# in ~/.zshrc (or equivalent)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH=$JAVA_HOME/bin:$PATH
```

`/usr/libexec/java_home -V` lists installed JDKs (macOS). Install Temurin 21 with:

```bash
brew install --cask temurin@21
```

## Initial checkout

```bash
git clone --recurse-submodules https://github.com/wso2/ballerina-vscode.git
cd ballerina-vscode

# If you cloned without --recurse-submodules:
git submodule update --init --recursive

# Install all workspace dependencies (rush manages this; do NOT run npm/pnpm install directly)
rush update
```

`rush update` resolves dependencies for all 28 projects (ballerina packages + the
submodule's shared common-libs + the LS package.json stub). The first run takes
several minutes; subsequent runs hit the install cache.

## Day-to-day commands

```bash
# Build everything — TS packages, grammar, LS (via Gradle), and the extension
# (webpack + vsce package). All 27 projects are reachable from ballerina-extension,
# so `rush build` and `rush build --to ballerina` are equivalent.
# Requires Java 21 + packageUser / packagePAT for the LS. Skips ./gradlew test/check.
rush build

# Skip the LS entirely — build only the TS chain up to the visualizer
rush build --to @wso2/ballerina-visualizer

# Only the LS (Gradle)
rush build --to ballerina-language-server
# or directly:
cd packages/ballerina-language-server && ./gradlew build pack -x test -x check

# Watch mode for the extension itself (webpack --watch)
cd packages/ballerina-extension && pnpm run watch-ballerina

# Run only the diagram snapshot tests
rush build --to @wso2/bi-diagram
cd packages/bi-diagram && pnpm test

# Update lockfile after editing a package.json
rush update

# Clean up
rush purge   # nuke node_modules + .rush dirs
```

After a successful `rush build --to ballerina` you'll find `ballerina-X.Y.Z.vsix`
at `packages/ballerina-extension/ballerina-*.vsix`.

## Running and debugging the extension

Open the repo in VS Code and press **F5**. The root `.vscode/launch.json` provides:

| Configuration | Use case |
|---|---|
| **Ballerina Extension** | Primary: extension host + `watch-ballerina` |
| **Ballerina Extension (no watch)** | Faster launch if you've already built |
| **Ballerina Extension Tests** | Mocha tests in extension host |
| **Ballerina Extension AI Tests** | AI test fixtures |
| **Debug Ballerina UI Tests** | vscode-extension-tester (Selenium-style) |
| **Attach to Ballerina Language Server** | Java debugger attach on port 5005 |

To debug the language server: run the **`build:ballerina-language-server (with debug agent)`**
task (Cmd+Shift+P → "Tasks: Run Task") and then launch **Attach to Ballerina Language Server**.

## Working with the language server jar

The extension reads its LS jar from `packages/ballerina-extension/ls/*.jar`. By default
the `postbuild` step calls `provisionLS`, which:

1. If a local pack jar exists at `packages/ballerina-language-server/build/ballerina-language-server-*.jar`,
   copies it into `ls/`.
2. Otherwise, falls back to `scripts/download-ls.js` and downloads the latest GitHub
   release jar (`v1.6.0` at time of writing).

Override knobs:

```bash
# Force-download even if a local pack jar exists
BALLERINA_LS_SOURCE=download rush build --to ballerina

# Pin a specific release tag
BALLERINA_LS_TAG=v1.6.0 rush build --to ballerina

# Pick a specific local jar manually (delete what's in build/, then build again)
rm packages/ballerina-language-server/build/ballerina-language-server-*.jar
cd packages/ballerina-language-server && ./gradlew pack -x test
```

## Working with the TextMate grammar

The grammar source lives at `packages/ballerina-grammar/`. During the extension build,
the `copyGrammar` script copies just `syntaxes/` into
`packages/ballerina-extension/grammar/ballerina-grammar/syntaxes/` (gitignored). Edit
the canonical source, then re-build the extension.

## Working with the common-libs submodule

`submodules/wso2-vscode-extensions/` is the `wso2/vscode-extensions` repo pinned to
the `release/ballerina-5.12.x` branch. Rush treats four of its packages as workspace
projects (`@wso2/font-wso2-vscode`, `@wso2/ui-toolkit`, `@wso2/playwright-vscode-tester`,
`@wso2/copilot-utilities`) plus `@wso2/wso2-platform-core`.

```bash
# Update the submodule to the latest commit on the pinned branch
git submodule update --remote submodules/wso2-vscode-extensions
git add submodules/wso2-vscode-extensions
git commit -m "Bump common-libs submodule"

# Test a local change in a common-lib
cd submodules/wso2-vscode-extensions/workspaces/common-libs/ui-toolkit
# edit files
cd -
rush build --to ballerina   # rush picks up the change via workspace:* linking
```

Local edits in the submodule are committed against the submodule's branch, not the
monorepo. If you want them to land here, push them upstream to
`wso2/vscode-extensions` first, then bump the submodule pointer.

## Branching and release

- `main` — active development
- `stable/ballerina*` — release branches
- `migrate/*` — long-lived migration work

PR → `main` triggers `pull-request.yml` (extension build + tests, LS build if you
touched LS code). PR → `stable/ballerina` adds the bal E2E suite automatically.

Release process is documented at `.github/workflows/README.md`:
1. **release-vsix** workflow (manual dispatch) — builds, creates GitHub release, opens
   version-bump PR back to `stable/ballerina`.
2. **publish-vsix** workflow (manual dispatch) — takes the workflow run ID of the
   release build and publishes the VSIX to VSCode Marketplace + OpenVSX.

## Commit / PR conventions

- Keep commits scoped to a single concern. Don't mix submodule updates with feature work.
- Prefer descriptive messages over template-driven ones. A PR description that explains
  *why* is far more valuable than ten one-line conventional commits.
- Add labels on PRs to opt into heavier CI:
    - `Checks/Run Ballerina UI Tests` — runs the bal E2E suite on the PR
    - `Runner/AWS` — runs CI on the AWS CodeBuild runner pool

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Username must not be null!` in Gradle | Missing GitHub Packages auth | Set `packageUser`/`packagePAT` in `~/.gradle/gradle.properties` |
| `Cannot connect to the Docker daemon` during LS build | persist-service integration tests | Skip with `-x test` (already default in rush build) |
| `Dependency resolution is looking for ... JVM 17, but ... 21 or newer` | `JAVA_HOME` points at JDK 17 | `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` |
| `tracked input file` rush error | Stale `lib/`/`build/` dir in a package | Run `rush purge && rush update` and rebuild |
| `Cannot find module '@wso2/...'` after pulling | Submodule out of date / lockfile changed | `git submodule update --init --recursive && rush update` |
| LS jar in vsix is wrong version | `provisionLS` chose downloaded over local (or vice versa) | See "Working with the language server jar" above |
| `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` | Missing rush project registration or submodule not initialized | Check `rush.json`; verify `submodules/wso2-vscode-extensions/` is populated |

## Where to read next

- `AGENTS.md` — guidance for AI coding agents working in this repo
- `.github/workflows/README.md` — what each CI workflow does, and required secrets
- `packages/ballerina-language-server/README.md` — language server architecture
- Upstream Rush documentation: <https://rushjs.io>
