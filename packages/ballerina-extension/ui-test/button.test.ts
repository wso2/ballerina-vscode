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

import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { EditorView, VSBrowser } from 'vscode-extension-tester';
import { wait } from './util';
import { ExtendedEditorView } from './utils/ExtendedEditorView';

describe('VSCode UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data');

    before(async () => {
        await VSBrowser.instance.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/hello_world.bal`);
        await VSBrowser.instance.waitForWorkbench();
    });

    it('Test Title bar', async () => {
        const editorView = new ExtendedEditorView(new EditorView());
        expect(await editorView.getAction("Run")).is.not.undefined;
        expect(await editorView.getAction("Debug")).is.not.undefined;

        await wait(5000);
        expect(await editorView.getAction("Show Diagram")).is.not.undefined;
        (await editorView.getAction("Show Diagram"))!.click();

        expect(await editorView.getAction("Show Source")).is.not.undefined;

    });

});
