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

import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import { workspace, window, commands, ConfigurationTarget, env, Uri } from 'vscode';
import { ICP_PATH } from '../../core/preferences';

const ICP_BIN_RELATIVE = 'components/icp/bin';
const ICP_SCRIPT_UNIX = 'icp.sh';
const ICP_SCRIPT_WIN = 'icp.bat';

/**
 * Default base directories where WSO2 Integrator is installed per OS.
 * The integrator directory name may include a version suffix (e.g., wso2-integrator-1.0.0),
 * so we search within these base directories for a matching folder.
 */
const BASE_DIRS: Record<string, string[]> = {
    linux: ['/usr/share'],
    darwin: [path.join(homedir(), 'Applications')],
    win32: [
        path.join(process.env.APPDATA || '', 'WSO2', 'Integrator'),
        path.join(process.env.LOCALAPPDATA || '', 'WSO2', 'Integrator'),
        path.join(process.env.PROGRAMFILES || '', 'WSO2', 'Integrator'),
    ],
};

function getDefaultPath(): string | undefined {
    const script = process.platform === 'win32' ? ICP_SCRIPT_WIN : ICP_SCRIPT_UNIX;
    const baseDirs = BASE_DIRS[process.platform];
    if (!baseDirs) {
        return undefined;
    }

    for (const baseDir of baseDirs) {
        if (!existsSync(baseDir)) {
            continue;
        }

        // Direct check: baseDir/components/icp/bin/icp.sh
        const directPath = path.join(baseDir, ICP_BIN_RELATIVE, script);
        if (existsSync(directPath)) {
            return directPath;
        }

        // Search for matching directories within baseDir
        try {
            const entries = readdirSync(baseDir);
            for (const entry of entries) {
                // Match wso2-integrator* directories (Linux/Windows)
                if (entry.startsWith('wso2-integrator')) {
                    const candidatePath = path.join(baseDir, entry, ICP_BIN_RELATIVE, script);
                    if (existsSync(candidatePath)) {
                        return candidatePath;
                    }
                }

                // Match WSO2 Integrator*.app bundles (macOS)
                if (entry.startsWith('WSO2 Integrator') && entry.endsWith('.app')) {
                    const candidatePath = path.join(baseDir, entry, 'Contents', ICP_BIN_RELATIVE, script);
                    if (existsSync(candidatePath)) {
                        return candidatePath;
                    }
                }
            }
        } catch {
            // Permission denied or other error, skip this base dir
        }
    }

    return undefined;
}

/**
 * Resolves the ICP executable path.
 * 1. Checks the `ballerina.icpPath` setting
 * 2. Falls back to OS-specific default locations
 * 3. If auto-detected, persists the path to settings
 * 4. If not found, notifies the user
 *
 * @returns The resolved ICP path, or `undefined` if not found.
 */
export async function resolveICPPath(): Promise<string | undefined> {
    const config = workspace.getConfiguration('ballerina');
    const configuredPath = config.get<string>('icpPath');

    // 1. Check if path is already configured
    if (configuredPath) {
        if (existsSync(configuredPath)) {
            return configuredPath;
        }
        window.showErrorMessage(
            `ICP binary not found at configured path: ${configuredPath}. Please update the "ballerina.icpPath" setting.`,
            'Open Settings'
        ).then((action) => {
            if (action === 'Open Settings') {
                openICPSettings();
            }
        });
        return undefined;
    }

    // 2. Auto-detect from default OS location
    const defaultPath = getDefaultPath();
    if (defaultPath && existsSync(defaultPath)) {
        await config.update('icpPath', defaultPath, ConfigurationTarget.Global);
        return defaultPath;
    }

    // 3. Not found — notify user
    window.showErrorMessage(
        'Integration Control Plane (ICP) is not installed. Please install ICP or set the path manually in settings.',
        'Download ICP',
        'Set Path'
    ).then((action) => {
        if (action === 'Download ICP') {
            env.openExternal(Uri.parse('https://wso2.com/integrator/downloads/')); // TODO: confirm download URL
        } else if (action === 'Set Path') {
            openICPSettings();
        }
    });
    return undefined;
}

function openICPSettings(): void {
    commands.executeCommand('workbench.action.openSettings', ICP_PATH);
}
