# Baseline Memory

- Baseline branch for comparison is `feat14`.
- Check `WORKSPACE_BASELINE.md` before running a baseline command; do not rerun an already recorded command.
- Treat baseline runs with `:langserver-core:test FROM-CACHE` as invalid for timing comparison, even if exit status is 0.
- The exact wildcard filter `org.ballerinalang.langserver.workspace.*` is not suite-size comparable between `feat14` and the target branch: `feat14` currently selects 40 tests, while the target branch selects 545 tests.
