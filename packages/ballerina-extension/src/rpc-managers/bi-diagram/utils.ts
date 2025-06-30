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

import { NodeProperties } from "@wso2/ballerina-core";
import { NodePosition, STNode, traversNode } from "@wso2/syntax-tree";

import { FunctionFindingVisitor } from "../../utils/function-finding-visitor";
import { Position, Range, Uri, workspace, WorkspaceEdit } from "vscode";
import { TextEdit } from "@wso2/ballerina-core";

export const DATA_MAPPING_FILE_NAME = "data_mappings.bal";

export function getFunctionNodePosition(nodeProperties: NodeProperties, syntaxTree: STNode): NodePosition {
    const functionName = nodeProperties.hasOwnProperty("functionName")
        ? nodeProperties["functionName"].value as string
        : "";
    const functionFindingVisitor = new FunctionFindingVisitor(functionName);
    traversNode(syntaxTree, functionFindingVisitor);
    const functionNode = functionFindingVisitor.getFunctionNode();

    return functionNode.position;
}

export async function applyBallerinaTomlEdit(tomlPath: Uri, textEdit: TextEdit) {
    const workspaceEdit = new WorkspaceEdit();
    const range = new Range(new Position(textEdit.range.start.line, textEdit.range.start.character),
        new Position(textEdit.range.end.line, textEdit.range.end.character));

    // Create the position and range
    workspaceEdit.replace(tomlPath, range, textEdit.newText);
    // Apply the edit
    await workspace.applyEdit(workspaceEdit);
}
