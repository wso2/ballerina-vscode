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

import { tests, workspace,  TestRunProfileKind, TestController } from "vscode";
import { BallerinaExtension } from "../../core";
import { runHandler } from "./runner";
import { activateEditBiTest } from "./commands";
import { discoverTestFunctionsInProject, handleFileChange as handleTestFileUpdate, handleFileDelete as handleTestFileDelete } from "./discover";

export let testController: TestController;

export async function activate(ballerinaExtInstance: BallerinaExtension) {
    testController = tests.createTestController('ballerina-integrator-tests', 'WSO2 Integrator: BI Tests');

    // Create test profiles to display.
    testController.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true);
    testController.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true);

    // Register a file watcher for test files
    const fileWatcher = workspace.createFileSystemWatcher('**/tests/**/*.bal');

    // Handle file creation, modification, and deletion
    fileWatcher.onDidCreate(async (uri) => await handleTestFileUpdate(ballerinaExtInstance, uri, testController));
    fileWatcher.onDidChange(async (uri) => await handleTestFileUpdate(ballerinaExtInstance, uri, testController));
    fileWatcher.onDidDelete((uri) => handleTestFileDelete(uri, testController));

    // Initial test discovery
    discoverTestFunctionsInProject(ballerinaExtInstance, testController);

    // Register the test controller and file watcher with the extension context
    ballerinaExtInstance.context?.subscriptions.push(testController, fileWatcher);

    activateEditBiTest();
}


