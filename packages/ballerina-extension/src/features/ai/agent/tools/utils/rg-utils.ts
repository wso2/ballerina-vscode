// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { rgPath as builtinRgPath } from "@vscode/ripgrep";

// Prefers bundled @vscode/ripgrep; falls back to system `rg`
export function getRgExecutable(): string {
    if (fs.existsSync(builtinRgPath)) {
        return builtinRgPath;
    }
    const whichCmd = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(whichCmd, ["rg"], { encoding: "utf-8" });
    if (result.status === 0 && result.stdout?.trim()) {
        return result.stdout.trim();
    }
    throw new Error("ripgrep binary not found. Install `@vscode/ripgrep` or ensure `rg` is on PATH.");
}

export interface ProjectRoots {
    normalizedRawRoot: string;
}

export function resolveProjectRoots(tempProjectPath: string): ProjectRoots {
    return {
        normalizedRawRoot: tempProjectPath.endsWith(path.sep) ? tempProjectPath : tempProjectPath + path.sep,
    };
}

// resolvedPath is safe to pass to ripgrep
export type PathValidationResult = { ok: true; resolvedPath: string } | { ok: false; message: string; error: string };

// Resolves and validates searchPath; requireDirectory also checks it is a directory
export function validateSearchPath(
    tempProjectPath: string,
    searchPath: string | undefined,
    options?: { requireDirectory?: boolean },
): PathValidationResult {
    const resolvedPath = searchPath ? path.resolve(tempProjectPath, searchPath) : tempProjectPath;

    const normalizedRoot = tempProjectPath.endsWith(path.sep) ? tempProjectPath : tempProjectPath + path.sep;
    if (resolvedPath !== tempProjectPath && !resolvedPath.startsWith(normalizedRoot)) {
        return { ok: false, message: `Path escapes project root: ${searchPath}`, error: "Error: Path traversal" };
    }

    if (!fs.existsSync(resolvedPath)) {
        return { ok: false, message: `Search path not found: ${searchPath || "."}`, error: "Error: Path not found" };
    }

    if (options?.requireDirectory) {
        let isDir: boolean;
        try {
            isDir = fs.statSync(resolvedPath).isDirectory();
        } catch (e) {
            return {
                ok: false,
                message: `Path is not a directory: ${searchPath || "."}`,
                error: `Error: ${(e as Error).message}`,
            };
        }
        if (!isDir) {
            return {
                ok: false,
                message: `Path is not a directory: ${searchPath || "."}`,
                error: "Error: Not a directory",
            };
        }
    }

    return { ok: true, resolvedPath };
}

// Strips the absolute project root prefix from a ripgrep output
export function stripRootPrefix(line: string, rootPrefix: string, tempProjectPath: string): string {
    if (line.startsWith(rootPrefix)) {
        return line.slice(rootPrefix.length);
    }
    if (line.startsWith(tempProjectPath + ":")) {
        return line.slice(tempProjectPath.length + 1);
    }
    return line;
}