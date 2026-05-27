# Flow Nodes Automation Scenario

Create a comprehensive E2E test that validates Statement, Control, Logging, Concurrency, Type/Mapping, Function, and Connection nodes in a Ballerina Integrator Automation flow.

## Goal

Create a project and Automation artifact, author a complete `automation.bal` flow, and verify the generated source contains every Statement, Control, Logging, Concurrency, Type/Mapping, Function, and Connection construct in the scenario.

## Steps

| Step | Action | Nodes Added |
|------|--------|-------------|
| 01 | Create project | - |
| 02 | Create Automation artifact | - |
| 03 | Add logging + variables | Log Info, Declare Variable (int count), Declare Variable (string msg), Log Debug |
| 04 | Add If/Else condition | If (count > 10), Update Variable, Else, Update Variable |
| 05 | Add Match/Switch | Match (count), Case 1, Case 2, Default |
| 06 | Add more logging | Log Error, Log Warn |
| 07 | Add Foreach loop | Foreach, Update Variable |
| 08 | Add While loop | While, Update Variable |
| 09 | Add Type + Map Data | Create Type artifact, Map Data node |
| 10 | Add Function + Call | Create Function artifact, Call Function node |
| 11 | Add HTTP Connection | HTTP Client connection, Connection Action (GET) |
| 12 | Add Concurrency | Fork, Wait |
| 13 | Add Lock | Lock, Update Variable |
| 14 | Add Return | Return node |
| 15 | Verify source | Check `automation.bal` contains all generated code |

## Selector Policy

- Use `data-testid`, roles, and stable accessible text only.
- Do not use Emotion or generated class selectors.
- Add missing product `data-testid` values before promoting a UI-driven selector.
