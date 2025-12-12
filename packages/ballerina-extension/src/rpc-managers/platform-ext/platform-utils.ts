import { SyntaxTree, PackageTomlValues } from "@wso2/ballerina-core";
import { ModulePart, STKindChecker, CaptureBindingPattern, TypeDefinition, RecordField } from "@wso2/syntax-tree";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { StateMachine } from "../../stateMachine";
import { Uri, WorkspaceEdit, workspace } from "vscode";
import { OpenAPIDefinition } from "./types";
import * as yaml from "js-yaml";
import {
    MarketplaceItem,
    ConnectionConfigurations,
    ServiceInfoVisibilityEnum,
    IWso2PlatformExtensionAPI,
} from "@wso2/wso2-platform-core";
import { BiDiagramRpcManager } from "../bi-diagram/rpc-manager";
import { CommonRpcManager } from "../common/rpc-manager";
import * as toml from "@iarna/toml";
import { extension } from "../../BalExtensionContext";
import { PersistOptions, createJSONStorage } from "zustand/middleware";
import { platformExtStore } from "./platform-store";
import Handlebars from "handlebars";

export const getConfigFileUri = () => {
    const configBalFile = path.join(StateMachine.context().projectPath, "config.bal");
    const configBalFileUri = Uri.file(configBalFile);
    if (!fs.existsSync(configBalFile)) {
        // create new config.bal if it doesn't exist
        fs.writeFileSync(configBalFile, "");
    }
    return configBalFileUri;
};

