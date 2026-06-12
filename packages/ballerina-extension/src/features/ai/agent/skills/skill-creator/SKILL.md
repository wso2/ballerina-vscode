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

Write the skill to the project's skills directory using the `file_write` tool. The file path
MUST be `.agents/skills/<name>/SKILL.md` (relative to the project root), where `<name>` is the
kebab-case skill name from Step 2.

The file content MUST be the skill's markdown with YAML front matter, in exactly this format:

```
---
name: <name>
description: <trigger>
---

<body>
```

Notes:
- `description` is the trigger sentence(s) from Step 2.
- Omit the body section entirely (just the front matter) only for very simple skills.
- After writing, briefly confirm to the user that the skill was created.

Do NOT:
- Announce that you are about to write before calling the tool — just call `file_write`.
