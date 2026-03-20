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

import { BINodeTemplateRequest, BINodeTemplateResponse } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useProjectStructure } from "../ProjectStructureContext";

/**
 * Returns a wrapped version of `getNodeTemplate` that automatically resolves
 * and injects the `isLibrary` flag based on the current project's Ballerina.toml
 * and project structure. Use this everywhere in the visualizer instead of calling
 * `rpcClient.getBIDiagramRpcClient().getNodeTemplate()` directly.
 */
export function useGetNodeTemplate(): (params: Omit<BINodeTemplateRequest, "isLibrary">) => Promise<BINodeTemplateResponse> {
    const { rpcClient } = useRpcContext();
    const { projectStructure } = useProjectStructure();

    return async (params: Omit<BINodeTemplateRequest, "isLibrary">) => {
        const tomlValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
        const projectName = tomlValues?.package?.name || '';
        const currentProject = projectStructure?.projects?.find((project) => project.projectName === projectName);
        const isLibrary = currentProject?.isLibrary ?? false;

        return rpcClient.getBIDiagramRpcClient().getNodeTemplate({ ...params, isLibrary });
    };
}
