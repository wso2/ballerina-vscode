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

import {
    CURRENT_INTEGRATION_CATEGORY_TITLE,
    findCurrentIntegrationCategory,
    normalizeFunctionSearchCategories,
} from "./function-category";

describe("normalizeFunctionSearchCategories", () => {
    it("maps workflow search results to the current integration category", () => {
        const categories = normalizeFunctionSearchCategories([
            {
                metadata: {
                    label: "Workflows",
                    description: "Workflows defined within the current integration",
                },
                items: [],
            } as any,
        ]);

        expect(categories[0].metadata.label).toBe(CURRENT_INTEGRATION_CATEGORY_TITLE);
        expect(categories[0].metadata.description).toBe("Workflows defined within the current integration");
    });

    it("maps activity and legacy project aliases to the current integration category", () => {
        const categories = normalizeFunctionSearchCategories([
            { metadata: { label: "Activities" }, items: [] } as any,
            { metadata: { label: "Project" }, items: [] } as any,
        ]);

        expect(categories.map((category) => category.metadata.label)).toEqual([
            CURRENT_INTEGRATION_CATEGORY_TITLE,
            CURRENT_INTEGRATION_CATEGORY_TITLE,
        ]);
    });

    it("leaves unrelated categories unchanged", () => {
        const categories = normalizeFunctionSearchCategories([
            { metadata: { label: "Imported Modules" }, items: [] } as any,
        ]);

        expect(categories[0].metadata.label).toBe("Imported Modules");
    });
});

describe("findCurrentIntegrationCategory", () => {
    it("returns the normalized current integration category", () => {
        const category = findCurrentIntegrationCategory([
            { title: "Imported Modules", items: [] } as any,
            { title: CURRENT_INTEGRATION_CATEGORY_TITLE, items: [] } as any,
        ]);

        expect(category?.title).toBe(CURRENT_INTEGRATION_CATEGORY_TITLE);
    });
});
