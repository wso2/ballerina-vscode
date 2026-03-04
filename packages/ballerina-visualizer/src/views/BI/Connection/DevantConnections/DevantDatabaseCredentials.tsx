/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useEffect, useState, type FC } from "react";
import styled from "@emotion/styled";
import { DIRECTORY_MAP, ParentPopupData } from "@wso2/ballerina-core";
import { Tabs, ThemeColors, Typography, Button, Dropdown, OptionProps } from "@wso2/ui-toolkit";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import {
    BIDatabaseType,
    CreatePersistConnectionStep,
    DatabaseCredentials,
    DatabaseTable,
    DEFAULT_DB_PORTS,
    handleIntrospectDatabase,
    handleSaveDbConnection,
    IntrospectDatabaseStep,
    IntrospectDatabaseStepForm,
    SelectPersistTablesStep,
} from "../DatabaseConnectionPopup/index";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    MarketplaceDatabaseListResp,
    DatabaseRequestStatusEnum,
    ConnectionDetailed,
    MarketplaceItem,
    ConnectionListItem,
    ServiceInfoVisibilityEnum,
} from "@wso2/wso2-platform-core";
import { LoadingRing } from "../../../../components/Loader";
import { DevantConnectionFlow, DevantConnectionFlowStep, generateInitialConnectionName, isValidDevantConnName, ProgressWrap } from "./utils";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ConnectorContentContainer } from "../styles";

const TAB_VIEWS = [
    { id: "devantDatabases", name: "Devant Databases" },
    { id: "manual", name: "Other Database Credentials" },
];

const DatabaseListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
`;

const DatabaseItem = styled.div<{ selected?: boolean; disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border: 1px solid
        ${(props: { selected?: boolean; disabled?: boolean }) =>
            props.selected ? ThemeColors.PRIMARY : ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    background-color: ${(props: { selected?: boolean; disabled?: boolean }) =>
        props.selected ? ThemeColors.PRIMARY_CONTAINER : ThemeColors.SURFACE_DIM};
    cursor: ${(props: { selected?: boolean; disabled?: boolean }) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props: { selected?: boolean; disabled?: boolean }) => (props.disabled ? 0.6 : 1)};
    transition: all 0.2s ease;

    ${(props: { selected?: boolean; disabled?: boolean }) =>
        !props.disabled &&
        `
        &:hover {
            border-color: ${ThemeColors.PRIMARY};
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }
    `}
`;

const DatabaseItemLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DatabaseItemName = styled(Typography)`
    font-size: 14px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const DatabaseItemMeta = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const DatabaseTypeBadge = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: ${ThemeColors.PRIMARY};
    background-color: ${ThemeColors.PRIMARY_CONTAINER};
    border-radius: 4px;
    padding: 2px 8px;
    white-space: nowrap;
`;

const DatabaseItemRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
`;

const DisabledHint = styled(Typography)`
    font-size: 11px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
    opacity: 0.8;
    font-style: italic;
`;

const ProvisionSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
`;

