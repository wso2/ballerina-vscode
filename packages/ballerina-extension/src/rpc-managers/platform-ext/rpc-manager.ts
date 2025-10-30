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
import { PlatformExtAPI, SyntaxTree, TomlValues } from "@wso2/ballerina-core";
import { extensions, Range, Uri, window, workspace, WorkspaceEdit } from "vscode";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
    ComponentDisplayType,
    ComponentKind,
    ConnectionDetailed,
    ConnectionListItem,
    ContextItemEnriched,
    DeleteConnectionReq,
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
    ConnectionConfigurations,
    GetConnectionItemReq,
} from "@wso2/wso2-platform-core";
import { log } from "../../utils/logger";
import {
    CreateDevantConnectionReq,
    CreateDevantConnectionResp,
    ImportDevantConnectionReq,
    ImportDevantConnectionResp,
} from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { BiDiagramRpcManager } from "../bi-diagram/rpc-manager";
import * as toml from "@iarna/toml";
import { StateMachine } from "../../stateMachine";
import { CommonRpcManager } from "../common/rpc-manager";
import Handlebars from "handlebars";
import { CaptureBindingPattern, ModulePart, ModuleVarDecl } from "@wso2/syntax-tree";
import * as yaml from "js-yaml";
import { DeleteBiDevantConnectionReq, OpenAPIDefinition } from "./types";

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

    async getMarketplaceItem(params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getMarketplaceItem(params);
        } catch (err) {
            log(`Failed to invoke getMarketplaceItem: ${err}`);
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

    async getDirectoryComponent(fsPath: string): Promise<ComponentKind | null> {
        try {
            const platformExt = await this.getPlatformExt();
            const components = platformExt.getDirectoryComponents(fsPath);
            return components?.length > 0 ? components[0] : null;
        } catch (err) {
            log(`Failed to invoke getDirectoryComponent: ${err}`);
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

    async getConnection(params: GetConnectionItemReq): Promise<ConnectionListItem> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getConnection(params);
        } catch (err) {
            log(`Failed to invoke getConnection: ${err}`);
        }
    }

    async deleteConnection(params: DeleteConnectionReq): Promise<void> {
        try {
            const platformExt = await this.getPlatformExt();
            await platformExt.deleteConnection(params);
        } catch (err) {
            log(`Failed to delete getConnection: ${err}`);
        }
    }

    async deleteLocalConnectionsConfig(params: DeleteLocalConnectionsConfigReq): Promise<void> {
        try {
            const platformExt = await this.getPlatformExt();
            platformExt.deleteLocalConnectionsConfig(params);
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async getDevantConsoleUrl(): Promise<string> {
        try {
            const platformExt = await this.getPlatformExt();
            return platformExt.getDevantConsoleUrl();
        } catch (err) {
            log(`Failed to delete connection config: ${err}`);
        }
    }

    async deleteBiDevantConnection(params: DeleteBiDevantConnectionReq): Promise<void> {
        try {
            StateMachine.setEditMode();

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
                    const isLoggedIn = await platformRpc.isLoggedIn();
                    const devantUrl = await platformRpc.getDevantConsoleUrl();
                    if (!isLoggedIn) {
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
                    const selected = await platformRpc.getSelectedContext();
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

                        const component = await platformRpc.getDirectoryComponent(projectPath);
                        if (component) {
                            const componentConnections = await platformRpc.getConnections({
                                orgId: selected?.org?.id?.toString(),
                                projectId: selected?.project?.id,
                                componentId: component.metadata?.id,
                            });
                            const matchingCompConnection = componentConnections.find(
                                (item) => item.name === matchingTomlEntry?.devantConnection
                            );
                            if (matchingCompConnection) {
                                await platformRpc.deleteLocalConnectionsConfig({
                                    componentDir: projectPath,
                                    connectionName: matchingTomlEntry?.devantConnection,
                                });
                                await platformRpc.deleteConnection({
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
            const selected = await this.getSelectedContext();

            let visibility: string = ServiceInfoVisibilityEnum.Public;
            if(params.connectionListItem?.schemaName.toLowerCase()?.includes("organization")){
                visibility = ServiceInfoVisibilityEnum.Organization;
            }else if(params.connectionListItem?.schemaName.toLowerCase()?.includes("project")){
                visibility = ServiceInfoVisibilityEnum.Project;
            }

            const connectionItem = await this.getConnection({orgId: selected?.org?.id?.toString(), connectionGroupId: params.connectionListItem?.groupUuid});

            const marketplaceItem = await this.getMarketplaceItem({orgId: selected?.org?.id?.toString(), serviceId: params?.connectionListItem?.serviceId});

            const resp = await this.initializeDevantConnection({
                name: params.connectionListItem.name,
                marketplaceItem: marketplaceItem,
                visibility: visibility,
                configurations: (connectionItem as any)?.configurations
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
            const projectPath = StateMachine.context().projectUri;
            const platformExt = await this.getPlatformExt();

            const component = await this.getDirectoryComponent(projectPath);
            const selected = await this.getSelectedContext();

            const createdConnection = await platformExt.createComponentConnection({
                componentId: component.metadata?.id,
                name: params.params.name,
                orgId: selected?.org.id?.toString(),
                orgUuid: selected?.org?.uuid,
                projectId: selected?.project.id,
                serviceSchemaId: params.params.schemaId,
                serviceId: params.marketplaceItem.serviceId,
                serviceVisibility: params.params.visibility!,
                componentType: getTypeForDisplayType(component?.spec?.type),
                componentPath: projectPath,
                generateCreds: component?.spec?.type !== ComponentDisplayType.ByocWebAppDockerLess,
            });

            const resp = await this.initializeDevantConnection({
                name: params.params.name,
                marketplaceItem: params.marketplaceItem,
                visibility: params.params.visibility!,
                configurations: createdConnection.configurations
            });

            StateMachine.setReadyMode();
            return { connectionName: resp.connectionName };
        } catch (err) {
            StateMachine.setReadyMode();
            window.showErrorMessage("Failed to create Devant connection");
            log(`Failed to invoke createDevantComponentConnection: ${err}`);
        }
    }

     async initializeDevantConnection(params: {name: string, visibility: string, marketplaceItem: MarketplaceItem, configurations: ConnectionConfigurations}): Promise<{connectionName: string}> {
        StateMachine.setEditMode();
        const projectPath = StateMachine.context().projectUri;
        const platformExt = await this.getPlatformExt();

        const component = await this.getDirectoryComponent(projectPath);
        const selected = await this.getSelectedContext();

        await platformExt.createConnectionConfig({
            componentDir: projectPath,
            marketplaceItem: params.marketplaceItem,
            name: params.name,
            visibility: params.visibility,
        });

        const serviceIdl = await platformExt.getMarketplaceIdl({
            orgId: selected?.org.id?.toString(),
            serviceId: params.marketplaceItem.serviceId,
        });

        const choreoDir = path.join(projectPath, ".choreo");
        if (!fs.existsSync(choreoDir)) {
            fs.mkdirSync(choreoDir, { recursive: true });
        }

        const moduleName = params.name.replace(/[_\-\s]/g, "")?.toLowerCase();
        const filePath = path.join(choreoDir, `${moduleName}-spec.yaml`);

        if (serviceIdl?.idlType === "OpenAPI" && serviceIdl.content) {
            const updatedDef = processOpenApiWithApiKeyAuth(serviceIdl.content);
            fs.writeFileSync(filePath, updatedDef, "utf8");
        } else {
            // todo: show button to open up devant connection documentation UI
            window.showErrorMessage(
                "Client creation for connection is only supported for REST APIs with valid openAPI spec"
            );
            return { connectionName: params?.name };
        }

        // Generate Bal client
        const diagram = new BiDiagramRpcManager();
        await diagram.generateOpenApiClient({
            module: moduleName,
            openApiContractPath: filePath,
            projectPath,
        });

        // Update bal.toml with created connection reference
        const tomlValues = await new CommonRpcManager().getCurrentProjectTomlValues();

        const updatedToml: TomlValues = {
            ...tomlValues,
            tool: {
                ...tomlValues?.tool,
                openapi: tomlValues.tool?.openapi?.map(item=>{
                    if(item.id === moduleName){
                        return {...item, devantConnection: params?.name };
                    }
                    return item;
                }),
            },
        };

        const balTomlPath = path.join(projectPath, "Ballerina.toml");
        const updatedTomlContent = toml.stringify(JSON.parse(JSON.stringify(updatedToml)));
        fs.writeFileSync(balTomlPath, updatedTomlContent, "utf-8");

        const configFileUri = getConfigFileUri();

        const connectionKeys = params.configurations[Object.keys(params.configurations)?.[0]]?.entries;
        interface IkeyVal {
            keyname: string;
            envName: string;
        }
        interface Ikeys {
            ChoreoAPIKey?: IkeyVal;
            ServiceURL?: IkeyVal;
        }
        const keys: Ikeys = {};
        const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
            documentIdentifier: { uri: configFileUri.toString() },
        })) as SyntaxTree;
        for (const entry in connectionKeys) {
            let baseName = connectionKeys[entry].key?.toLowerCase();
            let candidate = baseName;
            let counter = 1;
            while (
                (syntaxTree.syntaxTree as ModulePart)?.members?.some(
                    (k) =>
                        (k.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value ===
                        candidate
                )
            ) {
                candidate = `${baseName}${counter}`;
                counter++;
            }
            keys[entry] = { keyname: candidate, envName: connectionKeys[entry].envVariableName };
        }

        await addConfigurable(
            configFileUri,
            Object.values(keys).map((item) => ({ configName: item.keyname, configEnvName: item.envName }))
        );

        if (keys?.ChoreoAPIKey && keys?.ServiceURL) {
            const resp = await addConnection(moduleName, {
                apiKeyVarName: keys?.ChoreoAPIKey?.keyname,
                svsUrlVarName: keys?.ServiceURL?.keyname,
            });

            StateMachine.setReadyMode();
            return { connectionName: resp.connName };
        }

        return { connectionName: "" };
    }
}

const getConfigFileUri = () => {
    const configBalFile = path.join(StateMachine.context().projectUri, "config.bal");
    const configBalFileUri = Uri.file(configBalFile);
    if (!fs.existsSync(configBalFile)) {
        // create new config.bal if it doesn't exist
        fs.writeFileSync(configBalFile, "");
    }
    return configBalFileUri;
};

const addConfigurable = async (configBalFileUri: Uri, params: { configName: string; configEnvName: string }[]) => {
    const configBalEdits = new WorkspaceEdit();

    // if import doesn't exist, add it
    const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
        documentIdentifier: { uri: configBalFileUri.toString() },
    })) as SyntaxTree;
    if (
        !(syntaxTree?.syntaxTree as ModulePart)?.imports?.some((item) => item.source?.includes("import ballerina/os"))
    ) {
        const balOsImportTemplate = Templates.importBalOs();
        configBalEdits.insert(configBalFileUri, new vscode.Position(0, 0), balOsImportTemplate);
    }

    const newConfigEditLine = (syntaxTree?.syntaxTree?.position?.endLine ?? 0) + 1;
    configBalEdits.insert(configBalFileUri, new vscode.Position(newConfigEditLine, 0), Templates.emptyLine());

    for (const item of params) {
        const newConfigTemplate = Templates.newEnvConfigurable({
            CONFIG_NAME: item.configName,
            CONFIG_ENV_NAME: item.configEnvName,
        });
        configBalEdits.insert(configBalFileUri, new vscode.Position(newConfigEditLine, 0), newConfigTemplate);
    }

    await workspace.applyEdit(configBalEdits);
};

const addConnection = async (
    moduleName: string,
    configs: { apiKeyVarName: string; svsUrlVarName: string }
): Promise<{ connName: string; connFileUri: Uri }> => {
    const packageName = StateMachine.context().package;
    const connectionBalFile = path.join(StateMachine.context().projectUri, "connections.bal");
    const connectionBalFileUri = Uri.file(connectionBalFile);
    if (!fs.existsSync(connectionBalFile)) {
        // create new connections.bal if it doesn't exist
        fs.writeFileSync(connectionBalFile, "");
    }

    const connBalEdits = new WorkspaceEdit();

    // if import doesn't exist, add it
    const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
        documentIdentifier: { uri: connectionBalFileUri.toString() },
    })) as SyntaxTree;

    if (
        !(syntaxTree?.syntaxTree as ModulePart)?.imports?.some((item) =>
            item.source?.includes(`import ${packageName}/${moduleName}`)
        )
    ) {
        const connImportTemplate = Templates.importConnection({ PACKAGE_NAME: packageName, MODULE_NAME: moduleName });
        connBalEdits.insert(connectionBalFileUri, new vscode.Position(0, 0), connImportTemplate);
    }

    const newConnEditLine = (syntaxTree?.syntaxTree?.position?.endLine ?? 0) + 1;
    connBalEdits.insert(connectionBalFileUri, new vscode.Position(newConnEditLine, 0), Templates.emptyLine());

    let baseName = `${moduleName}Client`;
    let candidate = baseName;
    let counter = 1;
    while (
        (syntaxTree.syntaxTree as ModulePart)?.members?.some(
            (k) => (k.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value === candidate
        )
    ) {
        candidate = `${baseName}${counter}`;
        counter++;
    }

    const newConnTemplate = Templates.newConnectionWithApiKey({
        API_KEY_VAR_NAME: configs.apiKeyVarName,
        CONNECTION_NAME: candidate,
        MODULE_NAME: moduleName,
        SERVICE_URL_VAR_NAME: configs.svsUrlVarName,
    });
    connBalEdits.insert(connectionBalFileUri, new vscode.Position(newConnEditLine, 0), newConnTemplate);

    await workspace.applyEdit(connBalEdits);
    return { connName: candidate, connFileUri: connectionBalFileUri };
};

export const processOpenApiWithApiKeyAuth = (yamlString: string): string => {
    try {
        const openApiDefinition = yaml.load(yamlString) as OpenAPIDefinition;

        if (!openApiDefinition) {
            throw new Error("Invalid YAML: Unable to parse OpenAPI definition");
        }

        if (!openApiDefinition.components) {
            openApiDefinition.components = {};
        }

        if (!openApiDefinition.components.securitySchemes) {
            openApiDefinition.components.securitySchemes = {};
        }

        openApiDefinition.components.securitySchemes.ApiKeyAuth = {
            type: "apiKey",
            in: "header",
            name: "Choreo-API-Key",
        };

        if (openApiDefinition.security && openApiDefinition.security.length > 0) {
            openApiDefinition.security.push({ ApiKeyAuth: [] });
        }

        if (openApiDefinition.paths) {
            for (const path in openApiDefinition.paths) {
                for (const method in openApiDefinition.paths[path]) {
                    if (openApiDefinition.paths[path]?.[method]?.security) {
                        openApiDefinition.paths[path]?.[method]?.security?.push({ ApiKeyAuth: [] });
                    }
                }
            }
        }

        if (!openApiDefinition.servers || openApiDefinition.servers.length === 0) {
            openApiDefinition.servers = [{ url: "http://localhost:8080" }];
        }

        return yaml.dump(openApiDefinition);
    } catch (error) {
        throw new Error(
            `Failed to process OpenAPI definition: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
};

const Templates = {
    emptyLine: () => {
        const template = Handlebars.compile(`\n`);
        return template({});
    },
    newEnvConfigurable: (params: { CONFIG_NAME: string; CONFIG_ENV_NAME: string }) => {
        const template = Handlebars.compile(
            `configurable string {{CONFIG_NAME}} = os:getEnv("{{CONFIG_ENV_NAME}}");\n`
        );
        return template(params);
    },
    importBalOs: () => {
        const template = Handlebars.compile(`import ballerina/os;\n`);
        return template({});
    },
    importConnection: (params: { PACKAGE_NAME: string; MODULE_NAME: string }) => {
        const template = Handlebars.compile(`import {{PACKAGE_NAME}}.{{MODULE_NAME}};\n`);
        return template(params);
    },
    newConnectionWithApiKey: (params: {
        MODULE_NAME: string;
        CONNECTION_NAME: string;
        SERVICE_URL_VAR_NAME: string;
        API_KEY_VAR_NAME: string;
    }) => {
        // check new (apiKeyConfig = {choreoAPIKey: ""},config = {},serviceUrl = "")
        // const template = Handlebars.compile(`final {{MODULE_NAME}}:Client {{CONNECTION_NAME}} = check new (apiKeyConfig = {choreoAPIKey: {{API_KEY_VAR_NAME}}},config = {},serviceUrl = {{SERVICE_URL_VAR_NAME}})l;\n`);
        // return template(params);
        return `final ${params.MODULE_NAME}:Client ${params.CONNECTION_NAME} = check new (apiKeyConfig = {choreoAPIKey: ${params.API_KEY_VAR_NAME}},config = {},serviceUrl = ${params.SERVICE_URL_VAR_NAME});\n`;
    },
};
