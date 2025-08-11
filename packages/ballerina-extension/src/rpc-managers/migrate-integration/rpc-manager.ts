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
 *
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    GetMigrationToolsResponse,
    ImportIntegrationResponse,
    ImportIntegrationRequest,
    ImportIntegrationRPCRequest,
    MigrateIntegrationAPI,
} from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";
import { getUsername, sanitizeName } from "../../utils/bi";
import { pullMigrationTool } from "../../utils/migrate-integration";

export class MigrateIntegrationRpcManager implements MigrateIntegrationAPI {
    async pullMigrationTool(args: { toolName: string }): Promise<void> {
        try {
            await pullMigrationTool(args.toolName);
        } catch (error) {
            console.error(`Failed to pull migration tool '${args.toolName}':`, error);
            throw error;
        }
    }

    async importIntegration(params: ImportIntegrationRPCRequest): Promise<ImportIntegrationResponse> {
        const orgName = getUsername();
        const langParams: ImportIntegrationRequest = {
            orgName: orgName,
            packageName: sanitizeName(params.packageName),
            sourcePath: params.sourcePath,
        };
        StateMachine.langClient().registerMigrationToolCallbacks();
        switch (params.commandName) {
            case "migrate-tibco":
                return StateMachine.langClient().importTibcoToBI(langParams);
            case "migrate-mule":
                return StateMachine.langClient().importMuleToBI(langParams);
            default:
                console.error(`Unsupported integration type: ${params.commandName}`);
                throw new Error(`Unsupported integration type: ${params.commandName}`);
        }
    }

    async getMigrationTools(): Promise<GetMigrationToolsResponse> {
        return StateMachine.langClient().getMigrationTools();
    }
}
