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
import { attemptRepairProject } from '../../../src/rpc-managers/ai-panel/repair-utils';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import { StateMachine } from '../../../src/stateMachine';
import { Uri } from 'vscode';
import { Diagnostics } from '@wso2/ballerina-core';

const RESOURCES_PATH = path.resolve(__dirname, '../../../../test/ai/post_proccess/resources');

suite("AI Post processing tests", () => {
    setup(done => {
        done();
    });

    const testFolders = fs.readdirSync(RESOURCES_PATH)
        .filter((file) => fs.lstatSync(path.join(RESOURCES_PATH, file)).isDirectory());

    testFolders.forEach((folder) => {
        test(`AI Tests : ${folder}`, async () => {
            const randomNum = Math.floor(Math.random() * 90000) + 10000;
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `bal-proj-${randomNum}-${folder}`));
            const projectRoot = path.join(RESOURCES_PATH, folder);
            fs.cpSync(projectRoot, tempDir, { recursive: true });

            // Find all .bal files in the tempDir and open them
            const findBallerinaFiles = (dir: string): string[] => {
                let results: string[] = [];
                const files = fs.readdirSync(dir);
                
                files.forEach((file) => {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    
                    if (stat.isDirectory()) {
                        results = results.concat(findBallerinaFiles(filePath));
                    } else if (path.extname(file) === '.bal') {
                        results.push(filePath);
                    }
                });
                
                return results;
            };

            // Convert file path to URI format
            const filePathToUri = (filePath: string): string => {
                return Uri.file(filePath).toString();
            };
            //Copy project
            const langClient = StateMachine.langClient();
            // Find all Ballerina files and open them
            const ballerinaFiles = findBallerinaFiles(tempDir);
            for (const filePath of ballerinaFiles) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const fileUri = filePathToUri(filePath);
                
                langClient.didOpen({
                    textDocument: {
                        uri: fileUri,
                        languageId: 'ballerina',
                        version: 1,
                        text: fileContent
                    }
                });
            }
            const diags : Diagnostics[] = await attemptRepairProject(langClient, tempDir);
            assert.deepStrictEqual(diags, []);
        });
    });
})

