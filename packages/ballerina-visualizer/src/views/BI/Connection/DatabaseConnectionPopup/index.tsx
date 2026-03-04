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

import React, { ReactNode, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import styled from "@emotion/styled";
import {
    Button,
    Codicon,
    ThemeColors,
    Typography,
    TextField,
    Dropdown,
    OptionProps,
    Icon,
    SearchBox,
    ProgressIndicator,
} from "@wso2/ui-toolkit";
import { Stepper } from "@wso2/ui-toolkit";
import { DIRECTORY_MAP, LinePosition, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    PopupOverlay,
    PopupContainer,
    PopupHeader,
    BackButton,
    HeaderTitleContainer,
    PopupTitle,
    PopupSubtitle,
    CloseButton,
} from "../styles";

const StepperContainer = styled.div`
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => (props.hasFooterButton ? "0" : "24px")};
    min-height: 0;
`;

const StepContent = styled.div<{ fillHeight?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow: auto;
    flex: 1;
    padding-bottom: 12px;
`;

const FooterContainer = styled.div`
    padding-bottom: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
`;

const SectionTitle = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const SectionSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ReadonlyValue = styled.div`
    padding: 5px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 2px;
    background: ${ThemeColors.SURFACE_CONTAINER};
    color: ${ThemeColors.ON_SURFACE};
    font-size: 14px;
    line-height: 20px;
    user-select: text;
`;

const ActionButton = styled(Button)`
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    display: flex !important;
    justify-content: center;
    align-items: center;
    align-self: stretch;
    box-sizing: border-box;

    & > div {
        width: 100% !important;
        max-width: 100% !important;
    }
`;

const TablesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 16px;
    position: relative;
`;

const TableCard = styled.div<{ selected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid
        ${(props: { selected?: boolean }) => (props.selected ? ThemeColors.PRIMARY : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 8px;
    background-color: ${(props: { selected?: boolean }) =>
        props.selected ? ThemeColors.PRIMARY_CONTAINER : ThemeColors.SURFACE_DIM};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${ThemeColors.PRIMARY};
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
    }
`;

const TableCheckbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
`;

const TableName = styled(Typography)`
    font-size: 14px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const SelectAllButton = styled(Button)`
    align-self: flex-end;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: fit-content;
`;

const SelectionInfo = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ConfigurablesPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    margin-top: 16px;
`;

const ConfigurablesDescription = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
    line-height: 1.5;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    border: 1px solid ${ThemeColors.ERROR};
    margin-top: 16px;
`;

const ErrorHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ErrorTitle = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ERROR};
    margin: 0;
`;

const SeparatorLine = styled.div`
    width: 100%;
    height: 1px;
    background-color: ${ThemeColors.OUTLINE_VARIANT};
    opacity: 0.5;
`;

const ErrorDetailsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ErrorDetailsHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;

    &:hover {
        opacity: 0.8;
    }
`;

const ChevronIcon = styled(Codicon)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

const ErrorDetailsContent = styled.div<{ expanded: boolean }>`
    max-height: ${(props: { expanded: boolean }) => (props.expanded ? "500px" : "0")};
    overflow: hidden;
    transition: max-height 0.3s ease;
    padding-left: 20px;
`;

const ErrorDetailsText = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 8px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    border-radius: 4px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const BrowseMoreButton = styled(Button)`
    margin-top: 0;
    width: 100% !important;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--vscode-button-secondaryBackground, #3c3c3c) !important;
    color: var(--vscode-button-secondaryForeground, #ffffff) !important;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground, #4a4a4a) !important;
    }

    & > span {
        color: var(--vscode-button-secondaryForeground, #ffffff) !important;
    }
`;

interface DatabaseConnectionPopupProps {
    fileName: string;
    target?: LinePosition;
    onClose?: (data?: ParentPopupData) => void;
    onBack?: () => void;
    onBrowseConnectors?: () => void;
}

export type BIDatabaseType = "PostgreSQL" | "MySQL" | "MSSQL";

export interface DatabaseCredentials {
    databaseType: BIDatabaseType;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
}

export interface DatabaseTable {
    name: string;
    selected: boolean;
}

const DATABASE_TYPES: OptionProps[] = [
    { id: "postgresql", value: "PostgreSQL", content: "PostgreSQL" },
    { id: "mysql", value: "MySQL", content: "MySQL" },
    { id: "mssql", value: "MSSQL", content: "MSSQL" },
];

export const DEFAULT_DB_PORTS: Record<BIDatabaseType, number> = {
    PostgreSQL: 5432,
    MySQL: 3306,
    MSSQL: 1433,
};

const DB_SYSTEM_MAP: Record<BIDatabaseType, string> = {
    PostgreSQL: "postgresql",
    MySQL: "mysql",
    MSSQL: "mssql",
};

// ─── Introspect database API call ─────────────────────────────────────────────

export async function handleIntrospectDatabase(
    rpcClient: ReturnType<typeof useRpcContext>["rpcClient"],
    credentials: DatabaseCredentials,
): Promise<string[]> {
    try {
        const { projectPath } = await rpcClient.getVisualizerLocation();

        const response = await rpcClient.getConnectorWizardRpcClient().introspectDatabase({
            projectPath,
            dbSystem: DB_SYSTEM_MAP[credentials.databaseType],
            host: credentials.host,
            port: credentials.port,
            database: credentials.databaseName,
            user: credentials.username,
            password: credentials.password,
        });

        if (response.errorMsg) {
            if (response.errorMsg.toLowerCase().includes("no tables found")) {
                throw new Error(
                    "No tables were found in the database. Currently, connection creation requires at least one table.",
                );
            }
            throw new Error(
                "Unable to connect to the database. Please verify your credentials and ensure the database server is accessible.",
                { cause: response.errorMsg },
            );
        }

        if (response.tables && response.tables.length > 0) {
            return response.tables;
        }
        throw new Error(
            "No tables found in the database. We cannot continue with connection creation. Please use a pre-built connector.",
        );
    } catch (error) {
        throw new Error(
            "Unable to connect to the database. Please verify your credentials and ensure the database server is accessible.",
            { cause: error instanceof Error ? error.cause || error.message : String(error) },
        );
    }
}

export async function handleSaveDbConnection(
    connectionName: string,
    tables: DatabaseTable[],
    rpcClient: ReturnType<typeof useRpcContext>["rpcClient"],
    credentials: DatabaseCredentials,
): Promise<void> {
    try {
        const visualizerLocation = await rpcClient.getVisualizerLocation();
        const projectPath = visualizerLocation.projectPath;

        const selectedTableNames = tables.filter((t) => t.selected).map((t) => t.name);
        const allTablesSelected = tables.length > 0 && selectedTableNames.length === tables.length;
        const selectedTables = allTablesSelected ? ["*"] : selectedTableNames;

        const response = await rpcClient.getConnectorWizardRpcClient().persistClientGenerate({
            projectPath: projectPath,
            name: connectionName,
            dbSystem: DB_SYSTEM_MAP[credentials.databaseType],
            host: credentials.host,
            port: credentials.port,
            user: credentials.username,
            password: credentials.password,
            database: credentials.databaseName,
            selectedTables: selectedTables,
        });

        if (response.errorMsg) {
            console.error(">>> Error creating connection", response.errorMsg);
            throw new Error("Unable to create the connection. Please check the error details below.", {
                cause: response.errorMsg,
            });
        }

        if (response.source?.textEditsMap) {
            console.log(
                ">>> Connection created successfully with text edits",
                Object.keys(response.source.textEditsMap),
            );
        }
        if (response.source?.isModuleExists !== undefined) {
            console.log(">>> Module exists:", response.source.isModuleExists);
        }
    } catch (error) {
        throw new Error(
            "An unexpected error occurred while creating the connection. Please check the error details below.",
            { cause: error instanceof Error ? error.cause || error.message : String(error) },
        );
    }
}

// ─── Shared ErrorDisplay ──────────────────────────────────────────────────────

interface ErrorDisplayProps {
    error: Error;
    onBrowseConnectors?: () => void;
}

function ErrorDisplay({ error, onBrowseConnectors }: ErrorDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!error) return null;

    return (
        <ErrorContainer>
            <ErrorHeader>
                <Icon
                    name="bi-error"
                    sx={{ color: ThemeColors.ERROR, fontSize: "20px", width: "20px", height: "20px" }}
                />
                <ErrorTitle variant="h4">Connection Failed</ErrorTitle>
            </ErrorHeader>
            <Typography variant="body2">{error.message}</Typography>
            {error.cause && typeof error.cause === "string" && (
                <ErrorDetailsSection>
                    <ErrorDetailsHeader onClick={() => setIsExpanded((prev) => !prev)}>
                        <ChevronIcon name={isExpanded ? "chevron-down" : "chevron-right"} />
                        <Typography
                            variant="body2"
                            sx={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: "12px", margin: 0 }}
                        >
                            Error Details
                        </Typography>
                    </ErrorDetailsHeader>
                    <ErrorDetailsContent expanded={isExpanded}>
                        <ErrorDetailsText>{error.cause}</ErrorDetailsText>
                    </ErrorDetailsContent>
                </ErrorDetailsSection>
            )}
            <SeparatorLine />
            {onBrowseConnectors && (
                <>
                    <Typography variant="body2">Need an alternative solution?</Typography>
                    <Typography variant="body2" sx={{ fontSize: "12px", color: ThemeColors.ON_SURFACE_VARIANT }}>
                        You can use a pre-built connector from the connector catalog instead.
                    </Typography>
                    <BrowseMoreButton appearance="secondary" onClick={onBrowseConnectors} buttonSx={{ width: "100%" }}>
                        Browse Pre-built Connectors
                    </BrowseMoreButton>
                </>
            )}
        </ErrorContainer>
    );
}

// ─── Step 1: Introspect Database ──────────────────────────────────────────────

interface IntrospectDatabaseStepFormProps {
    credentials: DatabaseCredentials;
    isIntrospecting: boolean;
    onDatabaseTypeChange: (value: string) => void;
    onCredentialsChange: (field: keyof DatabaseCredentials, value: string) => void;
}

export function IntrospectDatabaseStepForm(props: IntrospectDatabaseStepFormProps) {
    const { credentials, onDatabaseTypeChange, onCredentialsChange, isIntrospecting } = props;
    return (
        <FormSection>
            <FormField>
                <Dropdown
                    id="database-type"
                    label="Database Type"
                    items={DATABASE_TYPES}
                    value={credentials.databaseType}
                    onValueChange={onDatabaseTypeChange}
                    disabled={isIntrospecting}
                />
            </FormField>
            <FormField>
                <TextField
                    id="host"
                    label="Host"
                    placeholder="Database host"
                    value={credentials.host}
                    onTextChange={(value) => onCredentialsChange("host", value)}
                    {...(isIntrospecting ? { readonly: true } : {})}
                />
            </FormField>
            <FormField>
                <TextField
                    id="port"
                    label="Port"
                    placeholder="Database port"
                    value={String(credentials.port)}
                    onTextChange={(value) => onCredentialsChange("port", value)}
                    {...(isIntrospecting ? { readonly: true } : {})}
                />
            </FormField>
            <FormField>
                <TextField
                    id="database-name"
                    label="Database Name"
                    placeholder="Database name"
                    value={credentials.databaseName}
                    onTextChange={(value) => onCredentialsChange("databaseName", value)}
                    {...(isIntrospecting ? { readonly: true } : {})}
                />
            </FormField>
            <FormField>
                <TextField
                    id="username"
                    label="Username"
                    placeholder="Database username"
                    value={credentials.username}
                    onTextChange={(value) => onCredentialsChange("username", value)}
                    {...(isIntrospecting ? { readonly: true } : {})}
                />
            </FormField>
            <FormField>
                <TextField
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Database password"
                    value={credentials.password}
                    onTextChange={(value) => onCredentialsChange("password", value)}
                    {...(isIntrospecting ? { readonly: true } : {})}
                />
            </FormField>
        </FormSection>
    );
}

interface IntrospectDatabaseStepProps {
    credentials: DatabaseCredentials;
    isIntrospecting: boolean;
    introspectingError?: Error;
    onDatabaseTypeChange: (value: string) => void;
    onCredentialsChange: (field: keyof DatabaseCredentials, value: string) => void;
    onBrowseConnectors?: () => void;
    onIntrospect: () => void;
    form?: ReactNode;
    showTitle?: boolean;
}

export function IntrospectDatabaseStep(props: IntrospectDatabaseStepProps) {
    const { credentials, isIntrospecting, introspectingError, onBrowseConnectors, onIntrospect, showTitle, form } =
        props;
    return (
        <>
            <StepContent fillHeight={true}>
                {showTitle && (
                    <div>
                        <SectionTitle variant="h3">Database Credentials</SectionTitle>
                        <SectionSubtitle variant="body2">
                            Enter credentials to connect and introspect the database
                        </SectionSubtitle>
                    </div>
                )}

                <ErrorDisplay error={introspectingError} onBrowseConnectors={onBrowseConnectors} />
                {form ? form : <IntrospectDatabaseStepForm {...props} />}
            </StepContent>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={onIntrospect}
                    disabled={
                        !credentials.host ||
                        !credentials.databaseName ||
                        !credentials.username ||
                        isIntrospecting ||
                        !!introspectingError
                    }
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    {isIntrospecting ? "Connecting..." : "Connect & Introspect Database"}
                </ActionButton>
            </FooterContainer>
        </>
    );
}

// ─── Step 2: Select Tables ────────────────────────────────────────────────────

interface SelectTablesStepProps {
    tables: DatabaseTable[];
    onTableToggle: (name: string) => void;
    onSelectAll: () => void;
    onContinue: () => void;
    isLoading?: boolean;
}

export function SelectPersistTablesStep({ tables, onTableToggle, onSelectAll, onContinue, isLoading }: SelectTablesStepProps) {
    const [tableSearch, setTableSearch] = useState("");

    const filteredTables = useMemo(
        () => tables.filter((t) => t.name.toLowerCase().includes(tableSearch.trim().toLowerCase())),
        [tables, tableSearch],
    );

    const selectedTablesCount = tables.filter((t) => t.selected).length;
    const totalTablesCount = tables.length;
    return (
        <>
            <StepContent fillHeight={true} style={{ gap: "16px" }}>
                <SelectionInfo>
                    <div>
                        <SectionTitle variant="h3">Select Tables</SectionTitle>
                        <SectionSubtitle variant="body2">
                            Choose which tables to include in this connector
                        </SectionSubtitle>
                    </div>
                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                        {selectedTablesCount} of {totalTablesCount} selected
                    </Typography>
                </SelectionInfo>
                <SearchRow>
                    <SearchBox
                        value={tableSearch}
                        placeholder="Search tables..."
                        onChange={setTableSearch}
                        sx={{ flex: 1 }}
                    />
                    <SelectAllButton appearance="secondary" onClick={onSelectAll}>
                        {selectedTablesCount === totalTablesCount && totalTablesCount > 0
                            ? "Deselect All"
                            : "Select All"}
                    </SelectAllButton>
                </SearchRow>
                <TablesGrid>
                    {isLoading && <ProgressIndicator/>}
                    {filteredTables.map((table) => (
                        <TableCard key={table.name} selected={table.selected} onClick={() => onTableToggle(table.name)}>
                            <TableCheckbox
                                type="checkbox"
                                checked={table.selected}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onTableToggle(table.name);
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <TableName variant="body1">{table.name}</TableName>
                        </TableCard>
                    ))}
                </TablesGrid>
            </StepContent>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={onContinue}
                    disabled={selectedTablesCount === 0}
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    Continue to Connection Details
                </ActionButton>
            </FooterContainer>
        </>
    );
}

// ─── Step 3: Create Connection ────────────────────────────────────────────────

interface CreateConnectionStepProps {
    connectionName: string;
    credentials: DatabaseCredentials;
    isSaving: boolean;
    error?: Error;
    onConnectionNameChange: (value: string) => void;
    onBrowseConnectors?: () => void;
    onSave: () => void;
    showConfigs?: boolean;
    children?: ReactNode;
    nameInputDisabled?: boolean;
    saveDisabled?: boolean;
}

export function CreatePersistConnectionStep({
    connectionName,
    credentials,
    isSaving,
    error,
    onConnectionNameChange,
    onBrowseConnectors,
    onSave,
    showConfigs = true,
    nameInputDisabled,
    children,
    saveDisabled
}: CreateConnectionStepProps) {
    return (
        <>
            <StepContent fillHeight={true} style={{ gap: "16px" }}>
                <div>
                    <SectionTitle variant="h3">Connection Details</SectionTitle>
                    <SectionSubtitle variant="body2">
                        Name your connection and configure default values for configurables
                    </SectionSubtitle>
                </div>
                <ErrorDisplay error={error} onBrowseConnectors={onBrowseConnectors} />
                <FormSection>
                    <FormField>
                        <TextField
                            id="connection-name"
                            label="Connection Name"
                            placeholder="Database connection name"
                            value={connectionName}
                            onTextChange={onConnectionNameChange}
                            {...(isSaving || nameInputDisabled ? { readonly: true } : {})}
                        />
                    </FormField>
                </FormSection>
                {showConfigs && (
                    <ConfigurablesPanel>
                        <div style={{ gap: "4px" }}>
                            <SectionTitle variant="h4">Connection Configurables</SectionTitle>
                            <ConfigurablesDescription>
                                Configurables will be generated for the connection host, port, username, password, and
                                database name, with default values specified below.
                            </ConfigurablesDescription>
                        </div>
                        <FormSection>
                            <FormField>
                                <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                    {connectionName ? `${connectionName}Host` : "Host"}
                                </Typography>
                                <ReadonlyValue>{credentials.host}</ReadonlyValue>
                            </FormField>
                            <FormField>
                                <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                    {connectionName ? `${connectionName}Port` : "Port"}
                                </Typography>
                                <ReadonlyValue>{credentials.port}</ReadonlyValue>
                            </FormField>
                            <FormField>
                                <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                    {connectionName ? `${connectionName}User` : "Username"}
                                </Typography>
                                <ReadonlyValue>{credentials.username}</ReadonlyValue>
                            </FormField>
                            <FormField>
                                <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                    {connectionName ? `${connectionName}Database` : "Database Name"}
                                </Typography>
                                <ReadonlyValue>{credentials.databaseName}</ReadonlyValue>
                            </FormField>
                        </FormSection>
                    </ConfigurablesPanel>
                )}
                {children}
            </StepContent>
            <FooterContainer>
                <ActionButton
                    appearance="primary"
                    onClick={onSave}
                    disabled={!connectionName || isSaving || saveDisabled}
                    buttonSx={{ width: "100%", height: "35px" }}
                >
                    {isSaving ? "Saving..." : "Save Connection"}
                </ActionButton>
            </FooterContainer>
        </>
    );
}

// ─── Content (state + logic + stepper + step rendering) ──────────────────────

interface DatabaseConnectionPopupContentProps {
    fileName: string;
    target?: LinePosition;
    onClose?: (data?: ParentPopupData) => void;
    onBrowseConnectors?: () => void;
}

export function DatabaseConnectionPopupContent(props: DatabaseConnectionPopupContentProps) {
    const { onClose, onBrowseConnectors } = props;
    const { rpcClient } = useRpcContext();
    const [currentStep, setCurrentStep] = useState(0);
    const [credentials, setCredentials] = useState<DatabaseCredentials>({
        databaseType: "MySQL",
        host: "",
        port: 3306,
        databaseName: "",
        username: "",
        password: "",
    });
    const [tables, setTables] = useState<DatabaseTable[]>([]);
    const [connectionName, setConnectionName] = useState("");
    const steps = ["Introspect Database", "Select Tables", "Create Connection"];

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

    const {
        mutate: runIntrospect,
        isPending: isIntrospecting,
        error: introspectErr,
    } = useMutation({
        mutationFn: (creds: DatabaseCredentials) => handleIntrospectDatabase(rpcClient, creds),
        onSuccess: (tables) => {
            setTables(tables.map((name) => ({ name, selected: false })));
            setCurrentStep(1);
        },
        onError: (error) => {
            console.error(">>> Error introspecting database", error);
        },
    });

    const {
        mutate: saveDatabaseConnection,
        isPending: isSavingDbConn,
        error: saveDbConnError,
    } = useMutation({
        mutationFn: () => handleSaveDbConnection(connectionName, tables, rpcClient, credentials),
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

    const handleContinueToConnectionDetails = () => {
        setCurrentStep(2);
    };

    const handleConnectionNameChange = (value: string) => {
        setConnectionName(value);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <IntrospectDatabaseStep
                        credentials={credentials}
                        isIntrospecting={isIntrospecting}
                        introspectingError={introspectErr}
                        onDatabaseTypeChange={handleDatabaseTypeChange}
                        onCredentialsChange={handleCredentialsChange}
                        onBrowseConnectors={onBrowseConnectors}
                        onIntrospect={() => runIntrospect(credentials)}
                    />
                );
            case 1:
                return (
                    <SelectPersistTablesStep
                        tables={tables}
                        onTableToggle={handleTableToggleByName}
                        onSelectAll={handleSelectAllTables}
                        onContinue={handleContinueToConnectionDetails}
                    />
                );
            case 2:
                return (
                    <CreatePersistConnectionStep
                        connectionName={connectionName}
                        credentials={credentials}
                        isSaving={isSavingDbConn}
                        error={saveDbConnError}
                        onConnectionNameChange={handleConnectionNameChange}
                        onBrowseConnectors={onBrowseConnectors}
                        onSave={saveDatabaseConnection}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <StepperContainer>
                <Stepper steps={steps} currentStep={currentStep} alignment="flex-start" />
            </StepperContainer>
            <ContentContainer hasFooterButton>{renderStepContent()}</ContentContainer>
        </>
    );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function DatabaseConnectionPopup(props: DatabaseConnectionPopupProps) {
    const { fileName, target, onClose, onBack, onBrowseConnectors } = props;

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <PopupHeader>
                    <BackButton appearance="icon" onClick={onBack}>
                        <Codicon name="chevron-left" />
                    </BackButton>
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">Connect to a Database</PopupTitle>
                        <PopupSubtitle variant="body2">
                            Enter database credentials to introspect and discover available tables
                        </PopupSubtitle>
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={() => onClose?.()}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                <DatabaseConnectionPopupContent
                    fileName={fileName}
                    target={target}
                    onClose={onClose}
                    onBrowseConnectors={onBrowseConnectors}
                />
            </PopupContainer>
        </>
    );
}

export default DatabaseConnectionPopup;