export const addConfigurable = async (
    configBalFileUri: Uri,
    params: { configName: string; configEnvName: string }[]
) => {
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

export const addProxyConfigurable = async (configBalFileUri: Uri) => {
    const configBalEdits = new WorkspaceEdit();

    const syntaxTree = (await StateMachine.context().langClient.getSyntaxTree({
        documentIdentifier: { uri: configBalFileUri.toString() },
    })) as SyntaxTree;
    if (
        !(syntaxTree?.syntaxTree as ModulePart)?.imports?.some((item) => item.source?.includes("import ballerina/http"))
    ) {
        const importHttpTemplate = Templates.importBalHttp();
        configBalEdits.insert(configBalFileUri, new vscode.Position(0, 0), importHttpTemplate);
    }

    if (
        !(syntaxTree?.syntaxTree as ModulePart)?.members?.find(
            (member) =>
                STKindChecker.isModuleVarDecl(member) &&
                (member.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value ===
                    "devantProxyConfig"
        )
    ) {
        const proxyConfigTemplate = Templates.proxyConfigurable();
        const newConfigEditLine = (syntaxTree?.syntaxTree?.position?.endLine ?? 0) + 1;
        configBalEdits.insert(configBalFileUri, new vscode.Position(newConfigEditLine, 0), proxyConfigTemplate);
    }

    await workspace.applyEdit(configBalEdits);
};

export const addConnection = async (
    connectionName: string,
    moduleName: string,
    securityType: "" | "oauth" | "apikey",
    requireProxy: boolean,
    configs: {
        apiKeyVarName: string;
        svsUrlVarName: string;
        tokenUrlVarName?: string;
        tokenClientIdVarName?: string;
        tokenClientSecretVarName?: string;
    }
): Promise<{ connName: string; connFileUri: Uri }> => {
    const matchingBalProj = StateMachine.context().projectStructure?.projects?.find(
        (item) => item.projectPath === StateMachine.context().projectPath
    );
    if (!matchingBalProj) {
        throw new Error(`Failed to find bal project for :${StateMachine.context().projectPath}`);
    }

    const packageName = matchingBalProj.projectName;
    const connectionBalFile = path.join(StateMachine.context().projectPath, "connections.bal");
    const connectionBalFileUri = Uri.file(connectionBalFile);
    if (!fs.existsSync(connectionBalFile)) {
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

    let baseName = connectionName?.replaceAll("-", "_").replaceAll(" ", "_");
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

    let newConnTemplate = "";
    if (securityType === "") {
        newConnTemplate = Templates.newConnectionNoSecurity({
            CONNECTION_NAME: candidate,
            MODULE_NAME: moduleName,
            SERVICE_URL_VAR_NAME: configs.svsUrlVarName,
        });
    } else if (securityType === "oauth") {
        newConnTemplate = Templates.newConnectionWithOAuth({
            requireProxy,
            API_KEY_VAR_NAME: configs.apiKeyVarName,
            CONNECTION_NAME: candidate,
            MODULE_NAME: moduleName,
            SERVICE_URL_VAR_NAME: configs.svsUrlVarName,
            CLIENT_ID: configs.tokenClientIdVarName,
            CLIENT_SECRET: configs.tokenClientSecretVarName,
            TOKEN_URL: configs.tokenUrlVarName,
        });
    } else if (securityType === "apikey") {
        newConnTemplate = Templates.newConnectionWithApiKey({
            requireProxy,
            API_KEY_VAR_NAME: configs.apiKeyVarName,
            CONNECTION_NAME: candidate,
            MODULE_NAME: moduleName,
            SERVICE_URL_VAR_NAME: configs.svsUrlVarName,
        });
    }

    connBalEdits.insert(connectionBalFileUri, new vscode.Position(newConnEditLine, 0), newConnTemplate);

    await workspace.applyEdit(connBalEdits);
    return { connName: candidate, connFileUri: connectionBalFileUri };
};

/*
const getDevantConnectorInitKey = async (moduleName: string): Promise<string> => {
    const generatedTypes = path.join(StateMachine.context().projectPath, "generated", moduleName, "types.bal");
    if (fs.existsSync(generatedTypes)) {
        const stClientTypes = (await StateMachine.context().langClient.getSyntaxTree({
            documentIdentifier: { uri: Uri.file(generatedTypes).toString() },
        })) as SyntaxTree;

        const apiKeyConfigType = (stClientTypes?.syntaxTree as ModulePart)?.members?.find(
            (member) => STKindChecker.isTypeDefinition(member) && member?.typeName?.value === "ApiKeysConfig"
        ) as TypeDefinition;
        if (apiKeyConfigType) {
            const apiKeyConfigField =
                STKindChecker.isRecordTypeDesc(apiKeyConfigType.typeDescriptor) &&
                (apiKeyConfigType.typeDescriptor?.fields?.find(
                    (field) => STKindChecker.isRecordField(field) && field.fieldName?.value === "Choreo-API-Key"
                ) as RecordField);
            if (apiKeyConfigField) {
                return "Choreo-API-Key";
            }
        }
    }
    return "choreoAPIKey";
};
*/

const getYamlString = (yamlString: string) => {
    try {
        if (/%[0-9A-Fa-f]{2}/.test(yamlString)) {
            const decoded = decodeURIComponent(yamlString);
            if (
                decoded !== yamlString &&
                (decoded.includes("\n") || decoded.includes(":") || /openapi/i.test(decoded))
            ) {
                return decoded;
            }
        }
        return yamlString;
    } catch {
        return yamlString;
    }
};

export const processOpenApiWithApiKeyAuth = (yamlString: string, securityType: "" | "oauth" | "apikey"): string => {
    try {
        const openApiDefinition = yaml.load(getYamlString(yamlString)) as OpenAPIDefinition;
        const oAuthSchemaName = "DevantOAuth2";
        const apiKeySchemaName = "DevantApiKeyAuth";

        if (!openApiDefinition) {
            throw new Error("Invalid YAML: Unable to parse OpenAPI definition");
        }

        if (!openApiDefinition.components) {
            openApiDefinition.components = {};
        }

        if (!openApiDefinition.components.securitySchemes && securityType!=="") {
            openApiDefinition.components.securitySchemes = {};
        }

        if (securityType === "oauth") {
            openApiDefinition.components.securitySchemes[oAuthSchemaName] = {
                type: "oauth2",
                flows: {
                    clientCredentials: {
                        tokenUrl: "tokenURL",
                        scopes: {},
                    },
                },
            };
        }else if(securityType === "apikey"){
            openApiDefinition.components.securitySchemes[apiKeySchemaName] = {
                type: "apiKey",
                in: "header",
                name: "Choreo-API-Key",
                "x-ballerina-name": "choreoAPIKey",
            };
        }

        if (!openApiDefinition.security && securityType !== "") {
            openApiDefinition.security = [];
        }
        if (securityType === "oauth") {
            openApiDefinition.security.push({ [oAuthSchemaName]: [], [apiKeySchemaName]: [] });
        } else if(securityType === "apikey"){
            openApiDefinition.security.push({ [apiKeySchemaName]: [] });
        }

        if (openApiDefinition.paths) {
            for (const path in openApiDefinition.paths) {
                for (const method in openApiDefinition.paths[path]) {
                    if (openApiDefinition.paths[path]?.[method]?.security) {
                        if (securityType === "oauth") {
                            openApiDefinition.paths[path]?.[method]?.security.push({
                                [oAuthSchemaName]: [],
                                [apiKeySchemaName]: [],
                            });
                        }else if(securityType === "apikey"){
                            openApiDefinition.paths[path]?.[method]?.security.push({ [apiKeySchemaName]: [] });
                        }
                    }
                }
            }
        }

        if (!openApiDefinition.servers || openApiDefinition.servers.length === 0) {
            openApiDefinition.servers = [{ url: "http://localhost:8080" }];
        }

        openApiDefinition.servers.forEach((server) => {
            if (typeof server.url === "string" && server.url.endsWith("/")) {
                server.url = server.url.slice(0, -1);
            }
        });

        return yaml.dump(openApiDefinition);
    } catch (error) {
        throw new Error(
            `Failed to process OpenAPI definition: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
};

export const initializeDevantConnection = async (params: {
    name: string;
    visibility: string;
    securityType: "" | "oauth" | "apikey";
    marketplaceItem: MarketplaceItem;
    configurations: ConnectionConfigurations;
    platformExt: IWso2PlatformExtensionAPI;
}): Promise<{ connectionName: string }> => {
    const projectPath = StateMachine.context().projectPath;

    await params.platformExt?.createConnectionConfig({
        componentDir: projectPath,
        marketplaceItem: params.marketplaceItem,
        name: params.name,
        visibility: params.visibility,
    });

    const serviceIdl = await params.platformExt?.getMarketplaceIdl({
        orgId: platformExtStore.getState().state?.selectedContext?.org.id?.toString(),
        serviceId: params.marketplaceItem.serviceId,
    });

    const choreoDir = path.join(projectPath, ".choreo");
    if (!fs.existsSync(choreoDir)) {
        fs.mkdirSync(choreoDir, { recursive: true });
    }

    const moduleName = params.name.replace(/[_\-\s]/g, "")?.toLowerCase();
    const filePath = path.join(choreoDir, `${moduleName}-spec.yaml`);

    if (serviceIdl?.idlType === "OpenAPI" && serviceIdl.content) {
        const updatedDef = processOpenApiWithApiKeyAuth(serviceIdl.content, params.securityType);
        fs.writeFileSync(filePath, updatedDef, "utf8");
    } else {
        // todo: show button to open up devant connection documentation UI
        vscode.window.showErrorMessage(
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

    const updatedToml: Partial<PackageTomlValues> = {
        ...tomlValues,
        tool: {
            ...tomlValues?.tool,
            openapi: tomlValues.tool?.openapi?.map((item) => {
                if (item.id === moduleName) {
                    return { ...item, remoteId: params?.name, filePath: `.choreo/${moduleName}-spec.yaml` };
                }
                return item;
            }),
        },
    };

    const balTomlPath = path.join(projectPath, "Ballerina.toml");
    const updatedTomlContent = toml.stringify(JSON.parse(JSON.stringify(updatedToml)));
    fs.writeFileSync(balTomlPath, updatedTomlContent, "utf-8");

    const configFileUri = getConfigFileUri();

    const envIds = Object.keys(params.configurations || {});
    const firstEnvConfig = envIds.length > 0 ? params.configurations[envIds[0]] : undefined;
    const connectionKeys = firstEnvConfig?.entries ?? {};

    interface IkeyVal {
        keyname: string;
        envName: string;
    }
    interface Ikeys {
        ChoreoAPIKey?: IkeyVal;
        ServiceURL?: IkeyVal;
        TokenURL?: IkeyVal;
        ConsumerKey?: IkeyVal;
        ConsumerSecret?: IkeyVal;
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
                    (k.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value === candidate
            )
        ) {
            candidate = `${baseName}${counter}`;
            counter++;
        }

        const getInjectedEnvVarNames = (key: string): string => {
            const parts = key.split("_");
            if (parts.length > 1) {
                let lastPart = parts[parts.length - 1];
                if (lastPart.startsWith("CHOREO")) {
                    lastPart = lastPart.slice("CHOREO".length);
                }
                parts[parts.length - 1] = lastPart;
            }
            return parts.join("_");
        };

        keys[entry] = {
            keyname: candidate,
            envName: getInjectedEnvVarNames(connectionKeys[entry].envVariableName),
        };
    }

    await addConfigurable(
        configFileUri,
        Object.values(keys).map((item) => ({ configName: item.keyname, configEnvName: item.envName }))
    );

    const requireProxy = [
        ServiceInfoVisibilityEnum.Organization.toString(),
        ServiceInfoVisibilityEnum.Project.toString(),
    ].includes(params.visibility);

    if (requireProxy) {
        await addProxyConfigurable(configFileUri);
    }

    const resp = await addConnection(params.name, moduleName, params.securityType, requireProxy, {
        apiKeyVarName: keys?.ChoreoAPIKey?.keyname,
        svsUrlVarName: keys?.ServiceURL?.keyname,
        tokenClientIdVarName: keys?.ConsumerKey?.keyname,
        tokenClientSecretVarName: keys?.ConsumerSecret?.keyname,
        tokenUrlVarName: keys?.TokenURL?.keyname,
    });

    return { connectionName: resp.connName };
};

export const getWorkspaceStateStore = (storeName: string): PersistOptions<any, any> => {
    const version = "v1";
    return {
        name: `${storeName}-${version}`,
        storage: createJSONStorage(() => ({
            getItem: async (name) => {
                const value = await extension.context.workspaceState.get(name);
                return value ? (value as string) : "";
            },
            removeItem: (name) => extension.context.workspaceState.update(name, undefined),
            setItem: (name, value) => extension.context.workspaceState.update(name, value),
        })),
        skipHydration: true,
    };
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
    importBalHttp: () => {
        const template = Handlebars.compile(`import ballerina/http;\n`);
        return template({});
    },
    importConnection: (params: { PACKAGE_NAME: string; MODULE_NAME: string }) => {
        const template = Handlebars.compile(`import {{PACKAGE_NAME}}.{{MODULE_NAME}};\n`);
        return template(params);
    },
    proxyConfigurable: () => {
        const template = Handlebars.compile(`
configurable string? devantProxyHost = ();
configurable int? devantProxyPort = ();
http:ProxyConfig? devantProxyConfig = devantProxyHost is string && devantProxyPort is int ? { host: <string> devantProxyHost, port: <int> devantProxyPort } : ();
\n`);
        return template({});
    },
    newConnectionNoSecurity: (params: {
        MODULE_NAME: string;
        CONNECTION_NAME: string;
        SERVICE_URL_VAR_NAME: string;
    }) => {
        return `final ${params.MODULE_NAME}:Client ${params.CONNECTION_NAME} = check new (config = { timeout: 30 }, serviceUrl = ${params.SERVICE_URL_VAR_NAME});\n`;
    },
    newConnectionWithApiKey: (params: {
        requireProxy: boolean;
        MODULE_NAME: string;
        CONNECTION_NAME: string;
        SERVICE_URL_VAR_NAME: string;
        API_KEY_VAR_NAME: string;
    }) => {
        return `final ${params.MODULE_NAME}:Client ${
            params.CONNECTION_NAME
        } = check new (apiKeyConfig = { choreoAPIKey: ${params.API_KEY_VAR_NAME} }, config = { ${
            params.requireProxy ? "proxy: devantProxyConfig, " : ""
        }timeout: 60 }, serviceUrl = ${params.SERVICE_URL_VAR_NAME});\n`;
    },
    newConnectionWithOAuth: (params: {
        requireProxy: boolean;
        MODULE_NAME: string;
        CONNECTION_NAME: string;
        SERVICE_URL_VAR_NAME: string;
        API_KEY_VAR_NAME: string;
        TOKEN_URL: string;
        CLIENT_ID: string;
        CLIENT_SECRET: string;
    }) => {
        // todo: get params from LS
        return `final ${params.MODULE_NAME}:Client ${
            params.CONNECTION_NAME
        } = check new (config = { auth: { tokenUrl: ${params.TOKEN_URL}, clientId: ${params.CLIENT_ID}, clientSecret: ${
            params.CLIENT_SECRET
        } }, ${params.requireProxy ? "proxy: devantProxyConfig, " : ""}timeout: 60 }, serviceUrl = ${
            params.SERVICE_URL_VAR_NAME
        });\n`;
    },
};

export const hasContextYaml = (projectPath: string): boolean => {
    try {
        const repoRoot = getRepoRoot(projectPath);
        if (repoRoot) {
            const contextYamlPath = path.join(repoRoot, ".choreo", "context.yaml");
            if (fs.existsSync(contextYamlPath)) {
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
};

export function getRepoRoot(projectRoot: string): string | undefined {
    // traverse up the directory tree until .git directory is found
    const gitDir = path.join(projectRoot, ".git");
    if (fs.existsSync(gitDir)) {
        return projectRoot;
    }
    // path is root return undefined
    if (projectRoot === path.parse(projectRoot).root) {
        return undefined;
    }
    return getRepoRoot(path.join(projectRoot, ".."));
}

export function getDomain(rawURL: string): string {
    try {
        const parsedURL = new URL(rawURL);
        return parsedURL.hostname;
    } catch (error) {
        throw new Error("");
    }
}
