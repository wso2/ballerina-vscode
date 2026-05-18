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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    GetMigrationToolsResponse,
    ImportIntegrationRPCRequest,
    ImportIntegrationResponse,
    MigrateIntegrationAPI,
    MigrateRequest,
    MigrationToolPullRequest,
    OpenMigrationReportRequest,
    OpenSubProjectReportRequest,
    SaveMigrationReportRequest,
    StoreSubProjectReportsRequest,
    getMigrationTools,
    importIntegration,
    migrateProject,
    openMigrationReport,
    openSubProjectReport,
    pullMigrationTool,
    saveMigrationReport,
    storeSubProjectReports
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

// Defined locally to avoid depending on a rebuilt @wso2/ballerina-core
const _getActiveMigrationSession = { method: "migrate-integration/getActiveMigrationSession" } as const;
const _markEnhancementComplete = { method: "migrate-integration/markEnhancementComplete" } as const;
const _startMigrationEnhancement = { method: "migrate-integration/startMigrationEnhancement" } as const;
const _wizardEnhancementReady = { method: "migrate-integration/wizardEnhancementReady" } as const;
const _openMigratedProject = { method: "migrate-integration/openMigratedProject" } as const;
const _abortMigrationAgent = { method: "migrate-integration/abortMigrationAgent" } as const;
const _seedMigrationHistory = { method: "migrate-integration/seedMigrationHistory" } as const;
const _getMigrationHistoryMessages = { method: "migrate-integration/getMigrationHistoryMessages" } as const;

/** Local mirror until @wso2/ballerina-core is rebuilt. */
export interface ActiveMigrationSession {
    isActive: boolean;
    aiFeatureUsed: boolean;
    fullyEnhanced: boolean;
}

export class MigrateIntegrationRpcClient implements MigrateIntegrationAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getMigrationTools(): Promise<GetMigrationToolsResponse> {
        return this._messenger.sendRequest(getMigrationTools, HOST_EXTENSION);
    }

    pullMigrationTool(params: MigrationToolPullRequest): void {
        return this._messenger.sendNotification(pullMigrationTool, HOST_EXTENSION, params);
    }

    importIntegration(params: ImportIntegrationRPCRequest): Promise<ImportIntegrationResponse> {
        return this._messenger.sendRequest(importIntegration, HOST_EXTENSION, params);
    }

    openMigrationReport(params: OpenMigrationReportRequest): void {
        return this._messenger.sendNotification(openMigrationReport, HOST_EXTENSION, params);
    }

    openSubProjectReport(params: OpenSubProjectReportRequest): void {
        return this._messenger.sendNotification(openSubProjectReport, HOST_EXTENSION, params);
    }

    storeSubProjectReports(params: StoreSubProjectReportsRequest): void {
        return this._messenger.sendNotification(storeSubProjectReports, HOST_EXTENSION, params);
    }

    saveMigrationReport(params: SaveMigrationReportRequest): void {
        return this._messenger.sendNotification(saveMigrationReport, HOST_EXTENSION, params);
    }

    migrateProject(params: MigrateRequest): void {
        return this._messenger.sendNotification(migrateProject, HOST_EXTENSION, params);
    }

    getActiveMigrationSession(): Promise<ActiveMigrationSession> {
        return this._messenger.sendRequest(_getActiveMigrationSession as any, HOST_EXTENSION);
    }

    markEnhancementComplete(): Promise<void> {
        return this._messenger.sendRequest(_markEnhancementComplete as any, HOST_EXTENSION);
    }

    startMigrationEnhancement(): Promise<void> {
        return this._messenger.sendRequest(_startMigrationEnhancement as any, HOST_EXTENSION);
    }

    /**
     * Tells the extension backend that the wizard AI enhancement view is
     * visible and ready to receive streaming events.  Triggers the
     * wizard-level migration agent.
     */
    wizardEnhancementReady(): Promise<void> {
        return this._messenger.sendRequest(_wizardEnhancementReady as any, HOST_EXTENSION);
    }

    /**
     * Opens the migrated project in VS Code.
     * Called after wizard-level AI enhancement completes or the user skips it.
     */
    openMigratedProject(): Promise<void> {
        return this._messenger.sendRequest(_openMigratedProject as any, HOST_EXTENSION);
    }

    /**
     * Aborts the currently running migration AI agent.
     */
    abortMigrationAgent(): Promise<void> {
        return this._messenger.sendRequest(_abortMigrationAgent as any, HOST_EXTENSION);
    }

    /**
     * Seeds saved migration conversation history into the AI chat state.
     * Returns true if history was found and seeded, false otherwise.
     */
    seedMigrationHistory(): Promise<boolean> {
        return this._messenger.sendRequest(_seedMigrationHistory as any, HOST_EXTENSION);
    }

    /**
     * Retrieves the persisted migration conversation history messages.
     */
    getMigrationHistoryMessages(): Promise<Array<{ role: string; content: string }>> {
        return this._messenger.sendRequest(_getMigrationHistoryMessages as any, HOST_EXTENSION);
    }
}
