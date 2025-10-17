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
import {  FlowNode, PlatformExtAPI, UpdateConfigVariableRequestV2 } from "@wso2/ballerina-core";
import { extensions, window } from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ComponentDisplayType, ComponentKind, ConnectionListItem, ContextItemEnriched, GetConnectionsReq, GetMarketplaceIdlReq, GetMarketplaceListReq, getTypeForDisplayType, IWso2PlatformExtensionAPI, MarketplaceIdlResp, MarketplaceListResp } from "@wso2/wso2-platform-core";
import { log } from "../../utils/logger";
import { CreateDevantConnectionReq } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { BiDiagramRpcManager } from "../bi-diagram/rpc-manager";
import * as toml from "@iarna/toml";
import { StateMachine } from "../../stateMachine";
import { CommonRpcManager } from "../common/rpc-manager";

export class PlatformExtRpcManager implements PlatformExtAPI {
    private async getPlatformExt() {
        const platformExt = extensions.getExtension("wso2.wso2-platform");
        if (!platformExt) {
            throw new Error("platform ext not installed");
        }
        if(!platformExt.isActive){
            await platformExt.activate();
        }
        const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
        return platformExtAPI;
    }

    async isLoggedIn(): Promise<boolean> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.isLoggedIn();
        } catch (err) {
            log(`Failed to invoke isLoggedIn: ${err}`);
        }
    }

    async getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getMarketplaceItems(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceItems: ${err}`);
        }
    }

    async getSelectedContext(): Promise<ContextItemEnriched | undefined> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getSelectedContext() || null;
        } catch (err) {
            log(`Failed to invoke getMarketplaceItems: ${err}`);
        }
    }

    async getDirectoryComponents(fsPath: string): Promise<ComponentKind[]> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getDirectoryComponents(fsPath) || [];
        } catch (err) {
            log(`Failed to invoke getDirectoryComponents: ${err}`);
        }
    }
    
    async getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getMarketplaceIdl(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceIdl: ${err}`);
        }
    }

    async getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getConnections(params);
        } catch (err) {
            log(`Failed to invoke getConnections: ${err}`);
        }
    }

    async createDevantComponentConnection(params: CreateDevantConnectionReq): Promise<string> {
        try {
            const platformExt = await this.getPlatformExt();

            const createdConnection = await platformExt.createComponentConnection({
                componentId: params.component.metadata?.id,
            	name: params.params.name,
            	orgId: params.org.id?.toString(),
            	orgUuid: params.org.uuid,
            	projectId: params.project.id,
            	serviceSchemaId: params.params.schemaId,
            	serviceId: params.marketplaceItem.serviceId,
            	serviceVisibility: params.params.visibility!,
            	componentType: getTypeForDisplayType(params.component?.spec?.type),
            	componentPath: params.componentDir,
            	generateCreds: params.component?.spec?.type !== ComponentDisplayType.ByocWebAppDockerLess,
            });

            await platformExt.createConnectionConfig({
                componentDir: params.componentDir,
                marketplaceItem: params.marketplaceItem,
                name: params.params.name,
                visibility: params.params.visibility
            });

            const serviceIdl = await platformExt.getMarketplaceIdl({
                orgId: params.org.id?.toString(),
                serviceId: params.marketplaceItem.serviceId
            });

            const choreoDir = path.join(params.componentDir, '.choreo');
            if (!fs.existsSync(choreoDir)) {
                fs.mkdirSync(choreoDir, { recursive: true });
            }

            const moduleName = params.params.name.replace(/[_\-\s]/g, "");
            const filePath = path.join(choreoDir, `${moduleName}-spec.yaml`);

            if(serviceIdl?.idlType === "OpenAPI" && serviceIdl.content){
                fs.writeFileSync(filePath, serviceIdl.content, 'utf8');
            } else {
                window.showErrorMessage("Client creation for connection is only supported for REST APIs with valid openAPI spec");
                return "";
            }

            // Generate Bal client
            const diagram = new BiDiagramRpcManager();
            const common = new CommonRpcManager();
            await diagram.generateOpenApiClient({
                module: moduleName,
                openApiContractPath: filePath,
                projectPath: params.componentDir
            });

            // Update bal.toml with created connection reference
            const balTomlPath = path.join(params.componentDir, "Ballerina.toml");
            if(fs.existsSync(balTomlPath)){
                const fileContent = fs.readFileSync(balTomlPath, "utf-8");
                const parsedToml: any = toml.parse(fileContent);
                const matchingItem = parsedToml?.tool.openapi.find(item=>item.id === moduleName);
                if (matchingItem) {
                    matchingItem.devantConnection = params.params?.name;
                }
                const updatedTomlContent = toml.stringify(parsedToml);
                fs.writeFileSync(balTomlPath, updatedTomlContent, "utf-8");
            }

            // add ballerina/os import
            // following not working
            // const updateImports = await diagram.updateImports({
            //     filePath: path.join(StateMachine.context().projectUri, "config.bal"),
            //     importStatement: "import ballerina/os;"
            // })
            // console.log("updateImports", updateImports)

            // create necessary config
            const newConfigNode = await diagram.getConfigVariableNodeTemplate({isNew: true, isEnvVariable: true})

            const newNode: FlowNode = {
                ...newConfigNode?.flowNode,
                codedata: { ...newConfigNode?.flowNode?.codedata, lineRange:{ "startLine":{"line":0,"offset":0},"endLine":{"line":0,"offset":0}} as any},
                properties: {
                    ...newConfigNode?.flowNode?.properties,
                    // defaultValue: { ...newConfigNode?.flowNode?.properties?.defaultValue, value: `os:getEnv(\"new_env\")`, modified: true },
                    defaultValue: { ...newConfigNode?.flowNode?.properties?.defaultValue, value: "?", modified: true },
                    type: { ...newConfigNode?.flowNode?.properties?.type, value: "string", modified: true },
                    variable: { ...newConfigNode?.flowNode?.properties?.variable, value: "connectionConfigName2", modified: true },
                }
            }

            const tomValues = await common.getCurrentProjectTomlValues();

            const req: UpdateConfigVariableRequestV2 = {
                configVariable: newNode,
                configFilePath: path.join(StateMachine.context().projectUri, "config.bal"),
                packageName: `${tomValues?.package.org}/${tomValues?.package.name}`,
                moduleName: "",
            }

            const resp = await diagram.updateConfigVariablesV2(req)

            return "";
        } catch (err) {
            window.showErrorMessage("Failed to created Devant connection")
            log(`Failed to invoke createDevantComponentConnection: ${err}`);
        }
    }
}
