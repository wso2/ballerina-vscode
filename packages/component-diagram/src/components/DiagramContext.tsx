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

import React from "react";
import { CDListener, CDModel, CDService } from "@wso2/ballerina-core";
import { CDAutomation } from "@wso2/ballerina-core";
import { CDConnection } from "@wso2/ballerina-core";
import { CDFunction, CDResourceFunction } from "@wso2/ballerina-core";
export interface DiagramContextState {
    project: CDModel;
    expandedNodes: Set<string>; // Track which nodes are expanded by their UUID
    graphQLGroupOpen?: Record<string, { Query: boolean; Subscription: boolean; Mutation: boolean }>;
    readonly?: boolean;
    onListenerSelect: (listener: CDListener) => void;
    onServiceSelect: (service: CDService) => void;
    onFunctionSelect: (func: CDFunction | CDResourceFunction) => void;
    onAutomationSelect: (automation: CDAutomation) => void;
    onConnectionSelect: (connection: CDConnection) => void;
    onDeleteComponent: (component: CDListener | CDService | CDAutomation | CDConnection, nodeType?: string) => void;
    onToggleNodeExpansion: (nodeId: string) => void; // Toggle expansion state of a node
    onToggleGraphQLGroup?: (serviceUuid: string, group: "Query" | "Subscription" | "Mutation") => void;
}

export const DiagramContext = React.createContext<DiagramContextState>({
    project: { connections: [], listeners: [], services: [] },
    expandedNodes: new Set(),
    graphQLGroupOpen: {},
    readonly: false,
    onListenerSelect: () => {},
    onServiceSelect: () => {},
    onFunctionSelect: () => {},
    onAutomationSelect: () => {},
    onConnectionSelect: () => {},
    onDeleteComponent: () => {},
    onToggleNodeExpansion: () => {},
    onToggleGraphQLGroup: () => {},
});

export const useDiagramContext = () => React.useContext(DiagramContext);

export function DiagramContextProvider(props: { children: React.ReactNode; value: DiagramContextState }) {
    // add node states
    // enrich context with optional states
    const ctx = {
        ...props.value,
    };

    return <DiagramContext.Provider value={ctx}>{props.children}</DiagramContext.Provider>;
}
