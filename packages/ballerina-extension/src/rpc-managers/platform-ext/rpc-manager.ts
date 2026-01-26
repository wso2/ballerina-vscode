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
import {
    onPlatformExtStoreStateChange,
    PlatformExtAPI,
    SyntaxTree,
    PackageTomlValues,
    DIRECTORY_MAP,
    findDevantScopeByModule,
    VisualizerLocation,
} from "@wso2/ballerina-core";
import { extensions, Uri, window, WorkspaceEdit } from "vscode";
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
    ConnectionDetailed,
    CommandIds as PlatformExtCommandIds,
    DevantScopes,
    ICreateComponentCmdParams,
    ComponentKind,
    ICmdParamsBase,
    ConnectionConfigurations,
    RegisterMarketplaceConnectionReq,
} from "@wso2/wso2-platform-core";
import { log } from "../../utils/logger";
import {
    CreateDevantConnectionReq,
    CreateDevantConnectionResp,
    DeleteDevantTempConfigReq,
    ImportDevantConnectionReq,
    ImportDevantConnectionResp,
    RegisterAndCreateDevantConnectionReq,
    SetConnectedToDevantReq,
    UpdateDevantTempConfigsReq,
    UpdateDevantTempConfigsResp,
} from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import * as toml from "@iarna/toml";
import { StateMachine } from "../../stateMachine";
import { CommonRpcManager } from "../common/rpc-manager";
import { CaptureBindingPattern, ModulePart, ModuleVarDecl, STKindChecker } from "@wso2/syntax-tree";
import { DeleteBiDevantConnectionReq } from "./types";
import { platformExtStore } from "./platform-store";
import { Messenger } from "vscode-messenger";
import { VisualizerWebview } from "../../views/visualizer/webview";
import { findUniqueConnectionName, getConfigFileUri, getDomain, getInjectedEnvVarNames, hasContextYaml, initializeDevantConnection, Templates } from "./platform-utils";
import { debounce } from "lodash";
import { BiDiagramRpcManager } from "../bi-diagram/rpc-manager";
import { updateSourceCode } from "../../utils";


export class PlatformExtRpcManager implements PlatformExtAPI {
    static platformExtAPI: IWso2PlatformExtensionAPI;
    private async getPlatformExt() {
        if (PlatformExtRpcManager.platformExtAPI) {
            return PlatformExtRpcManager.platformExtAPI;
        }
        const platformExt = extensions.getExtension("wso2.wso2-platform");
        if (!platformExt) {
            throw new Error("platform ext not installed");
        }
        if (!platformExt.isActive) {
            await platformExt.activate();
        }
        const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
        PlatformExtRpcManager.platformExtAPI = platformExtAPI;
        return platformExtAPI;
    }

    private async initAuthState() {
        const platformExt = await this.getPlatformExt();
        const isLoggedIn = platformExt.isLoggedIn();
        const selectedContext = platformExt.getSelectedContext();
        platformExtStore.getState().setState({ isLoggedIn, selectedContext });

        platformExt.subscribeIsLoggedIn((isLoggedIn) => {
            platformExtStore.getState().setState({ isLoggedIn });
        });

        platformExt.subscribeContextState((selectedContext) => {
            platformExtStore.getState().setState({ selectedContext });
        });
    }

