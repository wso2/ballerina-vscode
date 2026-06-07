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

import { CancellationToken, Event, TextDocumentContentProvider, Uri, workspace} from 'vscode';

/**
 * Text document content provider for read only files.
 *
 * @class ReadOnlyContentProvider
 * @extends {TextDocumentContentProvider}
 */
export class ReadOnlyContentProvider implements TextDocumentContentProvider{

    onDidChange?: Event<Uri> | undefined;
    async provideTextDocumentContent(uri: Uri, token: CancellationToken): Promise<string> {
        // create new Uri object to convert the schema to file.
        let fileUri = Uri.file(uri.path);
        const content = await workspace.fs.readFile(fileUri);
        return content.toString();
    }
}
