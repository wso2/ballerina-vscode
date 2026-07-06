<One-line summary: what the user does in the Type Editor and what should result.>

<Short paragraph: the flow in plain words — open the Type Editor, click "Add Type",
... , and what is verified at the end (diagram node + generated types.bal).>

## Steps

| # | Action | Verification |
|---|--------|-------------|
| 1 | Create project and navigate to Type Editor | Type Editor canvas with "Add Type" button visible |
| 2 | <user action> | <what should be visible> |
| 3 | Verify diagram node and source | `data-testid="type-node-<Name>"` present; types.bal contains `<Name>` |

## Gaps

- <Known selector quirks, missing data-testids, or UI behaviors discovered while authoring.>
