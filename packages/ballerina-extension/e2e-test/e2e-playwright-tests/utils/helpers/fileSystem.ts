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
import { newProjectPath } from "./setup";
import fs from "fs";

type FileType = 'agents.bal' | 'config.bal' | 'connections.bal' | 'data_mappings.bal' | 'functions.bal' | 'main.bal' | 'types.bal' | 'automation.bal';

export namespace FileUtils {
    export function updateProjectFile(fileName: FileType, content: string) {
        const filePath = path.join(newProjectPath, fileName);
        fs.mkdirSync(newProjectPath, { recursive: true });
        fs.writeFileSync(filePath, content);
    }
}
