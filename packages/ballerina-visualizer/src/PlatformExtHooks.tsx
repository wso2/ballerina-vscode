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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRpcContext } from '@wso2/ballerina-rpc-client';

export const PlatformExtHookKeys = {
    isLoggedIn: ["isLoggedIn"],
    getProjectPath: ["projectPath"],
    getProjectToml: ["projectToml"],
}

// todo: try moving this to context
export const PlatformExtHooks = {
    isLoggedIn: ()=>{
        const { rpcClient } = useRpcContext();
        const { data: isLoggedIn } = useQuery({
            queryKey: PlatformExtHookKeys.isLoggedIn,
            queryFn: () => rpcClient.getPlatformRpcClient().isLoggedIn(),
            refetchInterval: 2000,
        });
        return isLoggedIn
    },
    getProjectPath: ()=>{
        const { rpcClient } = useRpcContext();
        const { data: projectPath } = useQuery({
                queryKey: PlatformExtHookKeys.getProjectPath,
                queryFn: () => rpcClient.getVisualizerLocation(),
            });
        return projectPath?.projectUri;
    },
    getProjectToml: ()=>{
        const { rpcClient } = useRpcContext();
        const { data: projectToml, refetch: refetchToml } = useQuery({
                queryKey: PlatformExtHookKeys.getProjectToml,
                queryFn: () => rpcClient.getCommonRpcClient().getCurrentProjectTomlValues()
            });
        return { projectToml, refetchToml };
    },
    getAllConnections: ()=>{
        const { rpcClient } = useRpcContext();
        const component = PlatformExtHooks.getDirectoryComp()
        const selected = PlatformExtHooks.getSelectedContext()

        const { data: componentConnections = [], isLoading: isLoadingComponentConnections, refetch: refetchComponentConn } = useQuery({
            queryKey: [
                "componentConnections",
                { component: component?.metadata?.id, project: selected?.project?.id },
            ],
            queryFn: () => rpcClient.getPlatformRpcClient().getConnections({
                componentId: component?.metadata?.id,
                orgId:selected?.org?.id?.toString(),
                projectId: selected?.project?.id
            }),
            enabled: !!component,
        });

        const { data: projectConnections = [], isLoading: isLoadingProjectConnections, refetch: refetchProjectConn } = useQuery({
            queryKey: [
                "projectConnections",
                { project: selected?.project?.id },
            ],
            queryFn: () => rpcClient.getPlatformRpcClient().getConnections({
                orgId:selected?.org?.id?.toString(),
                projectId: selected?.project?.id,
                componentId: ""
            }),
        });
        return { 
            isLoadingConnections: isLoadingComponentConnections || isLoadingProjectConnections, 
            connections: [...componentConnections, ...projectConnections],
            refetchConnections: async () => {
                refetchComponentConn();
                refetchProjectConn();
            }
        }
    },
    getSelectedContext: ()=>{
        const { rpcClient } = useRpcContext();
        const isLoggedIn = PlatformExtHooks.isLoggedIn()

        const { data: selected } = useQuery({
            queryKey: ["devant-context", isLoggedIn],
            queryFn: () => rpcClient.getPlatformRpcClient().getSelectedContext(),
            enabled: !!isLoggedIn,
            refetchInterval: 2000,
        });
        return selected
    },
    getDirectoryComp: ()=>{
        const { rpcClient } = useRpcContext();
        const isLoggedIn = PlatformExtHooks.isLoggedIn()
        const projectPath = PlatformExtHooks.getProjectPath();
        const selected = PlatformExtHooks.getSelectedContext()

        const { data: directoryComponent } = useQuery({
            queryKey: [
                "getDirectoryComponent",
                { isLoggedIn, org: selected?.org?.uuid, project: selected?.project?.id, projectPath },
            ],
            queryFn: () => rpcClient.getPlatformRpcClient().getDirectoryComponent(projectPath),
            enabled: isLoggedIn && !!projectPath,
            refetchInterval: 2000,
        });
        return directoryComponent
    }
}

