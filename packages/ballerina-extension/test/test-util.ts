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

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it

// Ballerina tools distribution will be copied to following location by maven
import { readdirSync, realpathSync } from 'fs';
import { join, sep } from 'path';
const kill = require("kill-port");

const TEST_RESOURCES = join(__dirname, '..', '..', 'extractedDistribution').toString();
const PLATFORM_PREFIX = /jballerina-tools-/;


function findBallerinaDistribution() {
    const directories = readdirSync(TEST_RESOURCES);
    if (directories.length === 1) {
        return directories[0];
    }
    if (directories.length > 1) {
        for (const index in directories) {
            if (directories[index].startsWith('ballerina')) {
                return directories[index];
            }
        }
    }
    throw new Error("Unable to find ballerina distribution in test resources.");
}

export function getBallerinaHome(): string {
    const filePath = TEST_RESOURCES + sep + findBallerinaDistribution();
    return realpathSync(filePath);
}

export function getBallerinaCmd(): string {
    const ballerinaDistribution = TEST_RESOURCES + sep + findBallerinaDistribution();
    const prefix = join(realpathSync(ballerinaDistribution), "bin") + sep;
    return prefix + (isWindows() ? 'bal.bat' : 'bal');
}

export function getBallerinaVersion() {
    return findBallerinaDistribution().replace(PLATFORM_PREFIX, '').replace('\n', '').trim();
}

export function getBBEPath(): any {
    return join(__dirname, '..', 'data');
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function killPort(port: number) {
    if (!isWindows()) {
        (async () => {
            await kill(port);
        })();
    }
}

export function isWindows(): boolean {
    return process.platform === "win32";
}
