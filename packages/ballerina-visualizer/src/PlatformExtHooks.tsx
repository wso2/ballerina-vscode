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
import { usePlatformExtContext } from './utils/PlatformExtContext';

export const PlatformExtHookKeys = {
    isLoggedIn: ["isLoggedIn"],
    getProjectPath: ["projectPath"],
    getProjectToml: ["projectToml"],
}

// todo: try moving this to context
export const PlatformExtHooks = {
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
        const { platformExtState } = usePlatformExtContext();

        const { data: componentConnections = [], isLoading: isLoadingComponentConnections, refetch: refetchComponentConn } = useQuery({
            queryKey: [
                "componentConnections",
                { component: platformExtState?.selectedComponent?.metadata?.id, project: platformExtState?.selectedContext?.project?.id },
            ],
            queryFn: () => rpcClient.getPlatformRpcClient().getConnections({
                componentId: platformExtState?.selectedComponent?.metadata?.id,
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                projectId: platformExtState?.selectedContext?.project?.id
            }),
            enabled: !!platformExtState?.selectedComponent,
        });

        const { data: projectConnections = [], isLoading: isLoadingProjectConnections, refetch: refetchProjectConn } = useQuery({
            queryKey: [
                "projectConnections",
                { project: platformExtState?.selectedContext?.project?.id },
            ],
            queryFn: () => rpcClient.getPlatformRpcClient().getConnections({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                projectId: platformExtState?.selectedContext?.project?.id,
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
    }
}

