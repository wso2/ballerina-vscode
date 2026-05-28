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

import { BaseAttachment } from "./baseAttachment";
import { getFileTypesForCommand } from "./attachmentManager";
import { Command } from "@wso2/ballerina-core";

/**
 * DataMapperAttachment overrides how the file is read. Instead of plain text,
 * it reads the file as a Data URL, extracts the Base64 portion, and returns it.
 */
export class DataMapperAttachment extends BaseAttachment {
    constructor(private command: Command) {
        super(getFileTypesForCommand(command));
    }

    protected readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => {
                if (reader.result) {
                    const base64String = reader.result.toString().split(",")[1];
                    if (base64String) {
                        resolve(base64String);
                    } else {
                        reject(new Error("Failed to extract Base64 content."));
                    }
                } else {
                    reject(new Error("FileReader result is null or undefined."));
                }
            };

            reader.onerror = () => {
                reject(new Error("Error reading the file."));
            };

            reader.readAsDataURL(file);
        });
    }
}
