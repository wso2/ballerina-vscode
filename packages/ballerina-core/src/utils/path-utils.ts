/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * Normalizes a project/workspace path for comparison and storage.
 *
 * Paths reach the extension from multiple sources that disagree about trailing
 * separators: VS Code (Server) may report workspace folder fsPaths with a
 * trailing slash, while the language server always returns project paths
 * without one. Comparing them with `===` therefore fails intermittently.
 *
 * Strips trailing `/` and `\` separators, but preserves filesystem roots
 * ("/" or "C:\") whose trailing separator is semantically significant.
 * Also lowercases a leading Windows drive letter: VS Code's `Uri.fsPath`
 * reports "c:\..." while other sources (LS, configs) may report "C:\...".
 */
export function normalizeProjectPath(path: string | undefined | null): string {
    if (!path) {
        return "";
    }
    const withNormalizedDrive = path.replace(/^[A-Za-z]:/, (drive) => drive.toLowerCase());
    const trimmed = withNormalizedDrive.replace(/[\\/]+$/, "");
    // "/" would become "" and "C:\" would become the drive-relative "C:"; keep those as-is
    if (trimmed.length === 0 || /^[A-Za-z]:$/.test(trimmed)) {
        return withNormalizedDrive;
    }
    return trimmed;
}

/**
 * Compares two project/workspace paths, ignoring trailing path separators.
 * Use this instead of `===` whenever the two paths may originate from
 * different sources (VS Code APIs, language server responses, RPC params).
 */
export function isSamePath(a: string | undefined | null, b: string | undefined | null): boolean {
    return normalizeProjectPath(a) === normalizeProjectPath(b);
}

/**
 * Checks whether `child` is the same as, or located inside, the `parent` directory.
 * Unlike a bare `child.startsWith(parent)`, this is trailing-slash agnostic and
 * does not match sibling directories sharing a name prefix
 * (e.g. "/ws/project-2/main.bal" is NOT inside "/ws/project").
 */
export function isPathInside(parent: string | undefined | null, child: string | undefined | null): boolean {
    const normalizedParent = normalizeProjectPath(parent);
    if (!normalizedParent || !child) {
        return false;
    }
    if (isSamePath(parent, child)) {
        return true;
    }
    const normalizedChild = normalizeProjectPath(child);
    // Roots ("/" or "c:\") keep their trailing separator after normalization
    if (normalizedParent.endsWith("/") || normalizedParent.endsWith("\\")) {
        return normalizedChild.startsWith(normalizedParent);
    }
    return normalizedChild.startsWith(normalizedParent + "/") || normalizedChild.startsWith(normalizedParent + "\\");
}
