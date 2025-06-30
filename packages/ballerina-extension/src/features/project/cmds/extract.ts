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
import { commands, Uri, workspace, WorkspaceEdit, QuickPickItem, window, Position, TextDocument } from "vscode";

const ACTION_EXTRACT_COMMAND = "ballerina.action.extract";

function activateExtractCommand() {
    // register ballerina extract command
    commands.registerCommand(ACTION_EXTRACT_COMMAND, async (command: string, url: string, textEditMap: any, renamePositionMap: any) => {
        try {
            const uri: Uri = Uri.parse(url);
            const document: TextDocument = await workspace.openTextDocument(uri);
            if (document === null) {
                return;
            }

            const expression = await getExpression(command, textEditMap);
            if (!expression) {
                return;
            }

            const edit = new WorkspaceEdit();
            const selectedItem = expression.textEditList;

            for (let textEdit in selectedItem) {
                edit.replace(Uri.file(url), selectedItem[textEdit].range, selectedItem[textEdit].newText);
            }
            await workspace.applyEdit(edit);

            if (!renamePositionMap || !renamePositionMap[expression.label]) {
                return;
            }

            const actionRenamePosition: Position = new Position(renamePositionMap[expression.label].line, renamePositionMap[expression.label].character);
            await commands.executeCommand('editor.action.rename', [
                document.uri,
                actionRenamePosition,
            ]);
        } catch (error) {
            // do nothing.
        }
    });
}

export { activateExtractCommand };


async function getExpression(commandMessage: string, textEditMap: any): Promise<OptionItem | undefined> {
    const options: OptionItem[] = [];
    for (let value in textEditMap) {
        const extractItem: OptionItem = {
            label: value,
            textEditList: textEditMap[value]
        };
        options.push(extractItem);
    }

    let resultItem: OptionItem | undefined;

    if (options.length === 1) {
        resultItem = options[0];
    } else if (options.length > 1) {
        resultItem = await window.showQuickPick<OptionItem>(options, {
            placeHolder: `Select an expression you want to ${commandMessage}`,
        });
    }

    if (!resultItem) {
        return undefined;
    }

    const resultExpression: OptionItem = {
        label: resultItem.label,
        textEditList: resultItem.textEditList
    };
    return resultExpression;
}

interface OptionItem extends QuickPickItem {
    label: string;
    textEditList: object;
}
