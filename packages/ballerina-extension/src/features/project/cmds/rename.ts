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

import { commands, Uri, TextDocument, workspace, Position } from "vscode";

const ACTION_POSITIONAL_RENAME_COMMAND = "ballerina.action.positional.rename";

function activateRenameCommand() {
   // Register ballerina rename command that uses line/character based position to rename
    commands.registerCommand(ACTION_POSITIONAL_RENAME_COMMAND, async (url:string, renamePosition:Position) => {
        try {
            const uri: Uri = Uri.parse(url);
            const document: TextDocument = await workspace.openTextDocument(uri);
            if (document === null) {
                return;
            }

            const actionRenamePosition: Position = new Position(renamePosition.line, renamePosition.character);
            await commands.executeCommand('editor.action.rename', [
                document.uri,
                actionRenamePosition,
            ]);
        } catch (error) {
            // do nothing.
        }
    });
}

export { activateRenameCommand };
