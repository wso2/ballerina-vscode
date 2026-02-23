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

import React, { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ThemeColors, Typography, TextField, Dropdown, OptionProps, Icon, SearchBox } from "@wso2/ui-toolkit";
import { Stepper } from "@wso2/ui-toolkit";
import { DIRECTORY_MAP, LinePosition, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PopupOverlay, PopupContainer, PopupHeader, BackButton, HeaderTitleContainer, PopupTitle, PopupSubtitle, CloseButton } from "../styles";

const StepperContainer = styled.div`
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "0" : "24px"};
    min-height: 0;
`;

const StepContent = styled.div<{ fillHeight?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 24px;
    ${(props: { fillHeight?: boolean }) => props.fillHeight && `
        flex: 1;
        min-height: 0;
        height: 100%;
    `}
`;

const FooterContainer = styled.div`
    position: sticky;
    bottom: 0;
    padding: 20px 32px;
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
`;

const TableCard = styled.div<{ selected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid ${(props: { selected?: boolean }) => (props.selected ? ThemeColors.PRIMARY : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 8px;
    background-color: ${(props: { selected?: boolean }) => (props.selected ? ThemeColors.PRIMARY_CONTAINER : ThemeColors.SURFACE_DIM)};
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

type DatabaseType = "PostgreSQL" | "MySQL" | "MSSQL";

interface DatabaseCredentials {
    databaseType: DatabaseType;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
}

interface DatabaseTable {
    name: string;
    selected: boolean;
}

interface LSErrorDetails {
    errorMessage: string | null;
    isExpanded: boolean;
}

const DATABASE_TYPES: OptionProps[] = [
    { id: "postgresql", value: "PostgreSQL", content: "PostgreSQL" },
    { id: "mysql", value: "MySQL", content: "MySQL" },
    { id: "mssql", value: "MSSQL", content: "MSSQL" },
];

const DEFAULT_PORTS: Record<DatabaseType, number> = {
    PostgreSQL: 5432,
    MySQL: 3306,
    MSSQL: 1433,
};

export function DatabaseConnectionPopup(props: DatabaseConnectionPopupProps) {
    const { fileName, target, onClose, onBack, onBrowseConnectors } = props;
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
    const [isIntrospecting, setIsIntrospecting] = useState(false);
    const [connectionName, setConnectionName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [lsErrorDetails, setLsErrorDetails] = useState<LSErrorDetails>({
        errorMessage: null,
        isExpanded: false,
    });
    const [tableSearch, setTableSearch] = useState("");

    const steps = ["Introspect Database", "Select Tables", "Create Connection"];

    const handleDatabaseTypeChange = (value: string) => {
        const dbType = value as DatabaseType;
        setCredentials({
            ...credentials,
            databaseType: dbType,
            port: DEFAULT_PORTS[dbType],
        });
    };

    const handleCredentialsChange = (field: keyof DatabaseCredentials, value: string) => {
        setCredentials({
            ...credentials,
            [field]: field === "port" ? Number(value) : value,
        });
        // Clear error when user modifies credentials
        if (connectionError) {
            setConnectionError(null);
            setLsErrorDetails({ errorMessage: null, isExpanded: false });
        }
    };

    const handleIntrospect = async () => {
        setIsIntrospecting(true);
        setConnectionError(null);
        try {
            // Map database type to dbSystem format expected by RPC
            const dbSystemMap: Record<DatabaseType, string> = {
                PostgreSQL: "postgresql",
                MySQL: "mysql",
                MSSQL: "mssql",
            };

            const visualizerLocation = await rpcClient.getVisualizerLocation();
            const projectPath = visualizerLocation.projectPath;

            const response = await rpcClient.getConnectorWizardRpcClient().introspectDatabase({
                projectPath: projectPath,
                dbSystem: dbSystemMap[credentials.databaseType],
                host: credentials.host,
                port: credentials.port,
                database: credentials.databaseName,
                user: credentials.username,
                password: credentials.password,
            });

            if (response.errorMsg) {
                console.error(">>> Error introspecting database", response.errorMsg);
                const errorMsg = response.errorMsg.toLowerCase();
                if (errorMsg.includes("no tables found")) {
                    setConnectionError("No tables were found in the database. Currently, connection creation requires at least one table.");
                } else {
                    setConnectionError("Unable to connect to the database. Please verify your credentials and ensure the database server is accessible.");
                }
                setLsErrorDetails({ errorMessage: response.errorMsg, isExpanded: false });
                // Clear password field on error
                setCredentials(prev => ({ ...prev, password: "" }));
                return;
            }

            if (response.tables && response.tables.length > 0) {
                const databaseTables: DatabaseTable[] = response.tables.map((tableName) => ({
                    name: tableName,
                    selected: false,
                }));
                setTables(databaseTables);
                setCurrentStep(1);
                setConnectionError(null);
                setLsErrorDetails({ errorMessage: null, isExpanded: false });
            } else {
                console.warn(">>> No tables found in database");
                setConnectionError("No tables found in the database. We cannot continue with connection creation. Please use a pre-built connector.");
                setLsErrorDetails({ errorMessage: null, isExpanded: false });
                // Clear password field on error
                setCredentials(prev => ({ ...prev, password: "" }));
            }
        } catch (error) {
            console.error(">>> Error introspecting database", error);
            setConnectionError("Unable to connect to the database. Please verify your credentials and ensure the database server is accessible.");
            setLsErrorDetails({ errorMessage: null, isExpanded: false });
            // Clear password field on error
            setCredentials(prev => ({ ...prev, password: "" }));
        } finally {
            setIsIntrospecting(false);
        }
    };

    const handleTableToggleByName = (name: string) => {
        setTables((prev) =>
            prev.map((t) =>
                t.name === name ? { ...t, selected: !t.selected } : t
            )
        );
    };

    const handleSelectAll = () => {
        const allSelected = tables.every((table) => table.selected);
        setTables(tables.map((table) => ({ ...table, selected: !allSelected })));
    };

    const handleContinueToConnectionDetails = () => {
        setCurrentStep(2);
    };

    const handleSaveConnection = async () => {
        setIsSaving(true);
        try {
            // Get project path
            const visualizerLocation = await rpcClient.getVisualizerLocation();
            const projectPath = visualizerLocation.projectPath;

            // Map database type to dbSystem format expected by RPC
            const dbSystemMap: Record<DatabaseType, string> = {
                PostgreSQL: "postgresql",
                MySQL: "mysql",
                MSSQL: "mssql",
            };

            // Get selected tables - if all tables are selected, use ["*"]
            const selectedTableNames = tables.filter((t) => t.selected).map((t) => t.name);
            const allTablesSelected = tables.length > 0 && selectedTableNames.length === tables.length;
            const selectedTables = allTablesSelected ? ["*"] : selectedTableNames;

            const response = await rpcClient.getConnectorWizardRpcClient().persistClientGenerate({
                projectPath: projectPath,
                name: connectionName,
                dbSystem: dbSystemMap[credentials.databaseType],
                host: credentials.host,
                port: credentials.port,
                user: credentials.username,
                password: credentials.password,
                database: credentials.databaseName,
                selectedTables: selectedTables,
            });

            if (response.errorMsg) {
                console.error(">>> Error saving connection", response.errorMsg);
                setConnectionError("Failed to save the connection. Please try again.");
                return;
            }

            // Log success and text edits info if available
            if (response.source?.textEditsMap) {
                console.log(">>> Connection created successfully with text edits", Object.keys(response.source.textEditsMap));
            }
            if (response.source?.isModuleExists !== undefined) {
                console.log(">>> Module exists:", response.source.isModuleExists);
            }


            onClose?.({ recentIdentifier: connectionName, artifactType: DIRECTORY_MAP.CONNECTION });
        } catch (error) {
            console.error(">>> Error saving connection", error);
            setConnectionError("Failed to save the connection. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBrowseMoreConnectors = () => {
        if (onBrowseConnectors) {
            onBrowseConnectors();
        } else {
            // Fallback: close this popup and let parent handle navigation
            onClose?.();
        }
    };

    const selectedTablesCount = tables.filter((t) => t.selected).length;
    const totalTablesCount = tables.length;
    const filteredTables = useMemo(
        () =>
            tables.filter((t) =>
                t.name.toLowerCase().includes(tableSearch.trim().toLowerCase())
            ),
        [tables, tableSearch]
    );

    const renderErrorDisplay = () => {
        if (!connectionError) return null;

        return (
            <ErrorContainer>
                <ErrorHeader>
                    <Icon name="bi-error" sx={{ color: ThemeColors.ERROR, fontSize: '20px', width: '20px', height: '20px' }} />
                    <ErrorTitle variant="h4">Connection Failed</ErrorTitle>
                </ErrorHeader>
                <Typography variant="body2">
                    {connectionError}
                </Typography>
                {lsErrorDetails.errorMessage && (
                    <ErrorDetailsSection>
                        <ErrorDetailsHeader onClick={() => setLsErrorDetails(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}>
                            <ChevronIcon name={lsErrorDetails.isExpanded ? "chevron-down" : "chevron-right"} />
                            <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px', margin: 0 }}>
                                Error Details
                            </Typography>
                        </ErrorDetailsHeader>
                        <ErrorDetailsContent expanded={lsErrorDetails.isExpanded}>
                            <ErrorDetailsText>
                                {lsErrorDetails.errorMessage}
                            </ErrorDetailsText>
                        </ErrorDetailsContent>
                    </ErrorDetailsSection>
                )}
                <SeparatorLine />
                <Typography variant="body2">
                    Or try using a pre-built connector:
                </Typography>
                <BrowseMoreButton appearance="secondary" onClick={handleBrowseMoreConnectors} buttonSx={{ width: "100%" }}>
                    Browse Pre-built Connectors
                </BrowseMoreButton>
            </ErrorContainer>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <StepContent fillHeight={true}>
                        <div>
                            <SectionTitle variant="h3">Database Credentials</SectionTitle>
                            <SectionSubtitle variant="body2">
                                Enter credentials to connect and introspect the database
                            </SectionSubtitle>
                        </div>
                        {renderErrorDisplay()}
                        <FormSection>
                            <FormField>
                                <Dropdown
                                    id="database-type"
                                    label="Database Type"
                                    items={DATABASE_TYPES}
                                    value={credentials.databaseType}
                                    onValueChange={handleDatabaseTypeChange}
                                    disabled={isIntrospecting}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="host"
                                    label="Host"
                                    placeholder="Database host"
                                    value={credentials.host}
                                    onTextChange={(value) => handleCredentialsChange("host", value)}
                                    {...(isIntrospecting ? { readonly: true } : {})}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="port"
                                    label="Port"
                                    placeholder="Database port"
                                    value={String(credentials.port)}
                                    onTextChange={(value) => handleCredentialsChange("port", value)}
                                    {...(isIntrospecting ? { readonly: true } : {})}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="database-name"
                                    label="Database Name"
                                    placeholder="Database name"
                                    value={credentials.databaseName}
                                    onTextChange={(value) => handleCredentialsChange("databaseName", value)}
                                    {...(isIntrospecting ? { readonly: true } : {})}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="username"
                                    label="Username"
                                    placeholder="Database username"
                                    value={credentials.username}
                                    onTextChange={(value) => handleCredentialsChange("username", value)}
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
                                    onTextChange={(value) => handleCredentialsChange("password", value)}
                                    {...(isIntrospecting ? { readonly: true } : {})}
                                />
                            </FormField>
                        </FormSection>
                    </StepContent>
                );

            case 1:
                return (
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
                            <SelectAllButton appearance="secondary" onClick={handleSelectAll}>
                                {selectedTablesCount === totalTablesCount && totalTablesCount > 0 ? "Deselect All" : "Select All"}
                            </SelectAllButton>
                        </SearchRow>
                        <TablesGrid>
                            {filteredTables.map((table) => (
                                <TableCard
                                    key={table.name}
                                    selected={table.selected}
                                    onClick={() => handleTableToggleByName(table.name)}
                                >
                                    <TableCheckbox
                                        type="checkbox"
                                        checked={table.selected}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleTableToggleByName(table.name);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <TableName variant="body1">{table.name}</TableName>
                                </TableCard>
                            ))}
                        </TablesGrid>
                    </StepContent>
                );

            case 2:
                return (
                    <StepContent fillHeight={true} style={{ gap: "16px" }}>
                        <div>
                            <SectionTitle variant="h3">Connection Details</SectionTitle>
                            <SectionSubtitle variant="body2">
                                Name your connection and configure default values for configurables
                            </SectionSubtitle>
                        </div>
                        <FormSection>
                            <FormField>
                                <TextField
                                    id="connection-name"
                                    label="Connection Name"
                                    placeholder="Database connection name"
                                    value={connectionName}
                                    onTextChange={setConnectionName}
                                    {...(isSaving ? { readonly: true } : {})}
                                />
                            </FormField>
                        </FormSection>
                        <ConfigurablesPanel>
                            <div style={{ gap: "4px" }}>
                                <SectionTitle variant="h4">Connection Configurables</SectionTitle>
                                <ConfigurablesDescription>
                                    Configurables will be generated for the connection host, port, username, password, and database name, with default values specified below.
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
                    </StepContent>
                );

            default:
                return null;
        }
    };

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
                <StepperContainer>
                    <Stepper steps={steps} currentStep={currentStep} alignment="flex-start" />
                </StepperContainer>
                <ContentContainer hasFooterButton={true}>{renderStepContent()}</ContentContainer>
                {currentStep === 0 && (
                    <FooterContainer>
                        <ActionButton
                            appearance="primary"
                            onClick={handleIntrospect}
                            disabled={!credentials.host || !credentials.databaseName || !credentials.username || isIntrospecting || !!connectionError}
                            buttonSx={{ width: "100%", height: "35px" }}
                        >
                            {isIntrospecting ? "Connecting..." : "Connect & Introspect Database"}
                        </ActionButton>
                    </FooterContainer>
                )}
                {currentStep === 1 && (
                    <FooterContainer>
                        <ActionButton
                            appearance="primary"
                            onClick={handleContinueToConnectionDetails}
                            disabled={selectedTablesCount === 0 || !!connectionError}
                            buttonSx={{ width: "100%", height: "35px" }}
                        >
                            Continue to Connection Details
                        </ActionButton>
                    </FooterContainer>
                )}
                {currentStep === 2 && (
                    <FooterContainer>
                        <ActionButton
                            appearance="primary"
                            onClick={handleSaveConnection}
                            disabled={!connectionName || isSaving}
                            buttonSx={{ width: "100%", height: "35px" }}
                        >
                            {isSaving ? "Saving..." : "Save Connection"}
                        </ActionButton>
                    </FooterContainer>
                )}
            </PopupContainer>
        </>
    );
}

export default DatabaseConnectionPopup;

