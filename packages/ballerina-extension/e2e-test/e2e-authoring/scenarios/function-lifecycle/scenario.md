# Function Lifecycle Automation Scenario

E2E test validating function parameter management, body logic, and type-mismatch diagnostics in Ballerina Integrator.

## Goal

Create a function with two parameters and a matching return type, add a return body using the first parameter, then change the first parameter's type without updating the return type — verifying that the diagram correctly highlights the return node as an error.

## Steps

| Step | File | Action |
|------|------|---------|
| 01 | 01_project.step.js | Create test project |
| 02 | 02_function.step.js | Create Function artifact `calculateSum` (no params, no return type) |
| 03 | 03_add_parameters.step.js | Edit function → Add `firstName: string`, `lastName: string`, set Return Type = `string` → Save |
| 04 | 04_edit_delete_parameters.step.js | Add body → Return node with expression `firstName` |
| 05 | 05_add_body.step.js | Edit function → Change `firstName` type to `int`, delete `lastName` → Save (leave Return Type as `string`) |
| 06 | 06_delete_function.step.js | Verify return node shows error (type mismatch: return type `string` vs `firstName: int`) |
| 07 | 07_delete_function.step.js | Delete function artifact from activity panel |

## Type Mismatch Trigger

After step 05: `firstName` is `int` but `return firstName` expects `string` (return type unchanged).
The diagram must show `.return-comp-error` on the Return node.

## Selector Policy

- Use `data-testid`, roles, and stable accessible text only.
- `.return-comp-error` is a stable SCSS class (not Emotion) — acceptable for diagnostic assertion.
- Do not use Emotion or generated class selectors.
