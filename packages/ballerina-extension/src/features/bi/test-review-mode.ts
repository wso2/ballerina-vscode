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

import { commands } from "vscode";
import { BI_COMMANDS, EVENT_TYPE, MACHINE_VIEW, ReviewModeData } from "@wso2/ballerina-core";
import { openView } from "../../stateMachine";

/**
 * Example function showing how to trigger review mode programmatically
 * This can be called from AI code generation or other features
 */
export function triggerReviewMode(projectPath: string, generatedFiles: Array<{ filePath: string, startLine: number, endLine: number }>) {
    const reviewData: ReviewModeData = {
        views: [
            // Always start with component diagram for architectural overview
            {
                type: 'component',
                filePath: '',
                position: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
                projectPath: projectPath,
                label: 'Project Architecture'
            },
            // Add flow diagrams for each generated file
            ...generatedFiles.map((file, index) => ({
                type: 'flow' as const,
                filePath: file.filePath,
                position: {
                    startLine: file.startLine,
                    startColumn: 0,
                    endLine: file.endLine,
                    endColumn: 1
                },
                projectPath: projectPath,
                label: `Generated Code ${index + 1}: ${file.filePath.split('/').pop()}`
            }))
        ],
        currentIndex: 0
    };

    // Option 1: Use openView directly
    openView(EVENT_TYPE.OPEN_VIEW, { 
        view: MACHINE_VIEW.ReviewMode, 
        reviewData,
        projectPath 
    });

    // Option 2: Use command (alternative)
    // commands.executeCommand(BI_COMMANDS.REVIEW_CHANGES, reviewData);
}

/**
 * Example: Trigger review mode after AI generates code
 */
export function reviewAIGeneratedCode(projectPath: string) {
    const generatedFiles = [
        {
            filePath: `${projectPath}/automation.bal`,
            startLine: 2,
            endLine: 9
        },
        {
            filePath: `${projectPath}/functions.bal`,
            startLine: 2,
            endLine: 5
        }
    ];

    triggerReviewMode(projectPath, generatedFiles);
}


