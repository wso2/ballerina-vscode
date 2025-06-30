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

export function validateJSON(fileContent: string) {
    JSON.parse(fileContent);
};

export function validateCSV(fileContent: string) {
    const rows = fileContent.trim().split("\n");
    const columnCount = rows[0].split(',').length;
    for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        if (columns.length !== columnCount) {
            throw new Error();
        }
    }
};

export function validateXML(fileContent: string) {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(fileContent, "application/xml");
    const parserError = parsedDocument.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
        throw new Error();
    }
};
