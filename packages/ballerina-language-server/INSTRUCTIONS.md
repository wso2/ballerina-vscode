# INSTRUCTIONS.md

You are the orchestrator for fixing the workspace implementation under:

`langserver-core/src/main/java/org/ballerinalang/langserver/workspace`

## Goal

Iterate the implementation until the relevant tests pass without regressing execution time or memory compared to:

`/Users/wso2/projects/ballerina/ballerina-language-server/feat14`

## Shared State

Use markdown files as lightweight shared state. Keep them short and current:

* one file for the current plan and test order
* `WORKSPACE_BASELINE.md` for baseline results from `feat14`
* one file for findings and decisions
* `MEMORY.md` as a short durable-memory index
* focused topic files under `memory/` for reusable lessons

Before assigning work, check the markdown state, memory index, and existing test results to avoid duplicate work.

## Orchestration Model

Use a supervisor / worker model.

The orchestrator owns the plan, state, task boundaries, durable memory, scope expansion, acceptance decisions, and final completion decision.

For every work-loop iteration, spawn a dedicated work-loop worker using `WORKER_INSTRUCTIONS.md`.

Pass the worker:

* selected scope
* current plan and test-order file
* findings and decisions file
* `WORKSPACE_BASELINE.md`
* relevant `MEMORY.md` and `memory/` topic files, if already known
* failing test, affected module, or next pending item from `module_tasks.md`
* expected output format

The worker must execute the selected loop scope end-to-end, spawn focused agents as required, and return evidence. The orchestrator reviews the result and decides whether to accept the fix, request another loop, expand scope, or stop.

## Worker Result Contract

Require the worker to return:

* selected scope
* agents spawned
* files inspected
* architecture docs consulted
* old implementation comparison, if used
* changes made
* tests run
* baseline status
* execution-time and memory observations
* candidate memory lessons
* remaining failures
* recommended next scope

## Self-Improving Memory

Use `MEMORY.md` or `memory/` as the orchestrator’s self-improving memory.

The orchestrator owns durable memory. Workers and subagents may read relevant memory and record observations, evidence, and candidate reusable lessons in the findings file, but they must not write directly to `MEMORY.md` or `memory/` unless explicitly assigned a memory-curation task.

Treat `MEMORY.md` as a short index, not a log dump. Store durable lessons in focused topic files under `memory/`.

After each worker result, review candidate lessons from the findings file and promote only lessons that are verified, reusable, concise, and likely to affect future decisions.

Do not store raw test output, stale guesses, temporary hypotheses, or one-off observations in durable memory.

## Loop Control

Repeat until the work is complete:

1. Review `module_tasks.md`, the current plan, findings, baseline status, and relevant memory.
2. Select the smallest pending or failing scope.
3. Spawn a dedicated work-loop worker using `WORKER_INSTRUCTIONS.md`.
4. Review the worker result and evidence.
5. Promote only verified durable lessons into memory.
6. Accept the result only if tests, baseline expectations, architecture guidance, and performance constraints are satisfied.
7. Expand scope only when the current scope is clean.
8. At the end of each processed loop, execute `/compact`, then load `INSTRUCTIONS.md` again before starting the next loop.

## Guardrails

* Always execute each work-loop iteration through a dedicated work-loop worker.
* Do not accept a worker result without concrete evidence for the selected scope.
* Do not accept a fix that only passes tests but causes unexplained execution-time or memory regression.
* Accept workspace behavior changes only after the worker confirms the relevant architecture docs were checked.
* Treat `feat14` as historical evidence, not as the source of truth when making acceptance decisions.
* Promote only verified, reusable, concise lessons into durable memory.
* Do not let `MEMORY.md` become large; move details into topic files and keep the index concise.
* Create commits only in the local repository.
* Do not push commits to `origin`, `upstream`, or any remote.
* Do not modify `origin` or `upstream`.

## Done

Repeat until every item in `module_tasks.md` is complete, the relevant class-level and module-level tests pass, each target command has a recorded `feat14` baseline, and execution time and memory remain comparable to the baseline.
