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
    getMigrationTools,
    importIntegration,
    ImportIntegrationRPCRequest,
    migrateProject,
    MigrateRequest,
    MigrationToolPullRequest,
    openMigrationReport,
    OpenMigrationReportRequest,
    openSubProjectReport,
    OpenSubProjectReportRequest,
    pullMigrationTool,
    saveMigrationReport,
    SaveMigrationReportRequest,
    storeSubProjectReports,
    StoreSubProjectReportsRequest
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { MigrateIntegrationRpcManager } from "./rpc-manager";

// Defined locally to avoid depending on a rebuilt @wso2/ballerina-core
const getActiveMigrationSession = { method: "migrate-integration/getActiveMigrationSession" } as const;
const markEnhancementCompleteMethod = { method: "migrate-integration/markEnhancementComplete" } as const;
const startMigrationEnhancementMethod = { method: "migrate-integration/startMigrationEnhancement" } as const;
const migrationPanelReadyMethod = { method: "migrate-integration/migrationPanelReady" } as const;
const abortMigrationAgentMethod = { method: "migrate-integration/abortMigrationAgent" } as const;
const setMigrationModelMethod = { method: "migrate-integration/setMigrationModel" } as const;
const wizardEnhancementReadyMethod = { method: "migrate-integration/wizardEnhancementReady" } as const;
const openMigratedProjectMethod = { method: "migrate-integration/openMigratedProject" } as const;
const seedMigrationHistoryMethod = { method: "migrate-integration/seedMigrationHistory" } as const;

export function registerMigrateIntegrationRpcHandlers(messenger: Messenger) {
    const rpcManger = MigrateIntegrationRpcManager.getInstance();
    messenger.onRequest(getMigrationTools, () => rpcManger.getMigrationTools());
    messenger.onNotification(pullMigrationTool, (args: MigrationToolPullRequest) => rpcManger.pullMigrationTool(args));
    messenger.onRequest(importIntegration, (args: ImportIntegrationRPCRequest) => rpcManger.importIntegration(args));
    messenger.onNotification(openMigrationReport, (args: OpenMigrationReportRequest) => rpcManger.openMigrationReport(args));
    messenger.onNotification(openSubProjectReport, (args: OpenSubProjectReportRequest) => rpcManger.openSubProjectReport(args));
    messenger.onNotification(storeSubProjectReports, (args: StoreSubProjectReportsRequest) => rpcManger.storeSubProjectReports(args));
    messenger.onNotification(saveMigrationReport, (args: SaveMigrationReportRequest) => rpcManger.saveMigrationReport(args));
    messenger.onNotification(migrateProject, (args: MigrateRequest) => rpcManger.migrateProject(args));
    messenger.onRequest(getActiveMigrationSession, () => rpcManger.getActiveMigrationSession());
    messenger.onRequest(markEnhancementCompleteMethod, () => rpcManger.markEnhancementComplete());
    messenger.onRequest(startMigrationEnhancementMethod, (args: { mode: 'auto-fix' }) => rpcManger.startMigrationEnhancement(args.mode));
    messenger.onRequest(migrationPanelReadyMethod, () => rpcManger.migrationPanelReady());
    messenger.onRequest(wizardEnhancementReadyMethod, () => rpcManger.wizardEnhancementReady());
    messenger.onRequest(openMigratedProjectMethod, () => rpcManger.openMigratedProjectInVSCode());
    messenger.onRequest(abortMigrationAgentMethod, () => rpcManger.abortMigrationAgent());
    messenger.onRequest(setMigrationModelMethod, (args: { modelId: string }) => rpcManger.setMigrationModel(args.modelId));
    messenger.onRequest(seedMigrationHistoryMethod, () => rpcManger.seedMigrationHistory());
}
