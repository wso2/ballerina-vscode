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

import * as path from 'path';
import * as cp from 'child_process';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
const dotenv = require('dotenv');
const packageJson = require('../../package.json');
const { createEnvDefinePlugin } = require('../../../../../common/scripts/env-webpack-helper');

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './ai/integration_tests/libs');

        // Load environment variables
        const envPath = path.resolve(__dirname, '../../.env');
        const env = dotenv.config({ path: envPath }).parsed;
        console.log("Fetching values for environment variables...");
        const { envKeys, missingVars } = createEnvDefinePlugin(env);

        if (missingVars.length > 0) {
            console.warn(
                '\n⚠️  Environment Variable Configuration Warning:\n' +
                `Missing required environment variables: ${missingVars.join(', ')}\n` +
                `Please provide values in either .env file or runtime environment.\n`
            );
        }

        // Download VS Code and get CLI path
        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        const [cli, ...args] = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

        // Install extension dependencies if they exist
        if (packageJson.extensionDependencies && packageJson.extensionDependencies.length > 0) {
            console.log(`Installing ${packageJson.extensionDependencies.length} extension dependencies...`);
            for (const extensionId of packageJson.extensionDependencies) {
                console.log(`Installing extension: ${extensionId}`);
                cp.spawnSync(cli, [...args, '--install-extension', extensionId], {
                    encoding: 'utf-8',
                    stdio: 'inherit',
                });
            }
            console.log('Extension dependencies installed successfully');
        } else {
            console.log('No extension dependencies to install');
        }

        console.log('\n🧪 Running Library Integration Tests...\n');

        // Run tests
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                path.resolve(__dirname, '../../test/data/bi_empty_project')
            ],
            extensionTestsEnv: {
                ...envKeys,
                AI_TEST_ENV: 'true',
                LIBS_INTEGRATION_TEST: 'true',
                LS_EXTENSIONS_PATH: '',
                LSDEBUG: 'false',
                WEB_VIEW_WATCH_MODE: 'false'
            }
        });

        console.log('\n✅ Library integration tests completed successfully!\n');

    } catch (err) {
        console.error('\n❌ Library integration tests failed:', err);
        process.exit(1);
    }
}

main();
