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
import { newProjectPath, page } from "./setup";
import fs from "fs";

type FileType = 'agents.bal' | 'config.bal' | 'connections.bal' | 'data_mappings.bal' | 'functions.bal' | 'main.bal' | 'types.bal' | 'automation.bal';

export namespace FileUtils {
    export function updateProjectFile(fileName: FileType, content: string) {
        const filePath = path.join(newProjectPath, fileName);
        fs.mkdirSync(newProjectPath, { recursive: true });
        fs.writeFileSync(filePath, content);
    }

    /**
     * Opens a project file in the VS Code editor via Quick Open.
     * This triggers `textDocument/didOpen` to the language server,
     * ensuring it picks up on-disk changes made by {@link updateProjectFile}.
     */
    export async function openProjectFileInEditor(fileName: FileType) {
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.page.keyboard.press(`${modifier}+p`);
        await page.page.waitForTimeout(500);
        await page.page.keyboard.type(fileName);
        await page.page.waitForTimeout(500);
        await page.page.keyboard.press('Enter');
        await page.page.waitForTimeout(1000);
    }
}
