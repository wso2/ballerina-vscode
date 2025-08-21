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

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Typography, ProgressRing, Codicon } from "@wso2/ui-toolkit";
import { useState, useEffect, useMemo } from "react";
import { CoverageSummary } from "./components/CoverageSummary";
import { ManualWorkEstimationTable } from "./components/ManualWorkEstimationTable";
import { MigrationLogs } from "./components/MigrationLogs";
import { MigrationProgressProps } from "./types";
import { EXAMPLE_REPORT_JSON, getMigrationProgressHeaderData } from "./utils";
import { StepWrapper, ButtonWrapper, ReportButtonsContainer, ViewReportButton, SaveReportButton } from "./styles";


export function MigrationProgressView({
    migrationState,
    migrationLogs,
    migrationCompleted,
    migrationSuccessful,
    migrationResponse,
    onNext,
}: MigrationProgressProps) {
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const { rpcClient } = useRpcContext();

    // Parse migration report JSON when available
    const parsedReportData = useMemo(() => {
        if (!migrationResponse?.reportJson) return null;
        try {
            // return JSON.parse(migrationResponse.reportJson) as MigrationReportJSON;
            return EXAMPLE_REPORT_JSON;
        } catch (error) {
            console.error("Failed to parse migration report JSON:", error);
            return null;
        }
    }, [migrationResponse?.reportJson]);

    // Auto-open logs during migration and auto-collapse when completed
    useEffect(() => {
        if (!migrationCompleted && migrationLogs.length > 0) {
            // Migration is in progress and we have logs - open the dropdown
            setIsLogsOpen(true);
        } else if (migrationCompleted) {
            // Migration is completed - collapse the dropdown
            setIsLogsOpen(false);
        }
    }, [migrationCompleted, migrationLogs.length]);

    const handleViewReport = async () => {
        console.log("View report clicked", { migrationResponse });
        try {
            if (migrationResponse?.report) {
                console.log("Report found, opening via RPC...");
                rpcClient.getMigrateIntegrationRpcClient().openMigrationReport({
                    reportContent: migrationResponse.report,
                    fileName: "migration-report.html",
                });
            }
        } catch (error) {
            console.error("Failed to open migration report:", error);
        }
    };

    const handleSaveReport = async () => {
        console.log("Save report clicked", { migrationResponse });
        try {
            if (!migrationResponse?.report) {
                console.error("No report content available to save");
                return;
            }

            // VSCode extension environment - use RPC to show save dialog
            console.log("Saving report via VSCode save dialog...");
            rpcClient.getMigrateIntegrationRpcClient().saveMigrationReport({
                reportContent: migrationResponse.report,
                defaultFileName: "migration-report.html",
            });
        } catch (error) {
            console.error("Failed to save migration report:", error);
        }
    };

    const { headerText, headerDesc } = getMigrationProgressHeaderData(
        migrationCompleted,
        migrationSuccessful
    );

    return (
        <>
            <div>
                <Typography variant="h2">{headerText}</Typography>
                <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>{headerDesc}</Typography>
            </div>
            <StepWrapper>
                {migrationCompleted && migrationSuccessful ? (
                    parsedReportData ? (
                        <>
                            <CoverageSummary reportData={parsedReportData} />
                            <ManualWorkEstimationTable
                                reportData={parsedReportData}
                                onViewReport={handleViewReport}
                                onSaveReport={handleSaveReport}
                            />
                        </>
                    ) : (
                        <>
                            <Typography variant="body3" sx={{ color: "var(--vscode-terminal-ansiGreen)" }}>
                                Migration completed successfully!
                            </Typography>
                            {migrationResponse.report && (
                                <ReportButtonsContainer>
                                    <ViewReportButton onClick={handleViewReport} appearance="secondary">
                                        <Codicon name="file-text" />
                                        &nbsp;View Full Report
                                    </ViewReportButton>
                                    <SaveReportButton onClick={handleSaveReport} appearance="secondary">
                                        <Codicon name="save" />
                                        &nbsp;Save Report
                                    </SaveReportButton>
                                </ReportButtonsContainer>
                            )}
                        </>

                    )
                ) : migrationCompleted && !migrationSuccessful ? (
                    <></>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ProgressRing sx={{ width: 14, height: 14 }} color="var(--vscode-foreground)" />
                        <span style={{ color: "var(--vscode-foreground)" }}>
                            {migrationState || "Starting migration..."}
                        </span>
                    </div>
                )}
            </StepWrapper>

            {/* Show button before logs when migration is completed successfully */}
            {migrationCompleted && migrationSuccessful && (
                <ButtonWrapper>
                    <Button
                        disabled={!migrationCompleted || !migrationSuccessful}
                        onClick={onNext}
                        appearance="primary"
                    >
                        Proceed to Final Step
                    </Button>
                </ButtonWrapper>
            )}

            <MigrationLogs
                migrationLogs={migrationLogs}
                migrationCompleted={migrationCompleted}
                isLogsOpen={isLogsOpen}
                onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
                showHeader={!(migrationCompleted && !migrationSuccessful)}
            />

            {/* Show button after logs when migration is in progress or failed */}
            {(!migrationCompleted || (migrationCompleted && !migrationSuccessful)) && (
                <ButtonWrapper>
                    <Button
                        disabled={!migrationCompleted || !migrationSuccessful}
                        onClick={onNext}
                        appearance="primary"
                    >
                        Proceed to Final Step
                    </Button>
                </ButtonWrapper>
            )}
        </>
    );
}
