# Performance Memory

- Compare target test elapsed time and peak memory against the recorded `feat14` baseline for the same command.
- Use JFR only for unexplained performance or memory regressions.
- Latest comparable `TestWorkspaceManager` result: target 25.49s / 103022592-byte RSS, `feat14` no-cache baseline 28.73s / 106774528-byte RSS.
- Latest full `langserver-core` result: target 255.08s / 104988672-byte RSS, `feat14` baseline 436.40s / 115474432-byte RSS.
