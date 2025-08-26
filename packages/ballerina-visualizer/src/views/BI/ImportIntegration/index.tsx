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
    DownloadProgress,
    EVENT_TYPE,
    ImportIntegrationResponse,
    ImportIntegrationRPCRequest,
    MACHINE_VIEW,
    MigrateRequest,
    MigrationTool,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Icon, Typography } from "@wso2/ui-toolkit";
import { Stepper, StepperContainer } from "@wso2/ui-toolkit/lib/components/Stepper/Stepper";
import { useEffect, useState } from "react";
import { ConfigureProjectForm } from "./ConfigureProjectForm";
import { ImportIntegrationForm } from "./ImportIntegrationForm";
import { MigrationProgressView } from "./MigrationProgressView";
import { FormContainer, IconButton } from "./styles";
import { FinalIntegrationParams } from "./types";

export function ImportIntegration() {
    const { rpcClient } = useRpcContext();

    // State managed by the parent component
    const [step, setStep] = useState(0);
    const [toolPullProgress, setToolPullProgress] = useState<DownloadProgress | null>(null);
    const [migrationToolState, setMigrationToolState] = useState<string | null>(null);
    const [migrationToolLogs, setMigrationToolLogs] = useState<string[]>([]);
    const [pullingTool, setPullingTool] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<MigrationTool | null>(null);
    const [migrationTools, setMigrationTools] = useState<MigrationTool[]>([]);
    const [importParams, setImportParams] = useState<FinalIntegrationParams | null>(null);
    const [migrationCompleted, setMigrationCompleted] = useState(false);
    const [migrationSuccessful, setMigrationSuccessful] = useState(false);
    const [migrationResponse, setMigrationResponse] = useState<ImportIntegrationResponse | null>(null);

    const defaultSteps = ["Select Source Project", "Migration Status", "Create and Open Project"];

    const pullIntegrationTool = (commandName: string) => {
        setPullingTool(true);
        rpcClient.getMigrateIntegrationRpcClient().pullMigrationTool({
            toolName: commandName,
        });
    };

    // Handler to begin the import and switch to the loading view
    const handleStartImport = (
        importParams: FinalIntegrationParams,
        selectedIntegration: MigrationTool,
        toolPullProgress: DownloadProgress
    ) => {
        if (selectedIntegration.needToPull && toolPullProgress && toolPullProgress.step === -1) {
            console.error("Cannot start import, tool download failed.");
        }
        setStep(1);
        console.log("Starting import with params:", importParams);

        const params: ImportIntegrationRPCRequest = {
            packageName: "",
            commandName: selectedIntegration.commandName,
            sourcePath: importParams.importSourcePath,
        };
        rpcClient
            .getMigrateIntegrationRpcClient()
            .importIntegration(params)
            .then((response) => {
                setMigrationCompleted(true);
                setMigrationResponse(response);
                if (!response.error) {
                    setMigrationSuccessful(true);
                }
            })
            .catch((error) => {
                console.error("Error during TIBCO import:", error);
            });
    };

    const handleCreateIntegrationFiles = (projectName: string, projectPath: string) => {
        console.log("Creating integration files with params:", importParams);
        if (migrationResponse) {
            const params: MigrateRequest = {
                projectName: projectName,
                projectPath: projectPath,
                textEdits: migrationResponse.textEdits,
            };
            rpcClient.getBIDiagramRpcClient().migrateProject(params);
        }
    };

    const gotToWelcome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    const handleStepBack = () => {
        if (step === 1) {
            setMigrationToolState(null);
            setMigrationToolLogs([]);
            setMigrationCompleted(false);
            setMigrationSuccessful(false);
            setMigrationResponse(null);
        }

        setStep(step - 1);
    };

    const handleGoHome = () => {
        gotToWelcome();
    };

    const getMigrationTools = () => {
        rpcClient
            .getMigrateIntegrationRpcClient()
            .getMigrationTools()
            .then((response) => {
                console.log("Available migration tools:", response.tools);
                setMigrationTools(response.tools);
            });
    };

    useEffect(() => {
        getMigrationTools();

        rpcClient.onDownloadProgress((progressUpdate) => {
            setToolPullProgress(progressUpdate);
            if (progressUpdate.success) {
                setPullingTool(false);
            }
        });

        rpcClient.onMigrationToolStateChanged((state) => {
            setMigrationToolState(state);
        });

        rpcClient.onMigrationToolLogs((log) => {
            setMigrationToolLogs((prevLogs) => [...prevLogs, log]);
        });
    }, [rpcClient]);

    useEffect(() => {
        if (selectedIntegration?.needToPull && toolPullProgress && toolPullProgress.success && importParams) {
            handleStartImport(importParams, selectedIntegration, toolPullProgress);
        }
    }, [toolPullProgress, importParams, selectedIntegration]);

    return (
        <FormContainer>
            <IconButton onClick={handleGoHome}>
                <Icon name="bi-home" iconSx={{ color: "var(--vscode-foreground)" }} />
            </IconButton>
            <Typography variant="h1">Migrate External Integration</Typography>
            <StepperContainer style={{ marginBottom: "4%" }}>
                <Stepper alignment="flex-start" steps={defaultSteps} currentStep={step} />
            </StepperContainer>
            {step === 0 && (
                <ImportIntegrationForm
                    selectedIntegration={selectedIntegration}
                    migrationTools={migrationTools}
                    setImportParams={setImportParams}
                    pullIntegrationTool={pullIntegrationTool}
                    pullingTool={pullingTool}
                    toolPullProgress={toolPullProgress}
                    onSelectIntegration={setSelectedIntegration}
                    handleStartImport={handleStartImport}
                    onBack={handleGoHome}
                />
            )}
            {step === 1 && (
                <MigrationProgressView
                    migrationState={migrationToolState}
                    migrationLogs={migrationToolLogs}
                    migrationCompleted={migrationCompleted}
                    migrationSuccessful={migrationSuccessful}
                    migrationResponse={migrationResponse}
                    onNext={() => setStep(2)}
                    onBack={handleStepBack}
                />
            )}
            {step === 2 && <ConfigureProjectForm onNext={handleCreateIntegrationFiles} onBack={handleStepBack} />}
        </FormContainer>
    );
}
