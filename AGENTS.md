# Agent guide

For AI coding agents (Claude Code, Cursor, Aider, etc.) operating in this repo.
This file captures the things that aren't obvious from reading the code and that
agents repeatedly get wrong on their first try.

Human contributors should read `CONTRIBUTING.md` first. This document assumes that
context.

## Project shape in one paragraph

`ballerina-vscode` is a **rush.js monorepo** combining the Ballerina VS Code
extension (`packages/ballerina-extension`), its Gradle-built Java language server
(`packages/ballerina-language-server`), the TextMate grammar
(`packages/ballerina-grammar`), and ~20 supporting webview / diagram TypeScript
packages also under `packages/`. Shared `@wso2/*` libraries are consumed via a
**git submodule** at `submodules/wso2-vscode-extensions/` pinned to the
`release/ballerina-5.12.x` branch. Rush treats both `packages/*` and a handful
of common-libs inside the submodule as workspace projects.

## Rules of engagement

### 1. Use rush. Don't run `npm install` or `pnpm install` directly.

`rush update` is the only way to install dependencies. Running pnpm or npm
directly will diverge from `common/config/rush/pnpm-lock.yaml` and produce
ambiguous failures the next time someone runs rush.

### 2. The full build needs LS prerequisites.

```bash
rush build                                       # everything (equivalent to --to ballerina)
rush build --to ballerina-language-server        # LS only
rush build --to @wso2/ballerina-visualizer       # one package + its deps (skips LS + extension)
```

All 27 projects in `rush.json` are reachable from `ballerina-extension`, so
`rush build` and `rush build --to ballerina` build the same set. Either form
requires:

- Java 21 on `JAVA_HOME`
- `packageUser`/`packagePAT` in `~/.gradle/gradle.properties` (or the env)

If you don't have those set up, skip the LS by building one of its dependents
directly, e.g. `rush build --to @wso2/ballerina-visualizer` — that skips
both `ballerina-extension` and the LS.

### 3. Use the existing TypeScript / build infrastructure; don't invent new tooling.

The repo has settled conventions:
- All packages build with TypeScript (`tsc`) into `lib/`, or webpack into `dist/`/`build/`.
- The extension uses webpack with the config at `packages/ballerina-extension/webpack.config.js`.
- VSIX packaging uses `vsce` via `submodules/.../common-libs/scripts/package-vsix.js`.
- Project graph and topological order are managed entirely by `rush.json` + workspace `:*` refs.

Don't add a new task runner, alternative bundler, or per-package install
scripts. If you think you need one, raise it first.

### 4. Don't edit `lib/`, `build/`, `dist/`, `out/`, or `packages/ballerina-extension/grammar/ballerina-grammar/`.

These are generated artifacts. They're gitignored or they live in a copy that
`copyGrammar` overwrites on every build. Edit the source under `src/` or the
canonical package (`packages/ballerina-grammar/syntaxes/` for grammars).

### 5. Don't push past hook failures.

Pre-commit hooks (eslint, format) sometimes fail on legitimate, unrelated lint
debt. Fix the lint issue or scope your change away from it. Never use
`--no-verify`.

### 6. Submodule changes are not monorepo changes.

If you edit something under `submodules/wso2-vscode-extensions/`, that's a
change to a **separate git repo**. The monorepo only tracks the submodule's
commit SHA. So:

- Local edits there will not be picked up by anyone else until you push them
  upstream to `wso2/vscode-extensions` and update the submodule pointer here.
- Don't commit submodule edits in a single combined commit with monorepo
  changes; the diff will be confusing.
- Prefer fixing things in the consumer (the ballerina packages) over editing
  the submodule, unless the change really belongs in the shared library.

## Common task recipes

### "Build and verify the extension"

```bash
rush update           # only if package.json / lockfile changed
rush build --to ballerina
# Result: packages/ballerina-extension/ballerina-X.Y.Z.vsix
```

### "Run the extension in a debugger"

Open the repo in VS Code, press F5. The default config is "Ballerina Extension".
Don't try to wire up your own launch config; the root `.vscode/launch.json`
already covers extension + tests + LS attach.

