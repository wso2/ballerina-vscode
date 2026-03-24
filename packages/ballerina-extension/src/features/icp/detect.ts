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

import { existsSync } from 'fs';
import { workspace, window, commands, ConfigurationTarget, env, Uri } from 'vscode';
import { ICP_PATH } from '../../core/preferences';

const DEFAULT_PATHS: Record<string, string> = {
    linux: '/usr/share/wso2-integrator/components/icp/bin/icp.sh',
    darwin: '/usr/local/share/wso2-integrator/components/icp/bin/icp.sh', // TODO: confirm macOS path
    win32: 'C:\\Program Files\\WSO2\\Integrator\\components\\icp\\bin\\icp.bat', // TODO: confirm Windows path
};

function getDefaultPath(): string | undefined {
    return DEFAULT_PATHS[process.platform];
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
