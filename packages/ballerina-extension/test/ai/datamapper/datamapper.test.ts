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
import { generateBallerinaCode } from '../../../src/rpc-managers/ai-panel/utils';
import * as assert from 'assert';
import * as fs from 'fs';

const RESOURCES_PATH = path.resolve(__dirname, '../../../../test/ai/datamapper/resources');

function getTestFolders(dirPath: string): string[] {
    return fs.readdirSync(dirPath)
        .filter((file) => fs.lstatSync(path.join(dirPath, file)).isDirectory());
}

suite.only("AI Datamapper Tests Suite", () => {
    setup(done => {
        done();
    });

    function runTests(basePath: string) {
        const testFolders = getTestFolders(basePath);

        testFolders.forEach((folder) => {
            const folderPath = path.join(basePath, folder);

            suite(`Group: ${folder}`, () => {
                const subFolders = getTestFolders(folderPath);

                if (subFolders.length > 0) {
                    // Recursively process subdirectories
                    runTests(folderPath);
                } else {
                    test(`Datamapper Test - ${folder}`, async () => {
                        const mappingFile = path.join(folderPath, 'mapping.json');
                        const paramDefFile = path.join(folderPath, 'param_def.json');
                        const expectedFile = path.join(folderPath, 'expected.json');

                        assert.ok(fs.existsSync(mappingFile), `Missing mapping.json in ${folder}`);
                        assert.ok(fs.existsSync(paramDefFile), `Missing param_def.json in ${folder}`);
                        assert.ok(fs.existsSync(expectedFile), `Missing expected.json in ${folder}`);

                        const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
                        const paramDef = JSON.parse(fs.readFileSync(paramDefFile, 'utf8'));
                        const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
                        const resp = await generateBallerinaCode(mapping, paramDef, "", []);
                        assert.deepStrictEqual(resp, expected);            
                    });
                }
            });
        });
    }
    runTests(RESOURCES_PATH);
});