const SectionDesc = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 10px;
`;

export function getDbServerTypeDisplayName(type: string): string {
    switch (type) {
        case "postgres":
            return "PostgreSQL";
        case "mysql":
            return "MySQL";
        case "redis":
            return "Devant-Managed Cache";
        default:
            return type;
    }
}

interface DatabaseCredentialsTabsProps {
    devantDatabases: MarketplaceDatabaseListResp;
    isLoadingDatabases: boolean;
    selectedDb: MarketplaceItem | null;
    onSelectDb: (db: MarketplaceItem) => void;
    onTabChange: (tabId: "devantDatabases" | "manual") => void;
    formProps: {
        credentials: DatabaseCredentials;
        isIntrospecting: boolean;
        onDatabaseTypeChange: (value: string) => void;
        onCredentialsChange: (field: keyof DatabaseCredentials, value: string) => void;
    };
}

const DatabaseCredentialsTabs: FC<DatabaseCredentialsTabsProps> = ({
    formProps,
    devantDatabases,
    isLoadingDatabases,
    selectedDb,
    onSelectDb,
    onTabChange,
}) => {
    const { devantConsoleUrl, platformExtState } = usePlatformExtContext();
    const { rpcClient } = useRpcContext();
    const [activeTab, setActiveTab] = React.useState<"devantDatabases" | "manual">("devantDatabases");

    const handleTabChange = (tabId: "devantDatabases" | "manual") => {
        setActiveTab(tabId);
        onTabChange(tabId);
    };

    const getStatusDisplayName = (status: string) => {
        switch (status) {
            case DatabaseRequestStatusEnum.Active:
                return "Active";
            case DatabaseRequestStatusEnum.Creating:
                return "Creating";
            case DatabaseRequestStatusEnum.Deleting:
                return "Deleting";
            case DatabaseRequestStatusEnum.Deleted:
                return "Deleted";
            case DatabaseRequestStatusEnum.PoweredOff:
                return "Powered Off";
            case DatabaseRequestStatusEnum.Resuming:
                return "Resuming";
            default:
                return status;
        }
    };

    const onClickCreateDb = async () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: `${devantConsoleUrl}/organizations/${platformExtState?.selectedContext?.org?.handle}/admin/databases`,
        });
    };

    return (
        <Tabs
            views={TAB_VIEWS}
            currentViewId={activeTab}
            onViewChange={(view: string) => handleTabChange(view as "devantDatabases" | "manual")}
            childrenSx={{ paddingTop: "16px" }}
        >
            <div id="devantDatabases">
                <>
                    {isLoadingDatabases ? (
                        <ProgressWrap>
                            <LoadingRing message="Loading Devant Databases..." />
                        </ProgressWrap>
                    ) : (
                        <>
                            {devantDatabases?.count === 0 ? (
                                <>
                                    <Typography variant="body2" sx={{ fontSize: "12px", margin: "10px 0" }}>
                                        You don't have any databases created in Devant yet. Head over to Devant to
                                        create a new database or{" "}
                                        <VSCodeLink onClick={() => handleTabChange("manual")}>
                                            provide credentials
                                        </VSCodeLink>{" "}
                                        of your existing database.
                                    </Typography>
                                    <Button appearance="secondary" onClick={onClickCreateDb}>
                                        Create New Database
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <DatabaseListContainer>
                                        {devantDatabases?.data?.map((db) => {
                                            const isActive =
                                                db.resourceDetails?.status === DatabaseRequestStatusEnum.Active;
                                            const statusDisplayName = getStatusDisplayName(db.resourceDetails?.status);
                                            return (
                                                <DatabaseItem
                                                    key={db.resourceId}
                                                    selected={selectedDb?.resourceId === db.resourceId}
                                                    disabled={!isActive}
                                                    onClick={() => isActive && onSelectDb(db)}
                                                >
                                                    <DatabaseItemLeft>
                                                        <DatabaseItemName variant="body1">{db.name}</DatabaseItemName>
                                                        <DatabaseItemMeta variant="body2">
                                                            Type:{" "}
                                                            {getDbServerTypeDisplayName(
                                                                db.resourceDetails?.databaseType,
                                                            )}
                                                        </DatabaseItemMeta>
                                                        <DatabaseItemMeta variant="body2">
                                                            Server: {db.resourceDetails?.databaseServerName}
                                                        </DatabaseItemMeta>
                                                        {!isActive && (
                                                            <DisabledHint variant="body2">
                                                                Database must be Active to proceed.{" "}
                                                                <VSCodeLink onClick={onClickCreateDb}>
                                                                    Manage in Devant
                                                                </VSCodeLink>
                                                            </DisabledHint>
                                                        )}
                                                    </DatabaseItemLeft>
                                                    <DatabaseItemRight>
                                                        <DatabaseTypeBadge>{statusDisplayName}</DatabaseTypeBadge>
                                                    </DatabaseItemRight>
                                                </DatabaseItem>
                                            );
                                        })}
                                    </DatabaseListContainer>
                                    <ProvisionSection>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: "12px" }}
                                        >
                                            Don't see your database?{" "}
                                            <VSCodeLink onClick={onClickCreateDb}>Create one in Devant</VSCodeLink> or{" "}
                                            <VSCodeLink onClick={() => handleTabChange("manual")}>
                                                provide database credentials
                                            </VSCodeLink>
                                            .
                                        </Typography>
                                    </ProvisionSection>
                                </>
                            )}
                        </>
                    )}
                </>
            </div>
            <div id="manual">
                <SectionDesc>Enter credentials to connect and introspect the database</SectionDesc>
                <IntrospectDatabaseStepForm
                    credentials={formProps.credentials}
                    isIntrospecting={formProps.isIntrospecting}
                    onDatabaseTypeChange={formProps.onDatabaseTypeChange}
                    onCredentialsChange={formProps.onCredentialsChange}
                />
            </div>
        </Tabs>
    );
};

interface Props {
    projectPath: string;
    biConnectionNames: string[];
    existingDevantConnNames: string[];
    selectedMarketplaceItem?: MarketplaceItem | null;
    importedConnection?: ConnectionListItem;
    devantConfigs: DevantTempConfig[];
    setSelectedMarketplaceItem: (item: MarketplaceItem | null) => void;
    onClose: (parent?: ParentPopupData) => void;
    selectedStep: DevantConnectionFlowStep;
    goToNextStep: () => void;
    selectedFlow: DevantConnectionFlow;
    setSelectedFlow: (flow: DevantConnectionFlow) => void;
}

const tempCredentials: DatabaseCredentials = {
    databaseName: "root",
    databaseType: "MySQL",
    host: "localhost",
    password: "",
    port: 3306,
    username: "admin",
};

export const DevantDatabaseCredentials: FC<Props> = (props) => {
    const {
        projectPath,
        biConnectionNames,
        existingDevantConnNames,
        setSelectedMarketplaceItem,
        selectedMarketplaceItem,
        onClose,
        importedConnection,
        devantConfigs,
        selectedStep,
        goToNextStep,
        selectedFlow,
        setSelectedFlow,
    } = props;
    const { platformRpcClient, platformExtState, devantConsoleUrl } = usePlatformExtContext();

    const { rpcClient } = useRpcContext();
    const [activeTab, setActiveTab] = React.useState<"devantDatabases" | "manual">("devantDatabases");

    const [credentials, setCredentials] = useState<DatabaseCredentials>({
        databaseType: "MySQL",
        host: "",
        port: 3306,
        databaseName: "",
        username: "",
        password: "",
    });
    const [devantCredentials, setDevantCredentials] = useState<DatabaseCredentials>();
    const [tables, setTables] = useState<DatabaseTable[]>([]);
    const [connectionName, setConnectionName] = useState("");
    const [selectedUserCredentialId, setSelectedUserCredentialId] = useState<string>("");

    const handleDatabaseTypeChange = (value: string) => {
        const dbType = value as BIDatabaseType;
        setCredentials({
            ...credentials,
            databaseType: dbType,
            port: DEFAULT_DB_PORTS[dbType],
        });
    };

    const handleCredentialsChange = (field: keyof DatabaseCredentials, value: string) => {
        setCredentials({
            ...credentials,
            [field]: field === "port" ? Number(value) : value,
        });
    };

    const getCredentialsFromSelectedDb = async (db: MarketplaceItem | null): Promise<DatabaseCredentials | null> => {
        if (!db) {
            throw new Error("No Devant database selected to fetch credentials for introspection");
        }
        const orgId = platformExtState?.selectedContext?.org.id?.toString() || "";
        const serverId = db.resourceDetails?.databaseServerId;
        const [server, adminCredential] = await Promise.all([
            platformRpcClient.getDatabaseServer({ orgId, databaseServerId: serverId }),
            platformRpcClient.getDatabaseAdminCredential({ orgId, databaseServerId: serverId }),
        ]);
        const dbTypeMap: Record<string, "PostgreSQL" | "MySQL"> = {
            postgres: "PostgreSQL",
            mysql: "MySQL",
        };
        const credsToUse: DatabaseCredentials = {
            databaseType: dbTypeMap[db.resourceDetails?.databaseType] ?? "PostgreSQL",
            host: server.connection_params.host,
            port: Number(server.connection_params.port),
            databaseName: db?.name || server.connection_params.database,
            username: server.connection_params.user,
            password: adminCredential.password,
        };
        return credsToUse;
    };

    const {
        mutate: runIntrospect,
        isPending: isIntrospecting,
        error: introspectErr,
    } = useMutation({
        mutationFn: async (params: {
            creds?: DatabaseCredentials;
            mode: "devantDb" | "thirdParty";
            goToNextStep?: boolean;
        }) => {
            if (params.mode === "thirdParty") {
                return handleIntrospectDatabase(rpcClient, params.creds);
            }

            const credsToUse = await getCredentialsFromSelectedDb(selectedMarketplaceItem);
            setDevantCredentials(credsToUse);
            return handleIntrospectDatabase(rpcClient, credsToUse);
        },
        onSuccess: (tables, vars) => {
            setTables(tables.map((name) => ({ name, selected: false })));
            if (vars.goToNextStep) {
                goToNextStep();
            }
        },
        onError: (error) => {
            console.error(">>> Error introspecting database", error);
        },
    });

    useEffect(() => {
        if (
            [
                DevantConnectionFlow.CREATE_DATABASE_PERSIST_DB_SELECTED,
                DevantConnectionFlow.IMPORT_DATABASE_PERSIST,
            ].includes(selectedFlow) &&
            selectedMarketplaceItem
        ) {
            runIntrospect({ mode: "devantDb" });
        }
    }, [selectedMarketplaceItem, selectedFlow]);

    const {
        mutate: saveDatabaseConnection,
        isPending: isSavingDbConn,
        error: saveDbConnError,
    } = useMutation({
        mutationFn: async () => {
            let configs = credentials;
            if (selectedMarketplaceItem && devantCredentials) {
                configs = devantCredentials;
            }
            const connNameDiagnostic = isValidDevantConnName(
                connectionName,
                existingDevantConnNames,
                biConnectionNames,
            );
            if (connNameDiagnostic) {
                throw new Error(connNameDiagnostic);
            }
            await handleSaveDbConnection(connectionName, tables, rpcClient, configs);
            await createDevantConnection();
        },
        onSuccess: (_, vars) => {
            onClose?.({ recentIdentifier: connectionName, artifactType: DIRECTORY_MAP.CONNECTION });
        },
        onError: (error) => {
            console.error(">>> Error saving database connection", error);
        },
    });

    const handleTableToggleByName = (name: string) => {
        setTables((prev) => prev.map((t) => (t.name === name ? { ...t, selected: !t.selected } : t)));
    };

    const handleSelectAllTables = () => {
        const allSelected = tables.every((table) => table.selected);
        setTables(tables.map((table) => ({ ...table, selected: !allSelected })));
    };

    const handleConnectionNameChange = (value: string) => {
        setConnectionName(value);
    };

    const { data: devantDatabases, isLoading: isLoadingDatabases } = useQuery({
        queryKey: ["devant-databases", projectPath, platformExtState?.selectedContext?.org],
        queryFn: () =>
            platformRpcClient.getMarketplaceDatabases({
                orgId: platformExtState?.selectedContext?.org.id?.toString() || "",
            }),
        select: (resp) => ({
            ...resp,
            data:
                resp.data?.filter(
                    (db) =>
                        db.resourceDetails?.databaseType &&
                        ["postgres", "mysql"].includes(db.resourceDetails.databaseType),
                ) || [],
        }),
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (selectedFlow === DevantConnectionFlow.CREATE_DATABASE_PERSIST && activeTab === "manual") {
            setSelectedFlow(DevantConnectionFlow.CREATE_THIRD_PARTY_PERSIST);
        } else if (
            selectedFlow === DevantConnectionFlow.CREATE_THIRD_PARTY_PERSIST &&
            activeTab === "devantDatabases"
        ) {
            setSelectedFlow(DevantConnectionFlow.CREATE_DATABASE_PERSIST);
        }
    }, [activeTab, selectedFlow]);

    const createDevantConnection = async () => {
        if (importedConnection) {
            const connectionDetailed = await platformRpcClient.getConnection({
                connectionGroupId: importedConnection.groupUuid,
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
            });
            await platformRpcClient.replaceDevantTempConfigValues({
                configs: devantConfigs,
                createdConnection: connectionDetailed,
            });

            let visibility: ServiceInfoVisibilityEnum = ServiceInfoVisibilityEnum.Public;
            if (connectionDetailed?.schemaName?.toLowerCase()?.includes("organization")) {
                visibility = ServiceInfoVisibilityEnum.Organization;
            } else if (connectionDetailed?.schemaName?.toLowerCase()?.includes("project")) {
                visibility = ServiceInfoVisibilityEnum.Project;
            }

            await platformRpcClient.createConnectionConfig({
                marketplaceItem: selectedMarketplaceItem,
                name: importedConnection.name,
                visibility,
                componentDir: projectPath,
            });
            return;
        }

        let configs = credentials;
        if (selectedMarketplaceItem && devantCredentials) {
            configs = devantCredentials;
        }

        const newDevantConfigs: DevantTempConfig[] = [
            { id: "HostName", name: `${connectionName}Host`, value: configs.host, isSecret: false, type: "string" },
            {
                id: "Port",
                name: `${connectionName}Port`,
                value: configs.port?.toString(),
                isSecret: false,
                type: "int",
            },
            {
                id: "Username",
                name: `${connectionName}User`,
                value: configs.username,
                isSecret: false,
                type: "string",
            },
            {
                id: "Password",
                name: `${connectionName}Password`,
                value: configs.password,
                isSecret: true,
                type: "string",
            },
            {
                id: "DatabaseName",
                name: `${connectionName}Database`,
                value: configs.databaseName,
                isSecret: false,
                type: "string",
            },
        ];
        let createdConnection: ConnectionDetailed | undefined = undefined;
        if (selectedMarketplaceItem) {
            const envMappingParam: Record<
                string,
                {
                    resourceId: string;
                    parameterReference: string;
                }
            > = {};

            envMappingParam[platformExtState?.selectedEnv?.templateId] = {
                resourceId: selectedMarketplaceItem.resourceId,
                parameterReference: selectedUserCredentialId,
            };

            createdConnection = await platformRpcClient.createDatabaseConnection({
                name: connectionName,
                orgId: platformExtState?.selectedContext?.org.id?.toString() || "",
                orgUuid: platformExtState?.selectedContext?.org?.uuid || "",
                projectId: platformExtState?.selectedContext?.project.id || "",
                componentId: platformExtState?.selectedComponent?.metadata?.id || "",
                serviceId: selectedMarketplaceItem?.resourceId,
                envMapping: envMappingParam,
                schemaReference: selectedMarketplaceItem?.connectionSchemas[0]?.id || "",
            });

            await platformRpcClient.createConnectionConfig({
                marketplaceItem: selectedMarketplaceItem,
                name: connectionName,
                visibility: "PUBLIC",
                componentDir: projectPath,
            });
        } else {
            const marketplaceService = await platformRpcClient.registerDevantMarketplaceService({
                name: connectionName,
                configs: newDevantConfigs,
                idlFilePath: "",
                idlType: "TCP",
                serviceType: "REST",
            });
            const isProjectLevel = !!!platformExtState?.selectedComponent?.metadata?.id;

            createdConnection = await platformRpcClient?.createThirdPartyConnection({
                componentId: isProjectLevel ? "" : platformExtState?.selectedComponent?.metadata?.id,
                name: connectionName,
                orgId: platformExtState?.selectedContext?.org.id?.toString(),
                orgUuid: platformExtState?.selectedContext?.org?.uuid,
                projectId: platformExtState?.selectedContext?.project.id,
                serviceSchemaId: marketplaceService.connectionSchemas[0]?.id,
                serviceId: marketplaceService.serviceId,
                endpointRefs: marketplaceService.endpointRefs,
                sensitiveKeys: marketplaceService.connectionSchemas[0].entries
                    ?.filter((item) => item.isSensitive)
                    .map((item) => item.name),
            });

            await platformRpcClient.createConnectionConfig({
                marketplaceItem: marketplaceService,
                name: connectionName,
                visibility: "PUBLIC",
                componentDir: projectPath,
            });
        }

        await platformRpcClient.replaceDevantTempConfigValues({
            configs: newDevantConfigs,
            createdConnection: createdConnection,
        });
    };

    const { data: dbConfigs = [] } = useQuery({
        queryKey: ["devant-db-configs", platformExtState?.selectedContext?.project, selectedMarketplaceItem],
        queryFn: () =>
            platformRpcClient.getDatabaseCredentials({
                orgId: platformExtState?.selectedContext?.org?.id?.toString() || "",
                databaseServerId: selectedMarketplaceItem?.resourceDetails?.databaseServerId || "",
            }),
        enabled: !!selectedMarketplaceItem,
        select: (resp) => {
            const configOptions: OptionProps[] = resp
                ?.filter(
                    (item) =>
                        item.applicable_environments.includes(platformExtState.selectedEnv?.templateId) &&
                        selectedMarketplaceItem.name === item.database_name,
                )
                .map((cfg) => ({ id: cfg.id, value: cfg.id, content: cfg.display_name }));
            return configOptions;
        },
    });

    useEffect(() => {
        if (dbConfigs?.length > 0 && !dbConfigs.some((cfg) => cfg.id === selectedUserCredentialId)) {
            setSelectedUserCredentialId(dbConfigs[0].id);
        }
    }, [dbConfigs, selectedUserCredentialId]);

    useEffect(() => {
        let dbName = credentials?.databaseName;
        if (selectedMarketplaceItem) {
            dbName = selectedMarketplaceItem.name;
        }
        const initialConnName = importedConnection
            ? importedConnection.name
            : generateInitialConnectionName(biConnectionNames, existingDevantConnNames, dbName);
        setConnectionName(initialConnName);
    }, [importedConnection, credentials, selectedMarketplaceItem, biConnectionNames, existingDevantConnNames]);

    const onClickCreateDb = async () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: `${devantConsoleUrl}/organizations/${platformExtState?.selectedContext?.org?.handle}/admin/databases`,
        });
    };

    const renderStepContent = () => {
        switch (selectedStep) {
            case DevantConnectionFlowStep.PERSIST_CONFIG:
                return (
                    <IntrospectDatabaseStep
                        credentials={
                            selectedMarketplaceItem && activeTab === "devantDatabases" ? tempCredentials : credentials
                        }
                        isIntrospecting={isIntrospecting}
                        introspectingError={introspectErr}
                        onDatabaseTypeChange={handleDatabaseTypeChange}
                        onCredentialsChange={handleCredentialsChange}
                        onIntrospect={() =>
                            runIntrospect({
                                creds: credentials,
                                goToNextStep: true,
                                mode: activeTab === "devantDatabases" ? "devantDb" : "thirdParty",
                            })
                        }
                        showTitle={false}
                        form={
                            <DatabaseCredentialsTabs
                                devantDatabases={devantDatabases}
                                isLoadingDatabases={isLoadingDatabases}
                                selectedDb={selectedMarketplaceItem || null}
                                onSelectDb={(db) => setSelectedMarketplaceItem(db)}
                                onTabChange={setActiveTab}
                                formProps={{
                                    credentials,
                                    isIntrospecting,
                                    onDatabaseTypeChange: handleDatabaseTypeChange,
                                    onCredentialsChange: handleCredentialsChange,
                                }}
                            />
                        }
                    />
                );
            case DevantConnectionFlowStep.PERSIST_SELECT_TABLES:
                return (
                    <SelectPersistTablesStep
                        tables={tables}
                        onTableToggle={handleTableToggleByName}
                        onSelectAll={handleSelectAllTables}
                        onContinue={goToNextStep}
                        isLoading={isIntrospecting}
                    />
                );
            case DevantConnectionFlowStep.PERSIST_CREATE_CONNECTION:
                return (
                    <CreatePersistConnectionStep
                        connectionName={connectionName}
                        credentials={credentials}
                        isSaving={isSavingDbConn}
                        error={saveDbConnError}
                        onConnectionNameChange={handleConnectionNameChange}
                        onSave={saveDatabaseConnection}
                        showConfigs={!selectedMarketplaceItem}
                        nameInputDisabled={!!importedConnection}
                        saveDisabled={importedConnection ? false : selectedMarketplaceItem && !selectedUserCredentialId}
                    >
                        {selectedMarketplaceItem && !importedConnection ? (
                            <>
                                <Dropdown
                                    id="userCredential"
                                    items={dbConfigs}
                                    label="Access Credentials"
                                    value={selectedUserCredentialId}
                                    onValueChange={(val) => setSelectedUserCredentialId(val)}
                                    errorMsg={selectedUserCredentialId ? "" : "Credential is required to proceed"}
                                />
                                <Typography variant="body2" sx={{ fontSize: "12px", margin: "5px 0" }}>
                                    Don't see your database credentials? Visit Devant to{" "}
                                    <VSCodeLink onClick={onClickCreateDb}>manage your database credentials</VSCodeLink>.
                                </Typography>
                            </>
                        ) : null}
                    </CreatePersistConnectionStep>
                );
            default:
                return null;
        }
    };

    return <ConnectorContentContainer hasFooterButton>{renderStepContent()}</ConnectorContentContainer>;
};
