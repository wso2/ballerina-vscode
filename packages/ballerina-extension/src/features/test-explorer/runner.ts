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
import { CancellationToken, TestRunRequest, TestMessage, TestRun, TestItem, debug, Uri, WorkspaceFolder, DebugConfiguration, workspace, TestRunProfileKind, commands, window } from 'vscode';
import { EVALUATION_GROUP, testController } from './activator';
import { StateMachine } from "../../stateMachine";
import { isTestFunctionItem, isTestGroupItem, isProjectGroupItem } from './discover';
import { extension } from '../../BalExtensionContext';
import { constructDebugConfig } from "../debugger";
const fs = require('fs');
import path from 'path';
import { EvaluationReportWebview } from '../../views/evaluation-report/webview';

/**
 * Extract project path from a test item
 * Test IDs have the format: test:${projectPath}:${fileName}:${functionName}
 */
function getProjectPathFromTestItem(test: TestItem): string | undefined {
    if (isTestFunctionItem(test)) {
        // Extract from test ID: test:${projectPath}:${fileName}:${functionName}
        const parts = test.id.split(':');
        if (parts.length >= 2 && parts[0] === 'test') {
            return parts[1];
        }
    } else if (isProjectGroupItem(test)) {
        // For project groups, we need to get a child test to extract the path
        let projectPath: string | undefined;
        test.children.forEach((child) => {
            if (!projectPath) {
                projectPath = getProjectPathFromTestItem(child);
            }
        });
        return projectPath;
    } else if (isTestGroupItem(test)) {
        // For test groups, check if they have a parent project or extract from children
        if (test.parent && isProjectGroupItem(test.parent)) {
            return getProjectPathFromTestItem(test.parent);
        }
        // Otherwise extract from children
        let projectPath: string | undefined;
        test.children.forEach((child) => {
            if (!projectPath) {
                projectPath = getProjectPathFromTestItem(child);
            }
        });
        return projectPath;
    }
    return StateMachine.context().projectPath;
}

/**
 * Check if we're in a workspace context (multiple projects)
 * Returns the project name if in workspace, undefined otherwise
 */
function getProjectNameIfWorkspace(projectPath: string): string | undefined {
    const projectInfo = StateMachine.context().projectInfo;

    // Check if this is a workspace with multiple child projects
    if (projectInfo?.children?.length > 0) {
        // Find the matching child project
        for (const child of projectInfo.children) {
            if (child.projectPath === projectPath) {
                return path.basename(projectPath);
            }
        }
    }

    return undefined;
}

function isAiEvaluations(test: TestItem): boolean {
    // Check if the test item itself is the evaluations group
    if (isTestGroupItem(test) && test.label === EVALUATION_GROUP) {
        return true;
    }

    // Check if the test function's parent is the evaluations group
    if (isTestFunctionItem(test) && test.parent && test.parent.label === EVALUATION_GROUP) {
        return true;
    }

    // Check if the project group contains only evaluations groups
    if (isProjectGroupItem(test)) {
        // Return true only if all children are evaluation groups
        let allChildrenAreEvaluations = true;
        let hasChildren = false;

        test.children.forEach((child) => {
            hasChildren = true;
            if (!isTestGroupItem(child) || child.label !== EVALUATION_GROUP) {
                allChildrenAreEvaluations = false;
            }
        });

        return hasChildren && allChildrenAreEvaluations;
    }

    return false;
}

