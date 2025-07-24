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
    ImportIntegrationResponse,
    ImportTibcoRPCRequest,
    MigrateRequest,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useEffect, useState } from "react";
import { ImportIntegrationForm } from "./ImportIntegrationForm";
import { MigrationProgressView } from "./MigrationProgressView";
import { INTEGRATION_CONFIGS } from "./definitions";

// Defines the parameters that will be passed from the form to start the import
export interface FinalIntegrationParams {
    name: string;
    path: string;
    importSourcePath: string;
    type: keyof typeof INTEGRATION_CONFIGS;
    [key: string]: any; // For other dynamic parameters
}

/**
 * A stateful container component that manages the entire integration import flow,
 * switching between the input form and the progress view.
 */
export function ImportIntegration() {
    const { rpcClient } = useRpcContext();

    // State managed by the parent component
    const [view, setView] = useState<"form" | "loading">("form");
    const [toolPullProgress, setToolPullProgress] = useState<DownloadProgress | null>(null);
    const [migrationToolState, setMigrationToolState] = useState<string | null>(null);
    const [migrationToolLogs, setMigrationToolLogs] = useState<string[]>([]);
    const [pullingTool, setPullingTool] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<keyof typeof INTEGRATION_CONFIGS | null>(null);
    const [importParams, setImportParams] = useState<FinalIntegrationParams | null>(null);
    const [migrationCompleted, setMigrationCompleted] = useState(false);
    const [migrationResponse, setMigrationResponse] = useState<ImportIntegrationResponse | null>(null);

    const pullIntegrationTool = (integrationType: keyof typeof INTEGRATION_CONFIGS) => {
        setPullingTool(true);
        rpcClient.getMigrateIntegrationRpcClient().pullMigrationTool({
            toolName: integrationType,
        });
    };

    // Handler to begin the import and switch to the loading view
    const handleStartImport = (toolPullProgress: DownloadProgress, importParams: FinalIntegrationParams) => {
        if (toolPullProgress.step === -1) {
            console.error("Cannot start import, tool download failed.");
            return;
        }
        setView("loading");

        if (selectedIntegration === "tibco") {
            const params: ImportTibcoRPCRequest = {
                packageName: importParams.name,
                sourcePath: importParams.importSourcePath,
            };
            rpcClient
                .getMigrateIntegrationRpcClient()
                .importTibcoToBI(params)
                .then((response) => {
                    console.log("TIBCO import response:", response);
                    setMigrationCompleted(true);
                    setMigrationResponse(response);
                })
                .catch((error) => {
                    console.error("Error during TIBCO import:", error);
                });
        }
    };

    const handleCreateIntegrationFiles = () => {
        if (migrationResponse) {
            const params: MigrateRequest = {
                projectName: importParams.name,
                projectPath: importParams.path,
                textEdits: migrationResponse.textEdits,
            };
            rpcClient.getBIDiagramRpcClient().migrateProject(params);
        }
    };

    useEffect(() => {
        rpcClient.onDownloadProgress((progressUpdate) => {
            setToolPullProgress(progressUpdate);
            if (progressUpdate.success) {
                setPullingTool(false);
            }
        });

        rpcClient.onMigrationToolStateChanged((stateUpdate) => {
            setMigrationToolState(stateUpdate);
        });

        rpcClient.onMigrationToolLogs((logUpdate) => {
            setMigrationToolLogs((prevLogs) => [...prevLogs, logUpdate]);
        });
    }, [rpcClient]);

    useEffect(() => {
        if (toolPullProgress && toolPullProgress.success && importParams) {
            handleStartImport(toolPullProgress, importParams);
        }
    }, [toolPullProgress, importParams]);

    return (
        <div className="import-integration-container">
            {view === "form" && (
                <ImportIntegrationForm
                    selectedIntegration={selectedIntegration}
                    setImportParams={setImportParams}
                    pullIntegrationTool={pullIntegrationTool}
                    pullingTool={pullingTool}
                    onSelectIntegration={setSelectedIntegration}
                />
            )}
            {view === "loading" && (
                <MigrationProgressView
                    importParams={importParams}
                    migrationState={migrationToolState}
                    migrationLogs={migrationToolLogs}
                    migrationCompleted={migrationCompleted}
                    migrationResponse={migrationResponse}
                    onCreateIntegrationFiles={handleCreateIntegrationFiles}
                />
            )}
        </div>
    );
}
