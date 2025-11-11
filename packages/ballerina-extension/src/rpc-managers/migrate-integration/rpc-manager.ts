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
    ImportIntegrationRequest,
    ImportIntegrationResponse,
    ImportIntegrationRPCRequest,
    MigrateIntegrationAPI,
    MigrateRequest,
    OpenMigrationReportRequest,
    OpenSubProjectReportRequest,
    SaveMigrationReportRequest,
    StoreSubProjectReportsRequest
} from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";
import { createBIProjectFromMigration, getUsername, sanitizeName } from "../../utils/bi";
import { pullMigrationTool } from "../../utils/migrate-integration";
import { MigrationReportWebview } from "../../views/migration-report/webview";

export class MigrateIntegrationRpcManager implements MigrateIntegrationAPI {
    private static instance: MigrateIntegrationRpcManager;
    private subProjectReports: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): MigrateIntegrationRpcManager {
        if (!MigrateIntegrationRpcManager.instance) {
            MigrateIntegrationRpcManager.instance = new MigrateIntegrationRpcManager();
        }
        return MigrateIntegrationRpcManager.instance;
    }

    async pullMigrationTool(args: { toolName: string; version: string }): Promise<void> {
        try {
            await pullMigrationTool(args.toolName, args.version);
        } catch (error) {
            console.error(`Failed to pull migration tool '${args.toolName}' version '${args.version}':`, error);
            throw error;
        }
    }

    async importIntegration(params: ImportIntegrationRPCRequest): Promise<ImportIntegrationResponse> {
        const orgName = getUsername();
        const langParams: ImportIntegrationRequest = {
            orgName: orgName,
            packageName: sanitizeName(params.packageName),
            sourcePath: params.sourcePath,
            parameters: params.parameters,
        };
        StateMachine.langClient().registerMigrationToolCallbacks();
        switch (params.commandName) {
            case "migrate-tibco":
                return StateMachine.langClient().importTibcoToBI(langParams);
            case "migrate-mule":
                return StateMachine.langClient().importMuleToBI(langParams);
            default:
                console.error(`Unsupported integration type: ${params.commandName}`);
                throw new Error(`Unsupported integration type: ${params.commandName}`);
        }
    }

    async getMigrationTools(): Promise<GetMigrationToolsResponse> {
        return StateMachine.langClient().getMigrationTools();
    }

    async openMigrationReport(params: OpenMigrationReportRequest): Promise<void> {
        MigrationReportWebview.createOrShow(params.fileName, params.reportContent);
    }

    async openSubProjectReport(params: OpenSubProjectReportRequest): Promise<void> {
        let reportContent = this.subProjectReports.get(params.projectName);

        // If not found, try with _ballerina suffix
        if (!reportContent) {
            reportContent = this.subProjectReports.get(`${params.projectName}_ballerina`);
        }

        // If still not found, try to find a fuzzy match by checking all keys
        if (!reportContent) {
            const matchingKeys = Array.from(this.subProjectReports.keys()).filter(key =>
                key.startsWith(params.projectName)
            );
            if (matchingKeys.length > 0) {
                reportContent = this.subProjectReports.get(matchingKeys[0]);
            }
        }

        if (!reportContent) {
            const availableKeys = Array.from(this.subProjectReports.keys());
            throw new Error(`Report for project '${params.projectName}' not found. Available projects: ${availableKeys.join(', ')}`);
        }
        MigrationReportWebview.createOrShow(params.projectName, reportContent);
    }

    async storeSubProjectReports(params: StoreSubProjectReportsRequest): Promise<void> {
        this.subProjectReports.clear();
        Object.entries(params.reports).forEach(([projectName, reportContent]) => {
            this.subProjectReports.set(projectName, reportContent);
        });
    }

    async saveMigrationReport(params: SaveMigrationReportRequest): Promise<void> {
        const vscode = await import('vscode');

        // Show save dialog
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(params.defaultFileName),
            filters: {
                'HTML files': ['html'],
                'All files': ['*']
            }
        });

        if (saveUri) {
            // Write the report content to the selected file
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(params.reportContent, 'utf8'));
            vscode.window.showInformationMessage(`Migration report saved to ${saveUri.fsPath}`);
        }
    }

    async migrateProject(params: MigrateRequest): Promise<void> {
        createBIProjectFromMigration(params);
    }
}