function buildTestCommand(test: TestItem, executor: string, projectName: string | undefined, testCaseNames?: string[]): string {
    if (isAiEvaluations(test)) {
        // Evaluations tests use group-based execution with test report
        const testsPart = testCaseNames && testCaseNames.length > 0 ? ` --tests ${testCaseNames.join(',')}` : '';
        const projectPart = projectName ? ` ${projectName}` : '';
        return `${executor} test --groups ${EVALUATION_GROUP} --test-report --test-report-dir=evaluation-reports${testsPart}${projectPart}`;
    } else {
        // Standard tests use code coverage and optional test filtering
        const testsPart = testCaseNames && testCaseNames.length > 0 ? ` --tests ${testCaseNames.join(',')}` : '';
        const projectPart = projectName ? ` ${projectName}` : '';
        return `${executor} test --code-coverage${testsPart}${projectPart}`;
    }
}

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

        // Get the project path for this test
        const projectPath = getProjectPathFromTestItem(test);
        if (!projectPath) {
            run.failed(test, new TestMessage('Could not determine project path for test'));
            run.end();
            return;
        }

        // Check if we're in a workspace with multiple projects
        const projectName = getProjectNameIfWorkspace(projectPath);

        let command: string;
        const executor = extension.ballerinaExtInstance.getBallerinaCmd();

        // Handle running all tests in a project group
        if (isProjectGroupItem(test)) {
            let testCaseNames: string[] = [];
            let testItems: TestItem[] = [];

            // Collect all test functions from the project
            // Children can be either test groups or test functions directly (when DEFAULT_GROUP is skipped)
            test.children.forEach((child) => {
                if (isTestFunctionItem(child)) {
                    // Test added directly to project (DEFAULT_GROUP was skipped)
                    testCaseNames.push(child.label);
                    testItems.push(child);
                    run.started(child);
                } else if (isTestGroupItem(child)) {
                    // Test group - iterate through its children
                    child.children.forEach((testFunc) => {
                        if (isTestFunctionItem(testFunc)) {
                            testCaseNames.push(testFunc.label);
                            testItems.push(testFunc);
                            run.started(testFunc);
                        }
                    });
                }
            });

            command = buildTestCommand(test, executor, projectName, testCaseNames.length > 0 ? testCaseNames : undefined);

            const startTime = Date.now();
            // For workspace, run from workspace root; for single project, run from project path
            const workingDirectory = projectName ? StateMachine.context().workspacePath || projectPath : projectPath;
            runCommand(command, workingDirectory).then(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    testItems.forEach(item => run.passed(item, timeElapsed));
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, true, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            }).catch(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    testItems.forEach(item => run.failed(item, new TestMessage('Evaluation failed'), timeElapsed));
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, false, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            });
        } else if (isTestGroupItem(test)) {
            let testCaseNames: string[] = [];
            let testItems: TestItem[] = [];
            test.children.forEach((child) => {
                const functionName = child.label;
                testCaseNames.push(functionName);
                testItems.push(child);
                run.started(child);
            });

            command = buildTestCommand(test, executor, projectName, testCaseNames);

            const startTime = Date.now();
            // For workspace, run from workspace root; for single project, run from project path
            const workingDirectory = projectName ? StateMachine.context().workspacePath || projectPath : projectPath;
            runCommand(command, workingDirectory).then(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    testItems.forEach(item => run.passed(item, timeElapsed));
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, true, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            }).catch(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    testItems.forEach(item => run.failed(item, new TestMessage('Evaluation failed'), timeElapsed));
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, false, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            });
        } else if (isTestFunctionItem(test)) {
            command = buildTestCommand(test, executor, projectName, [test.label]);

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
            // For workspace, run from workspace root; for single project, run from project path
            const workingDirectory = projectName ? StateMachine.context().workspacePath || projectPath : projectPath;
            runCommand(command, workingDirectory).then(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    run.passed(test, timeElapsed);
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, true, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath, true).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            }).catch(async () => {
                const endTime = Date.now();
                const timeElapsed = calculateTimeElapsed(startTime, endTime, testItems);

                if (isAiEvaluations(test)) {
                    run.failed(test, new TestMessage('Evaluation failed'), timeElapsed);
                    const reportUri = await findLatestEvaluationReport(workingDirectory);
                    if (reportUri) { await openEvaluationReport(reportUri); }
                    endGroup(test, false, run);
                } else {
                    reportTestResults(run, testItems, timeElapsed, projectPath, true).then(() => {
                        endGroup(test, true, run);
                    }).catch(() => {
                        endGroup(test, false, run);
                    });
                }
            });
        }
    });
}
/**
 * Calculate time elapsed per test item
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @param testItems - Array of test items
 * @returns Time elapsed per test item in milliseconds
 */
