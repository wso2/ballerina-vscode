---
name: skill-creator
description: Use this skill when the user asks to create, define, or save a new skill, custom instruction set, or reusable AI behaviour for the assistant.
---

# Skill Creator

When asked to create a new skill, follow these steps precisely.

## Step 1 — Gather requirements

If the user's request is vague, ask one focused clarifying question before proceeding:
- What specific task or scenario should this skill apply to?
- What rules or guidance should the skill enforce?

If the request is clear enough, skip clarification and proceed.

## Step 2 — Formulate the skill definition

Compose the three parts of the skill:

**Name** (`name`)
- Lowercase, kebab-case: `api-design`, `error-handler`, `test-writer`
- 2–3 words, no spaces or special characters

**Trigger** (`trigger`)
- One or two sentences: *when* to invoke this skill
- Start with: "Use this skill when..."
- Be specific — the agent uses this to decide when to call `invoke_skill`

**Body** (`body`) — optional but recommended for non-trivial skills
- Detailed rules, constraints, examples
- Use markdown headers and bullet lists
- Focus on what the agent should do differently when this skill is active
- Include concrete examples where helpful

## Step 3 — Save the skill

Call `save_skill` immediately with the formulated `name`, `trigger`, and `body`.

Do NOT:
- Announce that you are about to save
- Show the skill definition as a code block before calling the tool
- Ask the user for confirmation before calling the tool — the save dialog handles that

## Example output (internal reference only — do not show to user)

For "create a skill for Ballerina error handling":
- name: `ballerina-error-handler`
- trigger: `Use this skill when implementing error handling in Ballerina services, including error propagation, union-type errors, and error logging patterns.`
- body: rules about using `error` unions, `check` expressions, returning typed errors, `io:println` vs `log:printError`, etc.
