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
import { ImportIntegrationResponse } from "../../interfaces/extended-lang-client";
import { GetMigrationToolsResponse, ImportIntegrationRPCRequest, MigrateRequest, MigrationToolPullRequest, OpenMigrationReportRequest, OpenSubProjectReportRequest, SaveMigrationReportRequest, StoreSubProjectReportsRequest } from "./interfaces";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "migrate-integration";
export const getMigrationTools: RequestType<void, GetMigrationToolsResponse> = { method: `${_preFix}/getMigrationTools` };
export const pullMigrationTool: NotificationType<MigrationToolPullRequest> = { method: `${_preFix}/pullMigrationTool` };
export const importIntegration: RequestType<ImportIntegrationRPCRequest, ImportIntegrationResponse> = { method: `${_preFix}/importIntegration` };
export const openMigrationReport: NotificationType<OpenMigrationReportRequest> = { method: `${_preFix}/openMigrationReport` };
export const openSubProjectReport: NotificationType<OpenSubProjectReportRequest> = { method: `${_preFix}/openSubProjectReport` };
export const storeSubProjectReports: NotificationType<StoreSubProjectReportsRequest> = { method: `${_preFix}/storeSubProjectReports` };
export const saveMigrationReport: NotificationType<SaveMigrationReportRequest> = { method: `${_preFix}/saveMigrationReport` };
export const migrateProject: NotificationType<MigrateRequest> = { method: `${_preFix}/migrateProject` };