function calculateTimeElapsed(startTime: number, endTime: number, testItems: TestItem[]): number {
    return testItems.length > 0 ? (endTime - startTime) / testItems.length : (endTime - startTime);
}

const TEST_RESULTS_PATH = path.join("target", "report", "test_results.json").toString();

enum TEST_STATUS {
    PASSED = 'PASSED',
    FAILED = 'FAILURE',
    SKIPPED = 'SKIPPED',
}

async function reportTestResults(run: TestRun, testItems: TestItem[], timeElapsed: number, projectPath: string, individualTest: boolean = false) {
    // reading test results
    // For workspace projects, results are in workspace/target, not project/target
    const projectInfo = StateMachine.context().projectInfo;
    const workspacePath = StateMachine.context().workspacePath;

    let testResultsPath: string;
    if (projectInfo?.children?.length > 0 && workspacePath) {
        // Workspace with multiple projects - results are at workspace root
        testResultsPath = path.join(workspacePath, TEST_RESULTS_PATH);
    } else {
        // Single project - results are in project directory
        testResultsPath = path.join(projectPath, TEST_RESULTS_PATH);
    }

    let testsJson: JSON | undefined = undefined;
    testsJson = await readTestJson(testResultsPath);
    if (!testsJson) {
        for (const test of testItems) {
            const testMessage: TestMessage = new TestMessage("Command failed");
            run.failed(test, testMessage, timeElapsed);
        }
        return;
    }

    // For workspace projects, test results are nested under packages[].moduleStatus
    // For single projects, they're directly at moduleStatus
    let moduleStatus;
    if (testsJson["packages"]) {
        // Workspace structure - find the matching package
        const projectName = path.basename(projectPath);
        const packages = testsJson["packages"];
        const matchingPackage = packages.find(pkg => pkg["projectName"] === projectName);

        if (matchingPackage) {
            moduleStatus = matchingPackage["moduleStatus"];
        } else {
            // If we can't find the specific package, try the first one
            moduleStatus = packages[0]?.["moduleStatus"];
        }
    } else {
        // Single project structure
        moduleStatus = testsJson["moduleStatus"];
    }

    if (!moduleStatus) {
        for (const test of testItems) {
            const testMessage: TestMessage = new TestMessage("No test results found");
            run.failed(test, testMessage, timeElapsed);
        }
        return;
    }

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

async function findLatestEvaluationReport(workingDirectory: string): Promise<Uri | undefined> {
    const reportsDir = path.join(workingDirectory, 'evaluation-reports');

    if (!fs.existsSync(reportsDir)) {
        return undefined;
    }

    try {
        const files = fs.readdirSync(reportsDir);
        const htmlFiles = files
            .filter((file: string) => file.endsWith('.html'))
            .map((file: string) => ({
                name: file,
                path: path.join(reportsDir, file),
                mtime: fs.statSync(path.join(reportsDir, file)).mtime
            }))
            .sort((a: { mtime: Date }, b: { mtime: Date }) => b.mtime.getTime() - a.mtime.getTime());

        if (htmlFiles.length > 0) {
            return Uri.file(htmlFiles[0].path);
        }
    } catch (error) {
        console.error('Error finding evaluation report:', error);
    }

    return undefined;
}

async function openEvaluationReport(reportUri: Uri): Promise<void> {
    try {
        // Show notification (non-blocking, no button)
        window.showInformationMessage('Evaluation report generated');

        // Open report in webview
        await EvaluationReportWebview.createOrShow(reportUri);
    } catch (error) {
        console.error('Failed to open evaluation report:', error);
        window.showErrorMessage('Failed to open evaluation report');
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

async function runCommand(command: string, projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
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
    const uri: Uri = Uri.parse(StateMachine.context().projectPath);
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
