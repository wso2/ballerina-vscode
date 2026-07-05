#!/usr/bin/env node
/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License, Version 2.0.
 * See http://www.apache.org/licenses/LICENSE-2.0
 *
 * Headless copilot code-generation CLI for external benchmarks.
 *
 * Usage:
 *   ballerina-copilot-gen <instruction-file> [--workspace <dir>]
 *
 * Positional:
 *   <instruction-file>   Path to the natural-language brief. In Ballerina-Bench
 *                        this is the {instruction_path} substituted by the
 *                        harness (/app/instruction.md).
 * Options:
 *   --workspace <dir>    Ballerina project to edit. Defaults to
 *                        $COPILOT_WORKSPACE_PATH or /app/workspace.
 *
 * Requires ANTHROPIC_API_KEY in the environment (BYOK). Boots a headless VS Code
 * with the built extension and runs exactly one generation; generated code is
 * written back into the workspace. Exit code 0 on success, non-zero on failure.
 */

"use strict";

const path = require("path");
const fs = require("fs");

function usage(msg) {
    if (msg) {
        console.error(`ballerina-copilot-gen: ${msg}`);
    }
    console.error("usage: ballerina-copilot-gen <instruction-file> [--workspace <dir>]");
    process.exit(2);
}

const argv = process.argv.slice(2);
let instructionPath;
let workspacePath = process.env.COPILOT_WORKSPACE_PATH || "/app/workspace";

for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--workspace" || a === "-w") {
        workspacePath = argv[++i];
    } else if (a === "-h" || a === "--help") {
        usage();
    } else if (!instructionPath) {
        instructionPath = a;
    } else {
        usage(`unexpected argument: ${a}`);
    }
}

if (!instructionPath) {
    usage("missing <instruction-file>");
}
instructionPath = path.resolve(instructionPath);
workspacePath = path.resolve(workspacePath);

if (!fs.existsSync(instructionPath)) {
    usage(`instruction file not found: ${instructionPath}`);
}
if (!fs.existsSync(workspacePath)) {
    usage(`workspace directory not found: ${workspacePath}`);
}
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === "") {
    usage("ANTHROPIC_API_KEY is not set (required for BYOK authentication)");
}

// The headless launcher reads these.
process.env.COPILOT_INSTRUCTION_PATH = instructionPath;
process.env.COPILOT_WORKSPACE_PATH = workspacePath;

// runHeadlessGen.ts compiles to out/test/runHeadlessGen.js and self-invokes on require.
const launcher = path.join(__dirname, "..", "out", "test", "runHeadlessGen.js");
if (!fs.existsSync(launcher)) {
    console.error(
        `ballerina-copilot-gen: launcher not found at ${launcher}. ` +
        `Build the extension first (rush build --to ballerina) and run test-compile.`
    );
    process.exit(1);
}

require(launcher);
