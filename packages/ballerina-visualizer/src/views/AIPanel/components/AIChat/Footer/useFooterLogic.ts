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

import { Command } from "@wso2/ballerina-core";
import { Tag } from "../../../commandTemplates/models/tag.model";
import { injectTags } from "../../../commandTemplates/utils/utils";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";

interface UseFooterLogicParams {
    rpcClient: BallerinaRpcClient;
}

export const useFooterLogic = ({
    rpcClient,
}: UseFooterLogicParams) => {

    const loadGeneralTags = async (): Promise<Tag[]> => {
        return [
            {
                display: "@test",
                value: "test",
                kind: "general",
            },
            {
                display: "@second",
                value: "second",
                kind: "general",
            },
        ];
    };

    const injectPlaceholderTags = async (): Promise<void> => {
        // === Command.Tests ===
        const serviceNames = (await rpcClient.getAiPanelRpcClient().getServiceNames()).mentions;
        injectTags(
            Command.Tests,
            "tests-for-service",
            "servicename",
            serviceNames.map((serviceName) => ({
                display: `@${serviceName}`,
                value: serviceName,
                injected: true,
                kind: "placeholder-specific",
            }))
        );

        const resourceNames = (await rpcClient.getAiPanelRpcClient().getResourceMethodAndPaths()).mentions;
        injectTags(
            Command.Tests,
            "tests-for-function",
            "methodPath",
            resourceNames.map((resourceName) => ({
                display: `@${resourceName}`,
                value: resourceName,
                injected: true,
                kind: "placeholder-specific",
            }))
        );

        // === Command.DataMap ===
        const recordNames = (await rpcClient.getBIDiagramRpcClient().getRecordNames()).mentions;
        const recordTags: Tag[] = recordNames.map((recordName) => ({
            display: `@${recordName}`,
            value: recordName,
            injected: true,
            kind: "placeholder-specific",
        }));
        injectTags(Command.DataMap, "mappings-for-records", "inputRecords", recordTags);
        injectTags(Command.DataMap, "mappings-for-records", "outputRecord", recordTags);

        const functionNames = (await rpcClient.getBIDiagramRpcClient().getFunctionNames()).mentions;
        injectTags(
            Command.DataMap,
            "mappings-for-function",
            "functionName",
            functionNames.map((functionName) => ({
                display: `@${functionName}`,
                value: functionName,
                injected: true,
                kind: "placeholder-specific",
            }))
        );
    };

    return {
        loadGeneralTags,
        injectPlaceholderTags,
    };
};
