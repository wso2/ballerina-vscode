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
import { onPlatformExtStoreStateChange, PlatformExtAPI, SyntaxTree, TomlValues } from "@wso2/ballerina-core";
import { extensions, Uri, window } from "vscode";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
    ComponentDisplayType,
    ConnectionListItem,
    DeleteLocalConnectionsConfigReq,
    GetConnectionsReq,
    GetMarketplaceIdlReq,
    GetMarketplaceItemReq,
    GetMarketplaceListReq,
    getTypeForDisplayType,
    IWso2PlatformExtensionAPI,
    MarketplaceIdlResp,
    MarketplaceItem,
    MarketplaceListResp,
    ServiceInfoVisibilityEnum,
    GetConnectionItemReq,
    StartProxyServerResp,
    StopProxyServerReq,
} from "@wso2/wso2-platform-core";
import { log } from "../../utils/logger";
import {
    CreateDevantConnectionReq,
    CreateDevantConnectionResp,
    ImportDevantConnectionReq,
    ImportDevantConnectionResp,
} from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import * as toml from "@iarna/toml";
import { StateMachine } from "../../stateMachine";
import { CommonRpcManager } from "../common/rpc-manager";
import { CaptureBindingPattern, ModulePart, ModuleVarDecl, STKindChecker } from "@wso2/syntax-tree";
import { DeleteBiDevantConnectionReq } from "./types";
import { platformExtStore } from "./platform-store";
import { Messenger } from "vscode-messenger";
import { VisualizerWebview } from "../../views/visualizer/webview";
import { initializeDevantConnection } from "./platform-utils";

export class PlatformExtRpcManager implements PlatformExtAPI {
    private async getPlatformExt() {
        const platformExt = extensions.getExtension("wso2.wso2-platform");
        if (!platformExt) {
            throw new Error("platform ext not installed");
        }
        if (!platformExt.isActive) {
            await platformExt.activate();
        }
        const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
        await platformExtAPI.waitUntilInitialized();
        return platformExtAPI;
    }

    public async initStateSubscription(messenger: Messenger) {
        await platformExtStore.persist.rehydrate();

        const platformExt = await this.getPlatformExt();

        const isLoggedIn = platformExt.isLoggedIn();
        const components = platformExt.getDirectoryComponents(StateMachine.context().projectUri);
        const selectedContext = platformExt.getSelectedContext();

        platformExtStore
            .getState()
            .setState({ isLoggedIn, components, selectedContext, selectedComponent: components[0] });

        await this.refreshConnectionList();

        platformExt.subscribeIsLoggedIn((isLoggedIn) => {
            platformExtStore.getState().setState({ isLoggedIn });
        });
        platformExt.subscribeDirComponents(StateMachine.context().projectUri, (components) => {
            // todo: directory component must be picked by the user
            platformExtStore.getState().setState({ components, selectedComponent: components[0] });
        });
        platformExt.subscribeContextState((selectedContext) => {
            platformExtStore.getState().setState({ selectedContext });
        });

        // todo: move devant related initializers here

        platformExtStore.subscribe((state, prevState) => {
            messenger.sendNotification(
                onPlatformExtStoreStateChange,
                { type: "webview", webviewType: VisualizerWebview.viewType },
                state.state
            );

            let refetchConnections = false;
            if(!state.state?.isLoggedIn && prevState?.state?.isLoggedIn){
                // if user is logging out
                // todo: check if this needs to be enabled again
                // platformExtStore.getState().setState({connections: []});
            } else if(state.state?.selectedComponent && state.state?.selectedComponent.metadata?.id !== prevState?.state?.selectedComponent?.metadata?.id){
                // if component selection has changed
                // todo: remove connections related to previous component
                // todo: test after applying fix to support multiple components
                // platformExtStore.getState().setState({connections: platformExtStore.getState().state?.connections?.filter(item=>item.componentId)});
                refetchConnections = true;
            } else if(state.state?.selectedContext?.project && state.state?.selectedContext?.project?.id !== prevState.state?.selectedContext?.project?.id){
                // if project selection has changed
                platformExtStore.getState().setState({connections: []});
                refetchConnections = true;
            }

            if(refetchConnections){
                this.refreshConnectionList();
            }
        });
    }

