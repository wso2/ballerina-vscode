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
}
