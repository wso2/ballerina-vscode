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

import { useState, useEffect } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DownloadProgress, ImportTibcoRPCRequest } from "@wso2/ballerina-core";
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
    const [view, setView] = useState<'form' | 'loading'>('form');
    const [toolPullProgress, setToolPullProgress] = useState<DownloadProgress | null>(null);
    const [selectedIntegration, setSelectedIntegration] = useState<keyof typeof INTEGRATION_CONFIGS | null>(null);
    const [importParams, setImportParams] = useState<FinalIntegrationParams | null>(null);

    // The RPC listener lives here, so it persists across view changes.
    useEffect(() => {
        const disposable = rpcClient.onDownloadProgress((progressUpdate) => {
            setToolPullProgress(progressUpdate);
        });
        // TODO: See if a disposable is needed here
        // return () => disposable.dispose() 
    }, [rpcClient]);

    // Handler for selecting an integration type
    const handleIntegrationSelection = (integrationType: keyof typeof INTEGRATION_CONFIGS) => {
        setSelectedIntegration(integrationType);
        setToolPullProgress(null); // Clear previous progress
        rpcClient.getMigrateIntegrationRpcClient().pullMigrationTool({
            toolName: integrationType,
        });
    };

    // Handler to begin the import and switch to the loading view
    const handleStartImport = (finalParams: FinalIntegrationParams) => {
        if (toolPullProgress?.step === -1) {
            console.error("Cannot start import, tool download failed.");
            return;
        }
        setImportParams(finalParams);
        // setView('loading');

        // TODO: Should the logic of deciding which migration tool to use be here or in the extension?
        if (selectedIntegration === 'tibco') {

            const params: ImportTibcoRPCRequest = {
                packageName: finalParams.path,
                sourcePath: finalParams.importSourcePath,
            }
            rpcClient.getMigrateIntegrationRpcClient().importTibcoToBI(params).then((response) => {
                console.log("TIBCO import response:", response);
                // Handle successful import response here
            }).catch((error) => {
                console.error("Error during TIBCO import:", error);
                // Handle error during import
            });
        }
    };

    return (
        <div className="import-integration-container">
            {view === 'form' && (
                <ImportIntegrationForm
                    selectedIntegration={selectedIntegration}
                    toolPullProgress={toolPullProgress}
                    onSelectIntegration={handleIntegrationSelection}
                    onImport={handleStartImport}
                />
            )}
            {view === 'loading' && (
                <MigrationProgressView
                    importParams={importParams}
                    toolPullProgress={toolPullProgress}
                />
            )}
        </div>
    );
}
