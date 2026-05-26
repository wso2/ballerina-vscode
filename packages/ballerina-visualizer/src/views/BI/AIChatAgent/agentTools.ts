/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Property } from "@wso2/ballerina-core";

// Resource paths can carry hyphens that the display value escapes
// (e.g. `/foo\-bar/[id]`) while `codedata.originalName` keeps the
// canonical un-escaped form. Replacing on `value` alone caused the
// originalName to drift and pick up display-only escaping. Use each
// field as its own source so the two stay independently consistent.
export const updateResourcePathProperty = (
    resourcePathProperty: Property,
    paramKey: string,
    paramValue: unknown
): Property => {
    const sourcePath = resourcePathProperty.codedata?.originalName ?? resourcePathProperty.value;
    const displayPath = resourcePathProperty.value;
    const replace = <T,>(p: T): T =>
        (typeof p === "string" ? p.replace(`[${paramKey}]`, `[${paramValue}]`) : p) as T;
    return {
        ...resourcePathProperty,
        codedata: {
            ...resourcePathProperty.codedata,
            originalName: String(replace(sourcePath))
        },
        value: replace(displayPath)
    };
};
