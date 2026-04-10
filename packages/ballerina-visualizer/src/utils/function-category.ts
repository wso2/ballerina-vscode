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

import type { Category } from "@wso2/ballerina-core";
import type { Category as PanelCategory } from "@wso2/ballerina-side-panel";

export const CURRENT_INTEGRATION_CATEGORY_TITLE = "Current Integration";

const CURRENT_INTEGRATION_CATEGORY_ALIASES = new Set([
    CURRENT_INTEGRATION_CATEGORY_TITLE,
    "Project",
    "Current Project",
    "Current Workspace",
    "Workflows",
    "Activities",
]);

export function normalizeFunctionSearchCategories(categories: Category[]): Category[] {
    return categories.map((category) => {
        if (!CURRENT_INTEGRATION_CATEGORY_ALIASES.has(category?.metadata?.label)) {
            return category;
        }

        return {
            ...category,
            metadata: {
                ...category.metadata,
                label: CURRENT_INTEGRATION_CATEGORY_TITLE,
            },
        };
    });
}

export function findCurrentIntegrationCategory(categories: PanelCategory[]): PanelCategory | undefined {
    return categories.find((category) => category.title === CURRENT_INTEGRATION_CATEGORY_TITLE);
}