### "Reproduce a CI failure locally"

The PR workflow (`.github/workflows/pull-request.yml`) calls `.github/workflows/build.yml`
which delegates to the composite action at `.github/actions/build/action.yml`.
That action ultimately does:

```bash
node common/scripts/install-run-rush.js build --to ballerina --verbose
```

Running that exact command locally is the closest reproduction.

### "Change the LS jar shipped in the vsix"

`packages/ballerina-extension/scripts/copy-ls.js` decides which jar lands in
`ls/`. Read it before changing anything LS-related. Override knobs:

- `BALLERINA_LS_SOURCE=download` — always download from GH releases
- `BALLERINA_LS_TAG=<tag>` — pin a specific release
- *(default)* — prefer the local pack output, fall back to download

### "Add a dependency to a package"

1. Edit the package's `package.json`.
2. For cross-package deps, use the `workspace:*` protocol (e.g.
   `"@wso2/ballerina-core": "workspace:*"`).
3. Run `rush update`.
4. Commit `package.json` AND `common/config/rush/pnpm-lock.yaml`.

### "Add a new package under packages/"

1. Create the dir with a `package.json` (name + version + scripts).
2. Register it in `rush.json` under `projects[]`.
3. Run `rush update`.

## Things that look broken but aren't

| Observation | Reality |
|---|---|
| `Cannot connect to the Docker daemon` during LS build | Persist-service integration tests want Docker. We `-x test` by default. The actual blocker is usually GitHub Packages auth, shown above this line. Read carefully. |
| `unmet peer eslint`/`react` warnings on `rush update` | Same as in source repo. The pnpm overrides keep transitive deps pinned; the peer warnings are loud but inert. |
| `Icon not found in wso2-vscode font: delete` warning during font build | Pre-existing in source repo. The font registry doesn't have a `delete` glyph yet. Not a regression. |
| 263 files in vsix, including 185 JS files | `vsce package` warns about not bundling; we already use webpack, but resources (jslibs, fonts, grammar, codicons) are deliberately unbundled. Ignore the warning. |
| Per-package `.vscode/launch.json` exists alongside root | Both are valid. The root one is what you usually want. Per-package configs use `${workspaceFolder}` relative to that package and are scoped for working *inside* a single package's window. |

## Files that contain the truth

When in doubt about behavior, read these instead of guessing:

| Question | File |
|---|---|
| What gets built when? | `rush.json` + each package's `package.json` `scripts` block |
| What's in the vsix? | `packages/ballerina-extension/.vscodeignore` + `vsce` output |
| Why is this script doing X? | `packages/ballerina-extension/scripts/*.js` — small, readable |
| Why is CI doing X? | `.github/workflows/*.yml` + `.github/actions/*/action.yml` + `.github/workflows/README.md` |
| What version of pnpm/node/rush? | `rush.json` (top), `common/config/rush/pnpm-config.json` |
| What changed recently? | `git log --oneline -30` — commit messages here are descriptive |

## Migration history (for context)

This monorepo was assembled in 2026-05 by extracting:

- 20 ballerina packages from `wso2/vscode-extensions/workspaces/ballerina/` (via `git-filter-repo`, history preserved)
- The grammar from `ballerina-platform/ballerina-grammar` (history preserved)
- The language server from `ballerina-platform/ballerina-language-server` (history preserved)

Common-libs were intentionally kept in the source repo and pulled in via
submodule rather than re-extracted, to avoid forking infrastructure shared
across multiple WSO2 extensions.

If you find references to old paths (`workspaces/ballerina/...`) anywhere,
they're either:
- Inside the submodule (correct — it's the old layout there).
- A bug we missed in migration; fix it.

## When you're unsure

Read `CONTRIBUTING.md`, `.github/workflows/README.md`, then `git log --oneline -50`
to see how the most recent changes were structured. Ask for clarification rather
than guessing on these:

- Submodule branch / SHA changes
- Rush plugin / build-cache configuration
- VSIX packaging and marketplace publishing (irreversible once pushed)
- Anything that involves credentials
