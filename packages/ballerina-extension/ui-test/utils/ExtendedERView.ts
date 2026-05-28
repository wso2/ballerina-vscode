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
import { switchToIFrame, waitUntil } from "../util";
import { By, EditorView, VSBrowser, Workbench } from "vscode-extension-tester";
import { ExtendedEditorView } from "./ExtendedEditorView";

export class ExtendedERView {
    editorView: EditorView;

    constructor(treeItem: EditorView) {
        this.editorView = treeItem;
    }

    async waitForDiagram(workbench: Workbench, browser: VSBrowser) {
        const extdEditor = new ExtendedEditorView(this.editorView);
        await extdEditor.getCodeLens('Visualize');
        await workbench.executeCommand("Ballerina: Entity Relationship Diagram");
        await switchToIFrame('Entity Relationship Diagram', browser.driver);
    }

    async getNodes(testId: string, timeout: number = 15000) {
        const employeePath = By.xpath(`//*[@data-testid="${testId}"]`);
        return await waitUntil(employeePath, timeout);
    }

    async getLinks(testId: string) {
        const employeePath = By.id(testId);
        return await waitUntil(employeePath, 50000);
    }
}
