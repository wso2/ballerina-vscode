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
import { SyntaxTreeResponse, InsertorDelete, NOT_SUPPORTED_TYPE, STModification } from "@wso2/ballerina-core";
import { normalize } from "path";
import { Position, Range, Uri, WorkspaceEdit, workspace } from "vscode";
import { URI } from "vscode-uri";
import { writeFileSync } from "fs";
import { StateMachine, updateView } from "../stateMachine";

interface UpdateFileContentRequest {
    filePath: string;
    content: string;
    skipForceSave?: boolean;
    updateViewFlag?: boolean; // New flag to control updateView execution, default true
}

export async function applyModifications(fileName: string, modifications: STModification[]): Promise<SyntaxTreeResponse | NOT_SUPPORTED_TYPE> {
    const ast = await InsertorDelete(modifications);
    return await StateMachine.langClient().stModify({
        documentIdentifier: { uri: Uri.file(fileName).toString() },
        astModifications: ast
    });
}

export async function modifyFileContent(params: UpdateFileContentRequest): Promise<boolean> {
    const { filePath, content, skipForceSave, updateViewFlag = true } = params;
    const normalizedFilePath = normalize(filePath);
    const doc = workspace.textDocuments.find((doc) => normalize(doc.fileName) === normalizedFilePath);

    if (doc) {
        const edit = new WorkspaceEdit();
        edit.replace(URI.file(normalizedFilePath), new Range(new Position(0, 0), doc.lineAt(doc.lineCount - 1).range.end), content);
        await workspace.applyEdit(edit);
        StateMachine.langClient().updateStatusBar();
        if (skipForceSave) {
            // Skip saving document and keep in dirty mode
            return true;
        }
        return doc.save();
    } else {
        writeBallerinaFileDidOpen(normalizedFilePath, content);
        StateMachine.langClient().updateStatusBar();
        if (updateViewFlag) {
            updateView();
        }
    }

    return false;
}

export async function writeBallerinaFileDidOpen(filePath: string, content: string) {
    writeFileSync(filePath, content.trim());
    StateMachine.langClient().didChange({
        textDocument: { uri: filePath, version: 1 },
        contentChanges: [
            {
                text: content,
            },
        ],
    });
    StateMachine.langClient().didOpen({
        textDocument: {
            uri: Uri.file(filePath).toString(),
            languageId: 'ballerina',
            version: 1,
            text: content.trim()
        }
    });
}