    private async initFileWatcher() {
        const platformExt = await this.getPlatformExt();
        const debouncedOnFilChange = debounce(async () => {
            if (StateMachine.context().projectPath) {
                const hasLocalChanges = await platformExt.localRepoHasChanges(StateMachine.context().projectPath);
                platformExtStore.getState().setState({ hasLocalChanges });
            }
        }, 1000);

        if (vscode.workspace.workspaceFolders?.length > 0) {
            const fileWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "**/*")
            );
            fileWatcher.onDidCreate(debouncedOnFilChange);
            fileWatcher.onDidChange(debouncedOnFilChange);
            fileWatcher.onDidDelete(debouncedOnFilChange);
        }
    }

    private async initProjectPathWatcher(projectPath: string) {
        const platformExt = await this.getPlatformExt();
        let components: ComponentKind[] = [];
        let matchingComponent: ComponentKind;
        let hasLocalChanges = false;
        let hasProjectYaml = false;
        if (projectPath) {
            components = platformExt.getDirectoryComponents(projectPath);
            matchingComponent = components.find(
                (item) => platformExtStore.getState().state?.selectedComponent?.metadata?.id === item.metadata?.id
            );
            hasLocalChanges = await platformExt.localRepoHasChanges(projectPath);
            hasProjectYaml = hasContextYaml(projectPath);
            await this.debouncedRefreshConnectionList();
        }

        platformExtStore.getState().setState({
            components,
            selectedComponent: matchingComponent || components[0],
            hasLocalChanges,
            hasPossibleComponent: components.length > 0 || hasProjectYaml,
        });

        const unsubscribeDirCompWatcher = platformExt.subscribeDirComponents(projectPath, (components) => {
            const hasProjectYaml = hasContextYaml(projectPath);
            const matchingComponent = components.find(
                (item) => platformExtStore.getState().state?.selectedComponent?.metadata?.id === item.metadata?.id
            );
            platformExtStore.getState().setState({
                components,
                selectedComponent: matchingComponent || components[0],
                hasPossibleComponent: components.length > 0 || hasProjectYaml,
            });
        });
        return unsubscribeDirCompWatcher;
    }

    private async initSelfStoreSubscription(messenger: Messenger) {
        platformExtStore.subscribe((state, prevState) => {
            messenger.sendNotification(
                onPlatformExtStoreStateChange,
                { type: "webview", webviewType: VisualizerWebview.viewType },
                state.state
            );

            let refetchConnections = false;
            if (!state.state?.isLoggedIn && prevState?.state?.isLoggedIn) {
                // if user is logging out
                // todo: check if this needs to be enabled again
                // platformExtStore.getState().setState({connections: []});
            } else if (
                state.state?.selectedComponent &&
                state.state?.selectedComponent.metadata?.id !== prevState?.state?.selectedComponent?.metadata?.id
            ) {
                // if component selection has changed
                // todo: remove connections related to previous component
                // todo: test after applying fix to support multiple components
                // platformExtStore.getState().setState({connections: platformExtStore.getState().state?.connections?.filter(item=>item.componentId)});
                refetchConnections = true;
            } else if (
                state.state?.selectedContext?.project &&
                state.state?.selectedContext?.project?.id !== prevState.state?.selectedContext?.project?.id
            ) {
                // if project selection has changed
                platformExtStore.getState().setConnectionState({ list: [] });
                refetchConnections = true;
            }

            if (refetchConnections) {
                this.debouncedRefreshConnectionList();
            }
        });
    }

    public async initStateSubscription(messenger: Messenger) {
        await platformExtStore.persist.rehydrate();
        await this.initAuthState();
        let projectPath = StateMachine.context()?.projectPath;
        let disposeProjectPathWatcher = await this.initProjectPathWatcher(projectPath);
        if (projectPath) {
            this.debouncedRefreshConnectionList();
        }
        await this.initFileWatcher();
        const debouncedInitProjectPathWatcher = debounce(
            async (projectPath: string) => await this.initProjectPathWatcher(projectPath),
            250
        );
        StateMachine.service().subscribe(async (state) => {
            if (state.context?.projectPath && state.context?.projectPath !== projectPath) {
                projectPath = state.context?.projectPath;
                if (disposeProjectPathWatcher) {
                    disposeProjectPathWatcher();
                }

                disposeProjectPathWatcher = await debouncedInitProjectPathWatcher(projectPath);
            }
        });

        await this.initSelfStoreSubscription(messenger);
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

    async getConnection(params: GetConnectionItemReq): Promise<ConnectionDetailed> {
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
            return await platformExt?.getDevantConsoleUrl();
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

    setSelectedComponent(componentId: string): void {
        const selectedComponent = platformExtStore
            .getState()
            .state?.components?.find((item) => item.metadata?.id === componentId);
        if (selectedComponent) {
            platformExtStore.getState().setState({ selectedComponent });
        }
    }

    setConnectedToDevant(params: SetConnectedToDevantReq): void {
        if (params.mode === "runInDevant") {
            platformExtStore.getState().setConnectionState({ runInDevant: params.value });
        } else if (params.mode === "debugInDevant") {
            platformExtStore.getState().setConnectionState({ debugInDevant: params.value });
        }
    }

    async registerMarketplaceConnection(params: RegisterMarketplaceConnectionReq): Promise<MarketplaceItem> {
         try {
            const platformExt = await this.getPlatformExt();
            return platformExt?.registerMarketplaceConnection(params);
        } catch (err) {
            log(`Failed to register create marketplace connection: ${err}`);
        }
    }

    async deployIntegrationInDevant(): Promise<void> {
        const projectStructure = await new BiDiagramRpcManager().getProjectStructure();
        if (!projectStructure) {
            return;
        }

        const project = projectStructure.projects.find(
            (project) => project.projectPath === StateMachine.context()?.projectPath
        );
        if (!project) {
            return;
        }

        const services = project.directoryMap[DIRECTORY_MAP.SERVICE];
        const automation = project.directoryMap[DIRECTORY_MAP.AUTOMATION];

        let scopes: DevantScopes[] = [];
        if (services?.length > 0) {
            const svcScopes = services
                .map((svc) => findDevantScopeByModule(svc?.moduleName))
                .filter((svc) => svc !== undefined);
            scopes.push(...Array.from(new Set(svcScopes)));
        }
        if (automation?.length > 0) {
            scopes.push(DevantScopes.AUTOMATION);
        }

        let integrationType: DevantScopes;

        if (scopes.length === 1) {
            integrationType = scopes[0];
        } else if (scopes?.length > 1) {
            const selectedScope = await window.showQuickPick(scopes, {
                placeHolder:
                    "You have multiple artifact types within this project. Select the artifact type to be deployed",
            });
            if (!selectedScope) {
                return;
            }
            integrationType = selectedScope as DevantScopes;
        }

        const deployementParams: ICreateComponentCmdParams = {
            integrationType: integrationType,
            buildPackLang: "ballerina",
            name: path.basename(StateMachine.context().projectPath),
            componentDir: StateMachine.context().projectPath,
            extName: "Devant",
        };
        vscode.commands.executeCommand(PlatformExtCommandIds.CreateNewComponent, deployementParams);
    }

    async getAllConnections(): Promise<ConnectionListItem[]> {
        try {
            const platformExt = await this.getPlatformExt();
            if (
                platformExtStore.getState().state.isLoggedIn &&
                platformExtStore.getState().state.selectedContext?.project?.id
            ) {
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

    async setupDevantProxyForDebugging(debugConfig: vscode.DebugConfiguration): Promise<void> {
        // check if choreoConnect is provided as param, if so use pass those as param
        const devantProxyResp = await this.startProxyServer(debugConfig);

        if (devantProxyResp?.proxyServerPort) {
            debugConfig.env = { ...(debugConfig.env || {}), ...devantProxyResp.envVars };
            if (devantProxyResp.requiresProxy) {
                debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYHOST = "127.0.0.1";
                debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYPORT = `${devantProxyResp.proxyServerPort}`;
            } else {
                delete debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYHOST;
                delete debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYPORT;
            }

            const disposable = vscode.debug.onDidTerminateDebugSession((session) => {
                if (session.configuration === debugConfig) {
                    this.stopProxyServer({ proxyPort: devantProxyResp.proxyServerPort });
                    disposable.dispose();
                }
            });
        }
    }

    async startProxyServer(
        debugConfig: vscode.DebugConfiguration
    ): Promise<StartProxyServerResp & { requiresProxy: boolean }> {
        // todo: need to take in params from config
        try {
            const platformExt = await this.getPlatformExt();
            const configBalFile = path.join(StateMachine.context().projectPath, "config.bal");
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

            if (debugConfig.request === "launch" && debugConfig?.choreoConnect) {
                if (!platformExtStore.getState().state?.isLoggedIn) {
                    window
                        .showErrorMessage(
                            "You must log in before connecting to devant environment. Retry after logging in.",
                            "Login"
                        )
                        .then((res) => {
                            if (res === "Login") {
                                vscode.commands.executeCommand(PlatformExtCommandIds.SignIn, {
                                    extName: "Devant",
                                } as ICmdParamsBase);
                            }
                        });
                    return;
                }

                if (!platformExtStore.getState().state?.selectedContext?.project) {
                    window
                        .showErrorMessage(
                            "Pease associate your directory with Devant project in order to connect to Devant while running or debugging",
                            "Manage Project"
                        )
                        .then((res) => {
                            if (res === "Manage Project") {
                                vscode.commands.executeCommand(PlatformExtCommandIds.ManageDirectoryContext, {
                                    extName: "Devant",
                                } as ICmdParamsBase);
                            }
                        });
                    return;
                }
            }

            if (
                debugConfig.request === "launch" &&
                platformExtStore.getState().state?.isLoggedIn &&
                platformExtStore.getState().state?.selectedContext?.org &&
                platformExtStore.getState().state?.selectedContext?.project &&
                platformExtStore.getState().state?.devantConns?.list?.filter((item) => item.isUsed)?.length > 0 &&
                ((debugConfig?.noDebug && platformExtStore.getState().state?.devantConns?.runInDevant) ||
                    (!debugConfig?.noDebug && platformExtStore.getState().state?.devantConns?.debugInDevant))
            ) {
                // TODO: need to check whether at least one devant connection being used
                const resp = await window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: "Connecting to Devant before running/debugging the application...",
                    },
                    () =>
                        platformExt?.startProxyServer({
                            orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                            project:
                                debugConfig?.choreoConnect?.project ||
                                platformExtStore.getState().state?.selectedContext?.project?.id,
                            component:
                                debugConfig?.choreoConnect?.component ||
                                platformExtStore.getState().state?.selectedComponent?.metadata?.id ||
                                "",
                            env: debugConfig?.choreoConnect?.env || "",
                            skipConnection: debugConfig?.choreoConnect?.skipConnection || [],
                        })
                );
                return { ...resp, requiresProxy };
            }
            return { envVars: {}, proxyServerPort: 0, requiresProxy };
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
            return { envVars: {}, proxyServerPort: 0, requiresProxy: false };
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
                const matchingBalProj = StateMachine.context().projectStructure?.projects?.find(
                    (item) => item.projectPath === StateMachine.context().projectPath
                );
                if (!matchingBalProj) {
                    throw new Error(`Failed to find bal project for :${StateMachine.context().projectPath}`);
                }
                const balPackage = matchingBalProj?.projectName;
                const tomlValues = await new CommonRpcManager().getCurrentProjectTomlValues();
                const matchingTomlEntry = tomlValues?.tool?.openapi?.find(
                    (item) => `${balPackage}.${item.targetModule}` === moduleName
                );
                if (matchingTomlEntry && matchingTomlEntry?.remoteId) {
                    const updatedToml: Partial<PackageTomlValues> = {
                        ...tomlValues,
                        tool: {
                            ...tomlValues?.tool,
                            openapi: tomlValues.tool?.openapi?.filter(
                                (item) => `${balPackage}.${item.targetModule}` !== moduleName
                            ),
                        },
                    };

                    const projectPath = StateMachine.context().projectPath;
                    const balTomlPath = path.join(projectPath, "Ballerina.toml");
                    const updatedTomlContent = toml.stringify(JSON.parse(JSON.stringify(updatedToml)));
                    fs.writeFileSync(balTomlPath, updatedTomlContent, "utf-8");

                    const devantUrl = await this.getDevantConsoleUrl();
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
                    const matchingConnListItem = platformExtStore
                        .getState()
                        .state?.devantConns?.list.find((connItem) => connItem.name === matchingTomlEntry?.remoteId);
                    if (matchingConnListItem) {
                        await this.deleteLocalConnectionsConfig({
                            componentDir: projectPath,
                            connectionName: matchingTomlEntry?.remoteId,
                        });
                        if (matchingConnListItem?.componentId) {
                            await platformExt.deleteConnection({
                                componentPath: projectPath,
                                connectionId: matchingConnListItem.groupUuid,
                                connectionName: matchingConnListItem.name,
                                orgId: selected.org.id.toString(),
                            });
                        } else {
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
                        }
                    }
                }
            }

            this.refreshConnectionList();
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
            if (params.connectionListItem?.schemaName?.toLowerCase()?.includes("organization")) {
                visibility = ServiceInfoVisibilityEnum.Organization;
            } else if (params.connectionListItem?.schemaName?.toLowerCase()?.includes("project")) {
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

            let securityType: "" | "oauth" | "apikey";
            if (marketplaceItem?.isThirdParty) {
                securityType = "";
            } else {
                securityType = params.connectionListItem?.schemaName?.toLowerCase()?.includes("oauth")
                    ? "oauth"
                    : "apikey";
            }

            const resp = await initializeDevantConnection({
                platformExt,
                name: params.connectionListItem.name,
                marketplaceItem: marketplaceItem,
                visibility: visibility,
                configurations: connectionItem?.configurations,
                // todo: handle third party
                securityType,
            });

            StateMachine.setReadyMode();
            this.refreshConnectionList();
            return resp;
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
            const projectPath = StateMachine.context().projectPath;
            const isProjectLevel =
                !!!platformExtStore.getState().state?.selectedComponent?.metadata?.id || params?.params?.isProjectLevel;

            let createdConnection: ConnectionDetailed;
            let securityType: "" | "oauth" | "apikey";
            let configurations: ConnectionConfigurations = {};
            if (params?.marketplaceItem?.isThirdParty) {
                const matchingSchema = params.marketplaceItem.connectionSchemas?.find(
                    (item) => item.id === params.params?.schemaId
                );
                if (!matchingSchema) {
                    throw new Error(`No matching schemes found in marketplace item`);
                }
                if (
                    !params?.marketplaceItem?.endpointRefs ||
                    Object.keys(params?.marketplaceItem?.endpointRefs).length === 0
                ) {
                    throw new Error(`No endpoints found in the third party API item`);
                }

                createdConnection = await platformExt?.createThirdPartyConnection({
                    componentId: isProjectLevel
                        ? ""
                        : platformExtStore.getState().state?.selectedComponent?.metadata?.id,
                    name: params.params.name,
                    orgId: platformExtStore.getState().state?.selectedContext?.org.id?.toString(),
                    orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                    projectId: platformExtStore.getState().state?.selectedContext?.project.id,
                    serviceSchemaId: params.params.schemaId,
                    serviceId: params.marketplaceItem.serviceId,
                    endpointName: Object.keys(params?.marketplaceItem?.endpointRefs)[0],
                    sensitiveKeys: matchingSchema.entries?.filter((item) => item.isSensitive).map((item) => item.name),
                });
                securityType = "";
                Object.keys(createdConnection.configurations).forEach(envId => {
                    configurations[envId] = {
                        ...createdConnection.configurations[envId],
                        entries: {}
                    };
                    Object.keys(createdConnection.configurations[envId].entries).forEach(entryName => {
                        if(params.params.envKeys.includes(entryName)){
                            configurations[envId].entries[entryName] = createdConnection.configurations[envId].entries[entryName];
                        }
                    });
                });
            } else {
                createdConnection = await platformExt?.createComponentConnection({
                    componentId: isProjectLevel
                        ? ""
                        : platformExtStore.getState().state?.selectedComponent?.metadata?.id,
                    name: params.params.name,
                    orgId: platformExtStore.getState().state?.selectedContext?.org.id?.toString(),
                    orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                    projectId: platformExtStore.getState().state?.selectedContext?.project.id,
                    serviceSchemaId: params.params.schemaId,
                    serviceId: params.marketplaceItem.serviceId,
                    serviceVisibility: params.params.visibility!,
                    componentType: isProjectLevel
                        ? "non-component"
                        : getTypeForDisplayType(platformExtStore.getState().state?.selectedComponent?.spec?.type),
                    componentPath: projectPath,
                    generateCreds: true,
                });
                securityType = createdConnection?.schemaName?.toLowerCase()?.includes("oauth") ? "oauth" : "apikey";
                configurations = createdConnection.configurations;
            }

            const resp = await initializeDevantConnection({
                platformExt,
                name: params.params.name,
                marketplaceItem: params.marketplaceItem,
                visibility: params.params.visibility!,
                configurations,
                securityType,
            });

            StateMachine.setReadyMode();
            this.refreshConnectionList();
            return resp;
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to create Devant connection");
            log(`Failed to invoke createDevantComponentConnection: ${err}`);
        }
    }

    async deleteDevantTempConfigs(params: DeleteDevantTempConfigReq): Promise<void> {
        try {
            const configBalFileUri = getConfigFileUri();

            const configBalEdits = new WorkspaceEdit();
            configBalEdits.delete(
                configBalFileUri,
                new vscode.Range(
                    new vscode.Position(params.nodePosition.startLine, params.nodePosition.startColumn),
                    new vscode.Position(params.nodePosition.endLine, params.nodePosition.endColumn)
                )
            );

            await updateSourceCode({
                textEdits: { [configBalFileUri.toString()]: configBalEdits.get(configBalFileUri) || [] },
                skipPayloadCheck: true,
            });
        } catch (err) {
            log(`Failed to invoke deleteDevantTempConfigs: ${err}`);
        }
    }

    async updateDevantTempConfigs(params: UpdateDevantTempConfigsReq): Promise<UpdateDevantTempConfigsResp> {
        try {
            const configBalFileUri = getConfigFileUri();
            const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
                documentIdentifier: { uri: configBalFileUri.toString() },
            })) as SyntaxTree;

            const configBalEdits = new WorkspaceEdit();

            const newConfigEditLine = (syntaxTree?.syntaxTree?.position?.endLine ?? 0) + 1;

            if(params.configs.some(item=>!item.nodePosition)){
                configBalEdits.insert(configBalFileUri, new vscode.Position(newConfigEditLine, 0), Templates.emptyLine());
            }

            for(const config of params.configs){
                if(!config.nodePosition) {
                    const newConfigTemplate = Templates.newDefaultEnvConfigurable({CONFIG_NAME: config.name });
                    configBalEdits.insert(configBalFileUri, new vscode.Position(newConfigEditLine, 0), newConfigTemplate);
                }
            }

            if(configBalEdits.size > 0){
                await updateSourceCode({
                    textEdits: { [configBalFileUri.toString()]: configBalEdits.get(configBalFileUri) || [] },
                    skipPayloadCheck: true,
                });

                const updatedSyntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
                    documentIdentifier: { uri: configBalFileUri.toString() },
                })) as SyntaxTree;

                for(const config of params.configs){
                    const matchingConfig = (updatedSyntaxTree?.syntaxTree as ModulePart)?.members?.find((member) => {
                        return (member.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value === config.name;
                    });
                    if(STKindChecker.isModuleVarDecl(matchingConfig)){
                        config.nodePosition = matchingConfig.position;
                    }
                }
            }

            return { configs: params.configs };
        } catch (err) {
            log(`Failed to invoke updateConfigFile: ${err}`);
        }
    }

    async registerAndCreateDevantComponentConnection(params: RegisterAndCreateDevantConnectionReq): Promise<CreateDevantConnectionResp> {
        try {
            const platformExt = await this.getPlatformExt();
            StateMachine.setEditMode();

            const marketplaceItems = await platformExt.getMarketplaceItems({
                orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                request: { 
                    query: params.name, 
                    limit: 100,
                    networkVisibilityFilter:  "all",
                    sortBy: "createdTime",
                },
            })

            const registeredMarketplaceItem = await platformExt?.registerMarketplaceConnection({
                orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                projectId: platformExtStore.getState().state?.selectedContext?.project?.id,
                idlContent: "",
                configs: params.configs?.map(item=>({
                    key: item.name,
                    value: item.value,
                    isSecret: item.isSecret,
                })),
                schemaEntries: params.configs?.map(item=>({
                    name: item.name,
                    type: "string",
                    isSensitive: item.isSecret,
                })),
                name: findUniqueConnectionName(params.name, marketplaceItems.data),
            });

            const isProjectLevel = !!!platformExtStore.getState().state?.selectedComponent?.metadata?.id;

            const allConnections = platformExtStore.getState().state?.devantConns?.list || [];
            const existingNames = new Set(allConnections.map((c) => c?.name ?? ""));
            let baseName = (params.name ?? "").trim() || "connection";
            let uniqueName = baseName;
            let counter = 1;
            while (existingNames.has(uniqueName)) {
                uniqueName = `${baseName}-${counter}`;
                counter++;
            }

            const createdConnection = await platformExt?.createThirdPartyConnection({
                componentId: isProjectLevel
                    ? ""
                    : platformExtStore.getState().state?.selectedComponent?.metadata?.id,
                name: uniqueName,
                orgId: platformExtStore.getState().state?.selectedContext?.org.id?.toString(),
                orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                projectId: platformExtStore.getState().state?.selectedContext?.project.id,
                serviceSchemaId: registeredMarketplaceItem.connectionSchemas[0]?.id,
                serviceId: registeredMarketplaceItem.serviceId,
                endpointName: "DefaultEndpoint",
                sensitiveKeys: registeredMarketplaceItem.connectionSchemas[0].entries?.filter((item) => item.isSensitive).map((item) => item.name),
            });

            const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
                documentIdentifier: { uri: getConfigFileUri().toString() },
            })) as SyntaxTree;

            const envIds = Object.keys(createdConnection.configurations || {});
            const firstEnvConfig = envIds.length > 0 ? createdConnection.configurations[envIds[0]] : undefined;
            const connectionKeys = firstEnvConfig?.entries ?? {};

            let hasUpdatedConfig = false;
            const configBalEdits = new WorkspaceEdit();
            
            for(const connectionKey of Object.keys(connectionKeys)){
                const matchingConfig = (syntaxTree?.syntaxTree as ModulePart)?.members?.find((member) => {
                    return (member.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value === connectionKey;
                });
                if(STKindChecker.isModuleVarDecl(matchingConfig)){
                    hasUpdatedConfig = true;
                    configBalEdits.replace(
                        getConfigFileUri(), 
                        new vscode.Range(
                            new vscode.Position(matchingConfig.initializer.position.startLine, matchingConfig.initializer.position.startColumn),
                            new vscode.Position(matchingConfig.initializer.position.endLine, matchingConfig.initializer.position.endColumn)
                        ),
                        `os:getEnv("${getInjectedEnvVarNames(connectionKeys[connectionKey].envVariableName)}")`
                    );
                }
            }
            if(hasUpdatedConfig){
                if (
                    !(syntaxTree?.syntaxTree as ModulePart)?.imports?.some((item) => item.source?.includes("import ballerina/os"))
                ) {
                    const balOsImportTemplate = Templates.importBalOs();
                    configBalEdits.insert(getConfigFileUri(), new vscode.Position(0, 0), balOsImportTemplate);
                }

                await updateSourceCode({
                    textEdits: { [getConfigFileUri().toString()]: configBalEdits.get(getConfigFileUri()) || [] },
                    skipPayloadCheck: true,
                });
            }

            StateMachine.setReadyMode();
            this.refreshConnectionList();
            return {connectionName:"",connectionNode:null};
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to create Devant connection");
            log(`Failed to invoke createDevantComponentConnection: ${err}`);
        }
    }

    debouncedRefreshConnectionList = debounce(() => this.refreshConnectionList(), 500);

    async refreshConnectionList(): Promise<void> {
        try {
            platformExtStore.getState().setConnectionState({ loading: true });
            const tomlValues = await new CommonRpcManager().getCurrentProjectTomlValues();
            const connections = await this.getAllConnections();
            const connectionsUsed = connections.map((connItem) => ({
                ...connItem,
                isUsed: tomlValues?.tool?.openapi?.some((apiItem) => apiItem.remoteId === connItem.name),
            }));
            platformExtStore.getState().setConnectionState({ list: connectionsUsed, loading: false });

            // WIP: in order to improve speed during debugging, we need to bring cache connections secrets in Devant
            /*
            1. store connection with secret info in bal ext
            2. start proxy server. need to pass secure host list.
            3. leave the server running
            4. on extension exit, kill the server if its running
            */
            /*
            const envs = await platformExt.getProjectEnvs({
                orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString(),
                orgUuid: platformExtStore.getState().state?.selectedContext?.org?.uuid,
                projectId: platformExtStore.getState().state?.selectedContext?.project?.id
            })

            const lowestEnv = envs.find(item=>!item.critical)
            if(!lowestEnv){
                throw new Error("failed to find env when refreshing devant connection list")
            }

            const secureHosts = new Set<string>()
            const envMap = new Map<string, string>()

            for(const connItem of connections){
                const connectionDetailedItem = await platformExt.getConnection({
                    connectionGroupId: connItem.groupUuid,
                    orgId: platformExtStore.getState().state?.selectedContext?.org?.id?.toString()
                });
                const matchingConfig = connectionDetailedItem.configurations[lowestEnv.templateId];
                if(matchingConfig){
                    for(const entryName in matchingConfig.entries ){
                        if(matchingConfig.entries[entryName].value){
                            if(connItem.schemaName?.toLowerCase().includes("organization") && entryName==="ServiceURL" && matchingConfig.entries[entryName].value.startsWith("https://")){
                                const domain = getDomain(matchingConfig.entries[entryName].value)
                                secureHosts.add(domain)
                                envMap.set(entryName, matchingConfig.entries[entryName].value.replace("https://", "http://"))
                            }else{
                                envMap.set(entryName, matchingConfig.entries[entryName].value)
                            }
                            if((envMap.get(entryName).startsWith("https://") || envMap.get(entryName).startsWith("http://")) && envMap.get(entryName).endsWith("/")){
                                envMap.set(entryName,  envMap.get(entryName.slice(0, -1)))
                            }
                        }else if(matchingConfig.entries[entryName].isSensitive && !matchingConfig.entries[entryName].isFile){
                            ///////////
                            // todo: //
                            ///////////
                        }
                    }
                }
            }
            */
        } catch (err) {
            platformExtStore.getState().setConnectionState({ loading: false });
            log(`Failed to refresh connection list: ${err}`);
        }
    }
}
