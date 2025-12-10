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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ThemeColors, Typography, Overlay, TextField, Dropdown, OptionProps } from "@wso2/ui-toolkit";
import { Stepper } from "@wso2/ui-toolkit";
import { LinePosition, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const PopupOverlay = styled(Overlay)`
    z-index: 1999;
`;

const PopupContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 800px;
    height: 80%;
    max-height: 800px;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const BackButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const HeaderTitleContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PopupTitle = styled(Typography)`
    font-size: 20px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const PopupSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const CloseButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const StepperContainer = styled.div`
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ContentContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
`;

const StepContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
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

const ActionButton = styled(Button)`
    width: 100%;
    margin-top: 24px;
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
    margin-top: 16px;
    align-self: flex-start;
`;

const SelectionInfo = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
`;

const ActionButtonsContainer = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
`;

interface DatabaseConnectionPopupProps {
    fileName: string;
    target?: LinePosition;
    onClose?: (data?: ParentPopupData) => void;
    onBack?: () => void;
}

type DatabaseType = "PostgreSQL" | "MySQL" | "MSSQL";

interface DatabaseCredentials {
    databaseType: DatabaseType;
    host: string;
    port: string;
    databaseName: string;
    username: string;
    password: string;
}

interface DatabaseTable {
    name: string;
    selected: boolean;
}

const DATABASE_TYPES: OptionProps[] = [
    { id: "postgresql", value: "PostgreSQL", content: "PostgreSQL" },
    { id: "mysql", value: "MySQL", content: "MySQL" },
    { id: "mssql", value: "MSSQL", content: "MSSQL" },
];

const DEFAULT_PORTS: Record<DatabaseType, string> = {
    PostgreSQL: "5432",
    MySQL: "3306",
    MSSQL: "1433",
};

export function DatabaseConnectionPopup(props: DatabaseConnectionPopupProps) {
    const { fileName, target, onClose, onBack } = props;
    const { rpcClient } = useRpcContext();

    const [currentStep, setCurrentStep] = useState(0);
    const [credentials, setCredentials] = useState<DatabaseCredentials>({
        databaseType: "PostgreSQL",
        host: "",
        port: "5432",
        databaseName: "mydb",
        username: "",
        password: "",
    });
    const [tables, setTables] = useState<DatabaseTable[]>([]);
    const [isIntrospecting, setIsIntrospecting] = useState(false);
    const [connectionName, setConnectionName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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
            [field]: value,
        });
    };

    const handleIntrospect = async () => {
        setIsIntrospecting(true);
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
                // TODO: Show error message to user
                return;
            }

            if (response.tables && response.tables.length > 0) {
                const databaseTables: DatabaseTable[] = response.tables.map((tableName) => ({
                    name: tableName,
                    selected: false,
                }));
                setTables(databaseTables);
                setCurrentStep(1);
            } else {
                console.warn(">>> No tables found in database");
                // TODO: Show message to user that no tables were found
            }
        } catch (error) {
            console.error(">>> Error introspecting database", error);
            // TODO: Show error message to user
        } finally {
            setIsIntrospecting(false);
        }
    };

    const handleTableToggle = (index: number) => {
        const updatedTables = [...tables];
        updatedTables[index].selected = !updatedTables[index].selected;
        setTables(updatedTables);
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
                port: parseInt(credentials.port, 10),
                user: credentials.username,
                password: credentials.password,
                database: credentials.databaseName,
                selectedTables: selectedTables,
            });

            if (response.errorMsg) {
                console.error(">>> Error saving connection", response.errorMsg);
                if (response.stackTrace) {
                    console.error(">>> Stack trace", response.stackTrace);
                }
                // TODO: Show error message to user
                return;
            }

            // Log success and text edits info if available
            if (response.source?.textEditsMap) {
                console.log(">>> Connection created successfully with text edits", Object.keys(response.source.textEditsMap));
            }
            if (response.source?.isModuleExists !== undefined) {
                console.log(">>> Module exists:", response.source.isModuleExists);
            }


            onClose?.();
        } catch (error) {
            console.error(">>> Error saving connection", error);
            // TODO: Show error message to user
        } finally {
            setIsSaving(false);
        }
    };

    const selectedTablesCount = tables.filter((t) => t.selected).length;
    const totalTablesCount = tables.length;

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <StepContent>
                        <div>
                            <SectionTitle variant="h3">Database Credentials</SectionTitle>
                            <SectionSubtitle variant="body2">
                                Enter credentials to connect and introspect the database
                            </SectionSubtitle>
                        </div>
                        <FormSection>
                            <FormField>
                                <Dropdown
                                    id="database-type"
                                    label="Database Type"
                                    items={DATABASE_TYPES}
                                    value={credentials.databaseType}
                                    onValueChange={handleDatabaseTypeChange}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="host"
                                    label="Host"
                                    placeholder="localhost or IP address"
                                    value={credentials.host}
                                    onTextChange={(value) => handleCredentialsChange("host", value)}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="port"
                                    label="Port"
                                    value={credentials.port}
                                    onTextChange={(value) => handleCredentialsChange("port", value)}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="database-name"
                                    label="Database Name"
                                    value={credentials.databaseName}
                                    onTextChange={(value) => handleCredentialsChange("databaseName", value)}
                                />
                            </FormField>
                            <FormField>
                                <TextField
                                    id="username"
                                    label="Username"
                                    placeholder="Database username"
                                    value={credentials.username}
                                    onTextChange={(value) => handleCredentialsChange("username", value)}
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
                                />
                            </FormField>
                            <ActionButton
                                onClick={handleIntrospect}
                                disabled={!credentials.host || !credentials.databaseName || !credentials.username || isIntrospecting}
                            >
                                {isIntrospecting ? "Connecting..." : "Connect & Introspect Database"}
                            </ActionButton>
                        </FormSection>
                    </StepContent>
                );

            case 1:
                return (
                    <StepContent>
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
                        <TablesGrid>
                            {tables.map((table, index) => (
                                <TableCard
                                    key={table.name}
                                    selected={table.selected}
                                    onClick={() => handleTableToggle(index)}
                                >
                                    <TableCheckbox
                                        type="checkbox"
                                        checked={table.selected}
                                        onChange={() => handleTableToggle(index)}
                                    />
                                    <TableName variant="body1">{table.name}</TableName>
                                </TableCard>
                            ))}
                        </TablesGrid>
                        <SelectAllButton appearance="secondary" onClick={handleSelectAll}>
                            Select All
                        </SelectAllButton>
                        <ActionButtonsContainer>
                            <Button appearance="secondary" onClick={() => setCurrentStep(0)}>
                                Back
                            </Button>
                            <Button
                                onClick={handleContinueToConnectionDetails}
                                disabled={selectedTablesCount === 0}
                            >
                                Continue to Connection Details
                            </Button>
                        </ActionButtonsContainer>
                    </StepContent>
                );

            case 2:
                return (
                    <StepContent>
                        <div>
                            <SectionTitle variant="h3">Connection Details</SectionTitle>
                            <SectionSubtitle variant="body2">
                                Name your connection to complete the setup
                            </SectionSubtitle>
                        </div>
                        <FormSection>
                            <FormField>
                                <TextField
                                    id="connection-name"
                                    label="Connection Name"
                                    placeholder="e.g., Production Database"
                                    value={connectionName}
                                    onTextChange={setConnectionName}
                                />
                                <Typography variant="caption" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                    This name will be used to reference this connection in your code
                                </Typography>
                            </FormField>
                            <ActionButtonsContainer>
                                <Button appearance="secondary" onClick={() => setCurrentStep(1)}>
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSaveConnection}
                                    disabled={!connectionName || isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save Connection"}
                                </Button>
                            </ActionButtonsContainer>
                        </FormSection>
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
                <ContentContainer>{renderStepContent()}</ContentContainer>
            </PopupContainer>
        </>
    );
}

export default DatabaseConnectionPopup;