    // todo: check and delete unused rpc functions
    async getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getMarketplaceItems(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceItems: ${err}`);
        }
    }

    async getMarketplaceItem(params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getMarketplaceItem(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceItem: ${err}`);
        }
    }

    async getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getMarketplaceIdl(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceIdl: ${err}`);
        }
    }

    async getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getConnections(params);
        } catch (err) {
            log(`Failed to invoke getConnections: ${err}`);
        }
    }

    async getConnection(params: GetConnectionItemReq): Promise<ConnectionListItem> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getConnection(params);
        } catch (err) {
            log(`Failed to invoke getConnection: ${err}`);
        }
    }

    async deleteLocalConnectionsConfig(params: DeleteLocalConnectionsConfigReq): Promise<void> {
        try {
            const platformExt = await this.getPlatformExt();
            platformExt?.deleteLocalConnectionsConfig(params);
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async getDevantConsoleUrl(): Promise<string> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.getDevantConsoleUrl();
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async stopProxyServer(params: StopProxyServerReq): Promise<void> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.stopProxyServer(params);
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async refreshConnectionList(): Promise<void> {
        try {
            const connections = await this.getAllConnections();
            platformExtStore.getState().setState({ connections });
        } catch (err) {
            log(`Failed to refresh connection list: ${err}`);
        }
    }

    async getAllConnections(): Promise<ConnectionListItem[]> {
        try {
            const platformExt = await this.getPlatformExt();
            if(platformExtStore.getState().state.isLoggedIn && platformExtStore.getState().state.selectedContext?.project?.id){
                const projectPromise = platformExt.getConnections({
                    orgId: platformExtStore.getState().state.selectedContext?.org?.id?.toString(),
                    projectId: platformExtStore.getState().state.selectedContext?.project?.id,
                    componentId: "",
                });

                const componentPromise: Promise<ConnectionListItem[]> = platformExtStore.getState().state
                    .selectedComponent
                    ? platformExt.getConnections({
                          orgId: platformExtStore.getState().state.selectedContext?.org?.id?.toString(),
                          projectId: platformExtStore.getState().state.selectedContext?.project?.id,
                          componentId: platformExtStore.getState().state.selectedComponent?.metadata?.id,
                      })
                    : Promise.resolve([]);

                const [projectConnections, componentConnections] = await Promise.all([
                    projectPromise,
                    componentPromise,
                ]);

                return [...componentConnections, ...projectConnections];
            }
            return [];
        } catch (err) {
            log(`Failed to get all connections: ${err}`);
        }
    }

    async startProxyServer(): Promise<StartProxyServerResp & { requiresProxy: boolean }> {
        // todo: need to take in params from config
        try {
            const platformExt = await this.getPlatformExt();
            const configBalFile = path.join(StateMachine.context().projectUri, "config.bal");
            const configBalFileUri = Uri.file(configBalFile);
            const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
                documentIdentifier: { uri: configBalFileUri.toString() },
            })) as SyntaxTree;
            let requiresProxy = false;
            if (
                (syntaxTree?.syntaxTree as ModulePart)?.members?.find(
                    (member) =>
                        STKindChecker.isModuleVarDecl(member) &&
                        (member.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value ===
                            "devantProxyConfig"
                )
            ) {
                requiresProxy = true;
            }
            if (platformExtStore.getState().state?.isLoggedIn) {
                const selected = platformExtStore.getState().state?.selectedContext;
                if (selected?.org && selected?.project) {
                    const resp = await platformExt?.startProxyServer({
                        orgId: selected?.org?.id?.toString(),
                        project: selected?.project?.id,
                        component: platformExtStore.getState().state?.selectedComponent?.metadata?.id || "",
                    });
                    return { ...resp, requiresProxy };
                }
            }
            return { envVars: {}, proxyServerPort: 0, requiresProxy };
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async deleteBiDevantConnection(params: DeleteBiDevantConnectionReq): Promise<void> {
        try {
            StateMachine.setEditMode();
            const platformExt = await this.getPlatformExt();
            const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
                documentIdentifier: { uri: Uri.file(params.filePath).toString() },
            })) as SyntaxTree;

            const matchingConnection = (syntaxTree.syntaxTree as ModulePart)?.members?.find((member) => {
                return (
                    member.position?.startLine === params?.startLine &&
                    member.position?.startColumn === params?.startColumn &&
                    member.position?.endLine === params?.endLine &&
                    member.position?.endColumn === params?.endColumn
                );
            });

            if (matchingConnection) {
                const moduleName: string = (matchingConnection as ModuleVarDecl)?.initializer?.typeData?.typeSymbol
                    ?.moduleID?.moduleName;
                const balPackage = StateMachine.context().package;
                const tomlValues = await new CommonRpcManager().getCurrentProjectTomlValues();
                const matchingTomlEntry = tomlValues?.tool?.openapi?.find(
                    (item) => `${balPackage}.${item.targetModule}` === moduleName
                );
                if (matchingTomlEntry && matchingTomlEntry?.devantConnection) {
                    const updatedToml: TomlValues = {
                        ...tomlValues,
                        tool: {
                            ...tomlValues?.tool,
                            openapi: tomlValues.tool?.openapi?.filter(
                                (item) => `${balPackage}.${item.targetModule}` !== moduleName
                            ),
                        },
                    };

                    const projectPath = StateMachine.context().projectUri;
                    const balTomlPath = path.join(projectPath, "Ballerina.toml");
                    const updatedTomlContent = toml.stringify(JSON.parse(JSON.stringify(updatedToml)));
                    fs.writeFileSync(balTomlPath, updatedTomlContent, "utf-8");

                    const platformRpc = new PlatformExtRpcManager();
                    const devantUrl = await platformRpc.getDevantConsoleUrl();
                    if (!platformExtStore.getState().state?.isLoggedIn) {
                        window
                            .showErrorMessage(
                                "Unable to delete Devant connection as you are not logged into Devant. please head over to Devant console to delete the Devant connection",
                                "Open Devant"
                            )
                            .then((resp) => {
                                if (resp === "Open Devant") {
                                    vscode.env.openExternal(Uri.parse(devantUrl));
                                }
                            });
                        StateMachine.setReadyMode();
                        return;
                    }
                    const selected = platformExtStore.getState().state?.selectedContext;
                    if (selected?.org && selected?.project) {
                        const projectConnections = await platformRpc.getConnections({
                            orgId: selected?.org?.id?.toString(),
                            projectId: selected?.project?.id,
                            componentId: "",
                        });
                        const matchingProjectConnection = projectConnections.find(
                            (item) => item.name === matchingTomlEntry?.devantConnection
                        );
                        if (matchingProjectConnection) {
                            await platformRpc.deleteLocalConnectionsConfig({
                                componentDir: projectPath,
                                connectionName: matchingTomlEntry?.devantConnection,
                            });
                            window
                                .showInformationMessage(
                                    "In-order to delete your project level Devant connection, please head over to Devant console",
                                    "Open Devant"
                                )
                                .then((resp) => {
                                    if (resp === "Open Devant") {
                                        vscode.env.openExternal(
                                            Uri.parse(
                                                `${devantUrl}/organizations/${selected.org.handle}/projects/${selected.project.id}/admin/connections`
                                            )
                                        );
                                    }
                                });
                            StateMachine.setReadyMode();
                            return;
                        }

                        if (platformExtStore.getState().state?.selectedComponent) {
                            const componentConnections = await platformRpc.getConnections({
                                orgId: selected?.org?.id?.toString(),
                                projectId: selected?.project?.id,
                                componentId: platformExtStore.getState().state?.selectedComponent?.metadata?.id,
                            });
                            const matchingCompConnection = componentConnections.find(
                                (item) => item.name === matchingTomlEntry?.devantConnection
                            );
                            if (matchingCompConnection) {
                                await platformRpc.deleteLocalConnectionsConfig({
                                    componentDir: projectPath,
                                    connectionName: matchingTomlEntry?.devantConnection,
                                });
                                await platformExt.deleteConnection({
                                    componentPath: projectPath,
                                    connectionId: matchingCompConnection.groupUuid,
                                    connectionName: matchingCompConnection.name,
                                    orgId: selected.org.id.toString(),
                                });
                                StateMachine.setReadyMode();
                                return;
                            }
                        }
                    }
                }
            }

            StateMachine.setReadyMode();
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to delete Devant connection");
            log(`Failed to invoke deleteDevantConnection: ${err}`);
        }
    }

    async importDevantComponentConnection(params: ImportDevantConnectionReq): Promise<ImportDevantConnectionResp> {
        try {
            const platformExt = await this.getPlatformExt();
            StateMachine.setEditMode();

            let visibility: ServiceInfoVisibilityEnum = ServiceInfoVisibilityEnum.Public;
            if (params.connectionListItem?.schemaName.toLowerCase()?.includes("organization")) {
                visibility = ServiceInfoVisibilityEnum.Organization;
            } else if (params.connectionListItem?.schemaName.toLowerCase()?.includes("project")) {
                visibility = ServiceInfoVisibilityEnum.Project;
            }

            const connectionItem = await this.getConnection({
                orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                connectionGroupId: params.connectionListItem?.groupUuid,
            });

            const marketplaceItem = await this.getMarketplaceItem({
                orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                serviceId: params?.connectionListItem?.serviceId,
            });

            const resp = await initializeDevantConnection({
                platformExt,
                name: params.connectionListItem.name,
                marketplaceItem: marketplaceItem,
                visibility: visibility,
                configurations: (connectionItem as any)?.configurations,
                securityType: params.connectionListItem?.schemaName?.toLowerCase()?.includes("oauth")
                    ? "oauth"
                    : "apikey",
            });

            StateMachine.setReadyMode();
            return { connectionName: resp.connectionName };
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to import Devant connection");
            log(`Failed to invoke importDevantComponentConnection: ${err}`);
        }
    }

    async createDevantComponentConnection(params: CreateDevantConnectionReq): Promise<CreateDevantConnectionResp> {
        try {
            const platformExt = await this.getPlatformExt();
            StateMachine.setEditMode();
            const projectPath = StateMachine.context().projectUri;

            const createdConnection = await platformExt?.createComponentConnection({
                componentId: platformExtStore.getState().state?.selectedComponent?.metadata?.id,
                name: params.params.name,
                orgId: platformExtStore.getState().state?.selectedContext?.org.id?.toString(),
                orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                projectId: platformExtStore.getState().state?.selectedContext?.project.id,
                serviceSchemaId: params.params.schemaId,
                serviceId: params.marketplaceItem.serviceId,
                serviceVisibility: params.params.visibility!,
                componentType: getTypeForDisplayType(platformExtStore.getState().state?.selectedComponent?.spec?.type),
                componentPath: projectPath,
                generateCreds: platformExtStore.getState().state?.selectedComponent?.spec?.type !== ComponentDisplayType.ByocWebAppDockerLess,
            });

            const resp = await initializeDevantConnection({
                platformExt,
                name: params.params.name,
                marketplaceItem: params.marketplaceItem,
                visibility: params.params.visibility!,
                configurations: createdConnection.configurations,
                securityType: createdConnection?.schemaName?.toLowerCase()?.includes("oauth") ? "oauth" : "apikey",
            });

            StateMachine.setReadyMode();
            return { connectionName: resp.connectionName };
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to create Devant connection");
            log(`Failed to invoke createDevantComponentConnection: ${err}`);
        }
    }
}
