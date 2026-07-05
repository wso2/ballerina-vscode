/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Headless generation launcher. Boots a real (headless) VS Code with the built
 * `ballerina` extension and runs the single-shot generation entry
 * (test/headless/index.ts). This is a sibling of test/runAiTest.ts, but instead
 * of running the mocha eval suites it drives ONE generation against a caller-
 * supplied workspace + instruction file. Used by bin/ballerina-copilot-gen.js
 * so external benchmarks (Ballerina-Bench) can invoke the copilot from a
 * terminal without changing any generation behavior.
 *
 * Inputs are passed via environment (set by the CLI wrapper):
 *   COPILOT_INSTRUCTION_PATH  (required) instruction/brief file
 *   COPILOT_WORKSPACE_PATH    (required) Ballerina project to edit
 *   ANTHROPIC_API_KEY         (required for BYOK auth)
 *   VSCODE_VERSION            (optional) pin the VS Code build to download/use
 */

import * as path from "path";
import * as cp from "child_process";
import * as fs from "fs";
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from "@vscode/test-electron";

const packageJson = require("../../package.json");

async function main(): Promise<void> {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    // out/test/headless (compiled from test/headless/index.ts)
    const extensionTestsPath = path.resolve(__dirname, "headless");

    const instructionPath = process.env.COPILOT_INSTRUCTION_PATH;
    const workspacePath = process.env.COPILOT_WORKSPACE_PATH;

    if (!instructionPath || !fs.existsSync(instructionPath)) {
        throw new Error(`COPILOT_INSTRUCTION_PATH not set or missing: ${instructionPath}`);
    }
    if (!workspacePath || !fs.existsSync(workspacePath)) {
        throw new Error(`COPILOT_WORKSPACE_PATH not set or missing: ${workspacePath}`);
    }
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === "") {
        throw new Error("ANTHROPIC_API_KEY is not set — required for BYOK authentication");
    }

    // Optional fixed dirs (set by the container image for reproducible, offline runs).
    // On a dev host these are unset and @vscode/test-electron uses its defaults.
    const version = process.env.VSCODE_VERSION || undefined;
    const cachePath = process.env.COPILOT_VSCODE_CACHE || undefined;
    const userDataDir = process.env.COPILOT_USER_DATA_DIR || undefined;
    const extensionsDir = process.env.COPILOT_EXTENSIONS_DIR || undefined;

    // Pre-baked in the container image; downloads on a dev host (cache hit thereafter).
    // Branch so each call matches a concrete downloadAndUnzipVSCode overload
    // (object options vs. positional version) rather than a union of both.
    let vscodeExecutablePath: string;
    if (cachePath) {
        const opts: { cachePath: string; version?: string } = { cachePath };
        if (version) {
            opts.version = version;
        }
        vscodeExecutablePath = await downloadAndUnzipVSCode(opts);
    } else {
        vscodeExecutablePath = await downloadAndUnzipVSCode(version);
    }
    const [cli, ...args] = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    const extDirArgs = extensionsDir ? ["--extensions-dir", extensionsDir] : [];
    // VS Code refuses to run as root (containers run as root) without --no-sandbox,
    // and needs an explicit --user-data-dir in that case.
    const rootArgs = ["--no-sandbox", ...(userDataDir ? ["--user-data-dir", userDataDir] : [])];

    // The extension declares `wso2.hurl-client` as an extension dependency; install it
    // (idempotent — a no-op if already present, e.g. pre-baked in the image). If the
    // image pre-baked it into a fixed extensions-dir, this is offline & instant.
    if (packageJson.extensionDependencies && packageJson.extensionDependencies.length > 0) {
        for (const extensionId of packageJson.extensionDependencies) {
            // shell:true is required — a direct spawn of the `code` CLI script for
            // --install-extension fails with EACCES under the container, while a
            // shell invocation of the identical command works. Paths are space-free.
            cp.spawnSync(cli, [...args, ...rootArgs, ...extDirArgs, "--install-extension", extensionId], {
                encoding: "utf-8",
                stdio: "inherit",
                shell: true
            });
        }
    }

    await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath,
        // Open the target project as the workspace folder so the extension activates
        // on it and the LS roots there. Disable workspace-trust so nothing blocks
        // waiting for an interactive "trust" decision in headless mode.
        launchArgs: [
            workspacePath,
            "--no-sandbox",
            "--disable-workspace-trust",
            ...(userDataDir ? ["--user-data-dir", userDataDir] : []),
            ...extDirArgs
        ],
        extensionTestsEnv: {
            ...process.env,
            AI_TEST_ENV: "true",
            COPILOT_INSTRUCTION_PATH: instructionPath,
            COPILOT_WORKSPACE_PATH: workspacePath,
            LS_EXTENSIONS_PATH: "",
            LSDEBUG: "false",
            WEB_VIEW_WATCH_MODE: "false"
        }
    });

    console.log("✅ Headless copilot generation completed");
}

main().catch((err) => {
    console.error("❌ Headless copilot generation failed:", err);
    process.exit(1);
});
