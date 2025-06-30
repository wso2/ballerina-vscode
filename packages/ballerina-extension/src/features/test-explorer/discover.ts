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

import path from "path";
import { StateMachine } from "../../stateMachine";
import { TestsDiscoveryRequest, TestsDiscoveryResponse, FunctionTreeNode } from "@wso2/ballerina-core";
import { BallerinaExtension } from "../../core";
import { Position, Range, TestController, Uri, TestItem, commands } from "vscode";

let groups: string[] = [];

export async function discoverTestFunctionsInProject(ballerinaExtInstance: BallerinaExtension, 
    testController: TestController) {
    groups.push(testController.id);
    const filePath : string = path.join(StateMachine.context().projectUri);
    const request: TestsDiscoveryRequest = {
        filePath
    };
    const response: TestsDiscoveryResponse = await ballerinaExtInstance.langClient?.getProjectTestFunctions(request);
    if (response) {
        createTests(response, testController);
        setGroupsContext();
    }
}

function createTests(response: TestsDiscoveryResponse, testController: TestController) {
    if (response.result) {
        const projectDir = path.join(StateMachine.context().projectUri);

        // Check if the result is a Map or a plain object
        const isMap = response.result instanceof Map;

        // Convert the result to an iterable format
        const entries = isMap
            ? Array.from(response.result.entries()) // If it's a Map, convert to an array of entries
            : Object.entries(response.result); // If it's a plain object, use Object.entries

        // Iterate over the result map
        for (const [group, testFunctions] of entries) {
            // Create a test item for the group
            const groupId = `group:${group}`;
            let groupItem : TestItem = testController.items.get(groupId);

            if (!groupItem) {
                // If the group doesn't exist, create it
                groupItem = testController.createTestItem(groupId, group);
                testController.items.add(groupItem);
                groups.push(groupId);
            }

            // Ensure testFunctions is iterable (convert to an array if necessary)
            const testFunctionsArray = Array.isArray(testFunctions) 
            ? testFunctions // If it's already an array, use it directly
            : Object.values(testFunctions); // If it's an object, convert to an array

            // Iterate over the test functions in the group
            for (const tf of testFunctionsArray) {
                const testFunc : FunctionTreeNode = tf as FunctionTreeNode;
                // Generate a unique ID for the test item using the function name
                const fileName: string = testFunc.lineRange.fileName;
                const fileUri = Uri.file(path.join(projectDir, fileName)); 
                const testId = `test:${path.basename(fileUri.path)}:${testFunc.functionName}`;

                // Create a test item for the test function
                const testItem = testController.createTestItem(testId, testFunc.functionName);

                // Set the range for the test (optional, for navigation)
                const startPosition = new Position(
                    testFunc.lineRange.startLine.line, // Convert to 0-based line number
                    testFunc.lineRange.startLine.offset
                );
                const endPosition = new Position(
                    testFunc.lineRange.endLine.line, // Convert to 0-based line number
                    testFunc.lineRange.endLine.offset
                );
                testItem.range = new Range(startPosition, endPosition);

                // Add the test item to the group
                groupItem.children.add(testItem);
            }
        }
    } 
}


export async function handleFileChange(ballerinaExtInstance: BallerinaExtension, 
    uri: Uri, testController: TestController) {    
    const request: TestsDiscoveryRequest = {
        filePath: uri.path
    };
    const response: TestsDiscoveryResponse = await ballerinaExtInstance.langClient?.getFileTestFunctions(request);
    if (!response || !response.result) {
        return;
    }

    handleFileDelete(uri, testController);
    createTests(response, testController);
    setGroupsContext();
}

export async function handleFileDelete(uri: Uri, testController: TestController) {
    const filePath = path.basename(uri.path);

    // Iterate over all root-level items in the Test Explorer
    testController.items.forEach((item) => {
        if (isTestFunctionItem(item)) {
            // If the item is a test function, check if it belongs to the deleted file
            if (item.id.startsWith(`test:${filePath}:`)) {
                testController.items.delete(item.id);
            }
        } else if (isTestGroupItem(item)) {
            // If the item is a test group, iterate over its children
            const childrenToDelete: TestItem[] = [];
            item.children.forEach((child) => {
                if (child.id.startsWith(`test:${filePath}:`)) {
                    childrenToDelete.push(child);
                }
            });

            // Remove the matching test function items
            childrenToDelete.forEach((child) => {
                item.children.delete(child.id);
            });

            // If the group is empty after deletion, remove it
            if (item.children.size === 0) {
                testController.items.delete(item.id);
                groups = groups.filter((group) => group !== item.id);
            }
        }
    });
}

export function isTestFunctionItem(item: TestItem): boolean {
    // Test function items have IDs starting with "test:"
    return item.id.startsWith('test:');
}

export function isTestGroupItem(item: TestItem): boolean {
    // Test group items have IDs starting with "group:"
    return item.id.startsWith('group:');
}

function setGroupsContext() {
    commands.executeCommand('setContext', 'testGroups', groups);
}
