'use strict';
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

import { exec } from 'child_process';
import { CancellationToken, TestRunRequest, TestMessage, TestRun, TestItem, debug, Uri, WorkspaceFolder, DebugConfiguration, workspace, TestRunProfileKind } from 'vscode';
import { testController } from './activator';
import { StateMachine } from "../../stateMachine";
import { isTestFunctionItem, isTestGroupItem } from './discover';
import { ballerinaExtInstance } from '../../core';
import { constructDebugConfig } from "../debugger";
const fs = require('fs');
import path from 'path';

export async function runHandler(request: TestRunRequest, token: CancellationToken) {
    if (!request.include) {
        return;
    }
    const run = testController.createTestRun(request);

    if (request.profile?.kind == TestRunProfileKind.Debug) {
        const testFuncs: string[] = [];
        request.include.forEach((test) => {
            if (isTestFunctionItem(test)) {
                testFuncs.push(test.label);
            } else if (isTestGroupItem(test)) {
                test.children.forEach((child) => {
                    testFuncs.push(child.label);
                });
            }
        });
        startDebugging(true, testFuncs);
        return;
    }

    // Handle Test Run
    request.include.forEach((test) => {
        if (token.isCancellationRequested) {
            run.skipped(test);
            return;
        }

        run.started(test);

        let command: string;
        const executor = ballerinaExtInstance.getBallerinaCmd();
        if (isTestGroupItem(test)) {
            let testCaseNames: string[] = [];
            let testItems : TestItem[] = [];
            test.children.forEach((child) => {
                const functionName = child.label;
                testCaseNames.push(functionName);
                testItems.push(child);
                run.started(child);
            });

            command = `bal test --tests ${testCaseNames.join(',')} --code-coverage`;

            const startTime = Date.now();
            runCommand(command).then(() => {
                const EndTime = Date.now();
                const timeElapsed = (EndTime - startTime) / testItems.length;

                reportTestResults(run, testItems, timeElapsed).then(() => {
                    endGroup(test, true, run);
                }).catch(() => {
                    endGroup(test, false, run);
                });
            }).catch(() => {
                const EndTime = Date.now();
                const timeElapsed = (EndTime - startTime) / testItems.length;

                reportTestResults(run, testItems, timeElapsed).then(() => {
                    endGroup(test, true, run);
                }).catch(() => {
                    endGroup(test, false, run);
                });
            });
        } else if (isTestFunctionItem(test)) {
            command = `${executor} test --tests ${test.label} --code-coverage`;

            const parentGroup = test.parent;
            let testItems: TestItem[] = [];
            if (parentGroup) {
                parentGroup.children.forEach((child) => {
                    if (isTestFunctionItem(child)) {
                        testItems.push(child);
                    }
                });
            }

            const startTime = Date.now();
            runCommand(command).then(() => {
                const EndTime = Date.now();
                const timeElapsed = (EndTime - startTime) / testItems.length;

                reportTestResults(run, testItems, timeElapsed, true).then(() => {
                    endGroup(test, true, run);
                }).catch(() => {
                    endGroup(test, false, run);
                });
            }).catch(() => {
                const EndTime = Date.now();
                const timeElapsed = (EndTime - startTime) / testItems.length;

                reportTestResults(run, testItems, timeElapsed, true).then(() => {
                    endGroup(test, true, run);
                }).catch(() => {
                    endGroup(test, false, run);
                });
            }).finally(() => { 
                run.end();
            });
        }
    });
}
const TEST_RESULTS_PATH = path.join("target", "report", "test_results.json").toString();

enum TEST_STATUS {
    PASSED = 'PASSED',
    FAILED = 'FAILURE',
    SKIPPED = 'SKIPPED',
}

async function reportTestResults(run: TestRun, testItems: TestItem[], timeElapsed: number, individualTest: boolean = false) {
    const projectRoot = StateMachine.context().projectUri;

    // reading test results
    let testsJson: JSON | undefined = undefined;
    testsJson = await readTestJson(path.join(projectRoot!, TEST_RESULTS_PATH).toString());
    if (!testsJson) {
        for (const test of testItems) {
            const testMessage: TestMessage = new TestMessage("Command failed");
            run.failed(test, testMessage, timeElapsed);
        }
        return;
    }

    const moduleStatus = testsJson["moduleStatus"];

    for (const test of testItems) {
        let found = false;
        for (const status of moduleStatus) {
            const testResults = status["tests"];
            for (const testResult of testResults) {
                if (testResult.name !== test.label && !testResult.name.startsWith(`${test.label}#`)) {
                    continue;
                }

                if (testResult.status === TEST_STATUS.PASSED) {
                    run.passed(test, timeElapsed);
                    found = true;
                } else if (testResult.status === TEST_STATUS.FAILED) {
                    // test failed
                    const testMessage: TestMessage = new TestMessage(testResult.failureMessage);
                    run.failed(test, testMessage, timeElapsed);
                    found = true;
                } else if (testResult.status === TEST_STATUS.SKIPPED) {
                    // test skipped
                    run.skipped(test);
                    found = true;
                }
            }
            if (found) {
                break;
            }
        }
        if (found || individualTest) {
            continue;
        }
        // test failed
        const testMessage: TestMessage = new TestMessage("");
        run.failed(test, testMessage, timeElapsed);
    }
}

/** 
 * Read test json output.
 * @param file File path of the json.
 */
export async function readTestJson(file): Promise<JSON | undefined> {
    try {
        let rawdata = fs.readFileSync(file);
        return JSON.parse(rawdata);
    } catch {
        return undefined;
    }
}

function endGroup(test: TestItem, allPassed: boolean, run: TestRun) {
    if (allPassed) {
        run.passed(test);
    } else {
        run.failed(test, new TestMessage('Some tests failed!'));
    }
    run.end();
}

async function runCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: StateMachine.context().projectUri }, (error, stdout, stderr) => {
            if (error) {
                // Report test failure
                reject(new Error(stderr || 'Test failed!'));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Start debugging
 */
export async function startDebugging(testDebug: boolean, args: any[])
    : Promise<void> {
    const uri: Uri = Uri.parse(StateMachine.context().projectUri);
    const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
    const debugConfig: DebugConfiguration = await constructDebugConfig(uri, testDebug, args);

    return debug.startDebugging(workspaceFolder, debugConfig).then(
        // Wait for debug session to be complete.
        () => {
            return new Promise<void>((resolve) => {
                debug.onDidTerminateDebugSession(() => {
                    resolve();
                });
            });
        },
        (ex) => console.log('Failed to start debugging tests' + ex),
    );
}
