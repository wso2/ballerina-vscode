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

import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
    DIRECTORY_MAP,
    findDevantScopeByModule,
    PackageTomlValues,
} from "@wso2/ballerina-core";
import { PlatformExtState } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PlatformExtRpcClient } from "@wso2/ballerina-rpc-client/lib/rpc-clients/platform-ext/platform-ext-client";
import { DevantScopes } from "@wso2/wso2-platform-core";
import React, { useContext, FC, ReactNode, useEffect, useMemo } from "react";

const defaultPlatformExtContext: {
    platformExtState: PlatformExtState | null;
    projectPath: string;
    workspacePath: string;
    projectToml?: { values: PackageTomlValues; refresh: () => void };
    platformRpcClient?: PlatformExtRpcClient;
    deployableArtifacts?: { exists: boolean, refetch: () => void }
} = {
    platformExtState: { components: [], isLoggedIn: false },
    projectPath: "",
    workspacePath: "",
};

const PlatformExtContext = React.createContext(defaultPlatformExtContext);

export const usePlatformExtContext = () => {
    return useContext(PlatformExtContext) || defaultPlatformExtContext;
};

export const PlatformExtContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { rpcClient } = useRpcContext();
    const platformRpcClient = rpcClient.getPlatformRpcClient();

    const { data: visualizerLocation = { projectPath: "", workspacePath: "" } } = useQuery({
        queryKey: ["project-paths"],
        queryFn: () => rpcClient.getVisualizerLocation(),
        select: (data) => ({ projectPath: data.projectPath, workspacePath: data.workspacePath}),
        refetchOnWindowFocus: true,
    });

    const { data: projectToml, refetch: refetchToml } = useQuery({
        queryKey: ["project-toml", visualizerLocation.projectPath],
        queryFn: () => rpcClient.getCommonRpcClient().getCurrentProjectTomlValues(),
        refetchOnWindowFocus: true,
    });

    const { data: hasArtifacts, refetch: refetchHasArtifacts } = useQuery({
        queryKey: ["has-artifacts", visualizerLocation.projectPath],
        queryFn: () => rpcClient.getBIDiagramRpcClient().getProjectStructure(),
        select: (projectStructure) => {
            if (!projectStructure) return false;

            const project = projectStructure.projects.find(project => project.projectPath === visualizerLocation.projectPath);
            if (!project) return false;

            const services = project.directoryMap[DIRECTORY_MAP.SERVICE] ?? [];
            const automation = project.directoryMap[DIRECTORY_MAP.AUTOMATION] ?? [];

            const hasAutomation = automation.length > 0;
            const hasServiceScopes = services
                .map((s) => findDevantScopeByModule(s?.moduleName))
                .some(Boolean);

            return hasAutomation || hasServiceScopes;
        },
        refetchOnWindowFocus: true,
    });

    const { data: platformExtState } = useQuery({
        queryKey: ["platform-ext-state"],
        queryFn: () => platformRpcClient.getPlatformStore(),
    });

    useEffect(() => {
        platformRpcClient?.onPlatformExtStoreStateChange((state) => {
            queryClient.setQueryData(["platform-ext-state"], state);
        });
    }, []);

    return (
        <PlatformExtContext.Provider
            value={{
                platformExtState: {
                    ...platformExtState,
                    selectedContext: platformExtState?.isLoggedIn ? platformExtState.selectedContext : undefined,
                    selectedComponent: platformExtState?.isLoggedIn ? platformExtState.selectedComponent : undefined,
                    components: platformExtState?.isLoggedIn ? platformExtState.components : [],
                    connections: platformExtState?.isLoggedIn ? platformExtState.connections : [],
                },
                deployableArtifacts: { exists: hasArtifacts, refetch: refetchHasArtifacts },
                workspacePath: visualizerLocation.workspacePath,
                projectPath: visualizerLocation.projectPath,
                platformRpcClient,
                projectToml: { values: projectToml, refresh: refetchToml },
            }}
        >
            {children}
        </PlatformExtContext.Provider>
    );
};
