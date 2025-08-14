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

import { CDFunction, CDResourceFunction, CDService } from "@wso2/ballerina-core";

export type GroupKey = "Query" | "Subscription" | "Mutation";

export const PREVIEW_COUNT = 2;
export const SHOW_ALL_THRESHOLD = 3;

export function getGraphQLGroupLabel(accessor?: string, name?: string): GroupKey | null {
    if (accessor === "get") return "Query";
    if (accessor === "subscribe") return "Subscription";
    if (!accessor && name) return "Mutation";
    return null;
}

export function partitionServiceFunctions(
    service: CDService,
    expandedNodes: Set<string>
): { visible: Array<CDFunction | CDResourceFunction>; hidden: Array<CDFunction | CDResourceFunction> } {
    const serviceFunctions: Array<CDFunction | CDResourceFunction> = [];
    if (service.remoteFunctions?.length) serviceFunctions.push(...service.remoteFunctions);
    if (service.resourceFunctions?.length) serviceFunctions.push(...service.resourceFunctions);

    const isGraphQL = service.type === "graphql:Service";

    if (!isGraphQL) {
        const isExpanded = expandedNodes.has(service.uuid);
        if (serviceFunctions.length <= SHOW_ALL_THRESHOLD || isExpanded) {
            return { visible: serviceFunctions, hidden: [] };
        }
        return { visible: serviceFunctions.slice(0, PREVIEW_COUNT), hidden: serviceFunctions.slice(PREVIEW_COUNT) };
    }

    // GraphQL: compute per-group visibility
    const grouped = serviceFunctions.reduce((acc, fn) => {
        const accessor = (fn as CDResourceFunction).accessor;
        const name = (fn as CDFunction).name;
        const group = getGraphQLGroupLabel(accessor, name);
        if (!group) return acc;
        (acc[group] ||= []).push(fn);
        return acc;
    }, {} as Record<GroupKey, Array<CDFunction | CDResourceFunction>>);

    const visible: Array<CDFunction | CDResourceFunction> = [];
    const hidden: Array<CDFunction | CDResourceFunction> = [];

    (Object.keys(grouped) as GroupKey[]).forEach((group) => {
        const items = grouped[group];
        const groupExpanded = expandedNodes.has(service.uuid + group);
        if (items.length <= SHOW_ALL_THRESHOLD || groupExpanded) {
            visible.push(...items);
        } else {
            visible.push(...items.slice(0, PREVIEW_COUNT));
            hidden.push(...items.slice(PREVIEW_COUNT));
        }
    });

    return { visible, hidden };
}
