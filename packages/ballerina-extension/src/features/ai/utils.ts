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

import * as fs from 'fs';
import path from "path";
import { Uri, workspace } from 'vscode';

import { StateMachine } from "../../stateMachine";

const config = workspace.getConfiguration('ballerina');
export const BACKEND_URL : string = process.env.ROOT_URL || config.get('rootUrl');
export const AUTH_ORG : string = process.env.BALLERINA_AUTH_ORG || config.get('authOrg') ;
export const AUTH_CLIENT_ID : string = process.env.BALLERINA_AUTH_CLIENT_ID || config.get('authClientID');
export const AUTH_REDIRECT_URL : string = process.env.AUTH_REDIRECT_URL || config.get('authRedirectURL');

export async function closeAllBallerinaFiles(dirPath: string): Promise<void> {
    // Check if the directory exists
    if (!fs.existsSync(dirPath)) {
        console.error(`Directory does not exist: ${dirPath}`);
        return;
    }

    // Get the language client
    const langClient = StateMachine.langClient();

    // Function to recursively find and close .bal files
    async function processDir(currentPath: string): Promise<void> {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            
            if (entry.isDirectory()) {
                // Recursively process subdirectories
                await processDir(entryPath);
            } else if (entry.isFile() && entry.name.endsWith('.bal')) {
                // Convert file path to URI
                const fileUri = Uri.file(entryPath).toString();
                
                // Call didClose for this Ballerina file
                await langClient.didClose({
                    textDocument: { uri: fileUri }
                });
                await langClient.didChangedWatchedFiles({
                    changes: [
                        {
                            uri: fileUri,
                            type: 3
                        }
                    ]
                });

                console.log(`Closed file: ${entryPath}`);
            }
        }
    }

    // Start the recursive processing
    await processDir(dirPath);
}
