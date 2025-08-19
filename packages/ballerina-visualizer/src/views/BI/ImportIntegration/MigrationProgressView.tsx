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

import styled from "@emotion/styled";
import { ImportIntegrationResponse } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Typography, ProgressRing } from "@wso2/ui-toolkit";
import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow } from "@vscode/webview-ui-toolkit/react";
import { useState, useEffect, useRef, useMemo } from "react";

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const ProgressContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    display: flex;
    flex-direction: column;
    gap: 40px;
    max-height: 100vh;
    overflow-y: auto;
    padding-bottom: 20px;
`;

const StepWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
    margin-top: 20px;
`;

const LogsContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    max-height: 300px;
    overflow-y: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
`;

const LogEntry = styled.div`
    color: var(--vscode-foreground);
    margin-bottom: 4px;
    white-space: pre-wrap;
    word-break: break-word;
`;

const CollapsibleHeader = styled.div`
    display: flex;
    cursor: pointer;
    gap: 8px;
    align-items: center;
    &:hover {
        opacity: 0.8;
    }
`;

const CardAction = styled.div`
    margin-left: auto;
`;

const CoverageContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 24px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const CoverageHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const CoveragePercentage = styled.div<{ coverageColor: string }>`
    font-size: 48px;
    font-weight: bold;
    color: ${(props: { coverageColor: string }) => props.coverageColor};
`;

const CoverageLabel = styled.div`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
`;

const CoverageProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: var(--vscode-editorWidget-border);
    border-radius: 4px;
    overflow: hidden;
`;

const CoverageProgressFill = styled.div<{ percentage: number; coverageColor: string }>`
    height: 100%;
    width: ${(props: { percentage: number; coverageColor: string }) => props.percentage}%;
    background-color: ${(props: { percentage: number; coverageColor: string }) => props.coverageColor};
    transition: width 0.3s ease;
`;

const CoverageStats = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CoverageStat = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 14px;
`;

const CoverageBadge = styled.div`
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    align-self: flex-start;
`;

const EstimationTableContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 24px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ReportButtonsContainer = styled.div`
    display: flex;
    gap: 12px;
    align-self: flex-start;
    margin-top: 8px;
`;

const ViewReportButton = styled(Button)``;

const SaveReportButton = styled(Button)``;

export interface CoverageOverview {
    unitName: string;
    coveragePercentage: number;
    totalElements: number;
    migratableElements: number;
    nonMigratableElements: number;
}

export interface ManualWorkEstimation {
    unit: string;
    headers: string[];
    rows: {
        label: string;
        values: number[];
    }[];
}

export interface MigrationReportJSON {
    coverageOverview: CoverageOverview;
    manualWorkEstimation: ManualWorkEstimation;
}

interface MigrationProgressProps {
    migrationState: string | null;
    migrationLogs: string[];
    migrationCompleted: boolean;
    migrationSuccessful: boolean;
    migrationResponse: ImportIntegrationResponse | null;
    onNext: () => void;
}

const EXAMPLE_REPORT_JSON: MigrationReportJSON = {
    coverageOverview: {
        unitName: "activity", // The wording in the coverage overview part changes depending on the tool. Mule says "code lines"
        coveragePercentage: 100,
        totalElements: 1,
        migratableElements: 1,
        nonMigratableElements: 0,
    },
    manualWorkEstimation: {
        unit: "days", // Expects all estimates to be in this unit.
        headers: ["Work Type", "Best Case", "Average Case", "Worst Case"],
        rows: [
            {
                label: "Manual Conversion",
                values: [0, 0, 0],
            },
            {
                label: "Code Validation",
                values: [1, 2, 3],
            },
        ],
    },
};

const migrationProgressHeader = (
    migrationCompleted: boolean,
    migrationSuccessful: boolean,
    migrationResponse: ImportIntegrationResponse | null
) => {
    let headerText;
    let headerDesc;

    if (migrationCompleted && migrationSuccessful) {
        headerText = "Migration Completed Successfully!";
        headerDesc =
            "Your integration project has been successfully migrated. You can now proceed to the final step to create and open your project.";
    } else if (migrationCompleted && !migrationSuccessful) {
        headerText = "Migration Failed";
        headerDesc = "The migration process encountered errors and could not be completed.";
    } else {
        headerText = "Migration in Progress...";
        headerDesc = "Please wait while we set up your new integration project.";
    }

    return (
        <div>
            <Typography variant="h2">{headerText}</Typography>
            <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>{headerDesc}</Typography>
        </div>
    );
};

const colourizeLog = (log: string, index: number) => {
    if (log.startsWith("[SEVERE]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiRed)" }}>
                {log}
            </LogEntry>
        );
    } else if (log.startsWith("[WARN]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiYellow)" }}>
                {log}
            </LogEntry>
        );
    }
    return <LogEntry key={index}>{log}</LogEntry>;
};

const getCoverageLevel = (percentage: number): string => {
    if (percentage >= 80) return "HIGH COVERAGE";
    if (percentage >= 50) return "MEDIUM COVERAGE";
    return "LOW COVERAGE";
};

const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return "var(--vscode-charts-green)";
    if (percentage >= 50) return "var(--vscode-charts-orange)";
    return "var(--vscode-charts-red)";
};

const CoverageSummary: React.FC<{ reportData: MigrationReportJSON }> = ({ reportData }) => {
    const { coverageOverview } = reportData;
    const coverageLevel = getCoverageLevel(coverageOverview.coveragePercentage);
    const coverageColor = getCoverageColor(coverageOverview.coveragePercentage);

    return (
        <CoverageContainer>
            <CoverageHeader>
                <div>
                    <CoveragePercentage coverageColor={coverageColor}>
                        {coverageOverview.coveragePercentage}%
                    </CoveragePercentage>
                    <CoverageLabel>Overall Coverage</CoverageLabel>
                </div>
                <CoverageStats>
                    <CoverageStat>
                        <span>Total {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.totalElements}</strong>
                    </CoverageStat>
                    <CoverageStat>
                        <span>Migratable {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.migratableElements}</strong>
                    </CoverageStat>
                    <CoverageStat>
                        <span>Non-migratable {coverageOverview.unitName}(s):</span>
                        <strong>{coverageOverview.nonMigratableElements}</strong>
                    </CoverageStat>
                </CoverageStats>
            </CoverageHeader>
            <CoverageProgressBar>
                <CoverageProgressFill percentage={coverageOverview.coveragePercentage} coverageColor={coverageColor} />
            </CoverageProgressBar>
            <CoverageBadge>{coverageLevel}</CoverageBadge>
        </CoverageContainer>
    );
};

const ManualWorkEstimationTable: React.FC<{ 
    reportData: MigrationReportJSON; 
    onViewReport: () => void; 
    onSaveReport: () => void; 
}> = ({
    reportData,
    onViewReport,
    onSaveReport,
}) => {
    const { manualWorkEstimation } = reportData;

    return (
        <EstimationTableContainer>
            <Typography variant="h4">Manual Work Estimation ({manualWorkEstimation.unit})</Typography>
            <VSCodeDataGrid>
                <VSCodeDataGridRow row-type="header">
                    {manualWorkEstimation.headers.map((header, index) => (
                        <VSCodeDataGridCell key={index} cell-type="columnheader" grid-column={`${index + 1}`}>
                            {header}
                        </VSCodeDataGridCell>
                    ))}
                </VSCodeDataGridRow>
                {manualWorkEstimation.rows.map((row, i) => (
                    <VSCodeDataGridRow key={i}>
                        <VSCodeDataGridCell grid-column="1">{row.label}</VSCodeDataGridCell>
                        {row.values.map((value, j) => (
                            <VSCodeDataGridCell key={j} grid-column={`${j + 2}`}>
                                {value}
                            </VSCodeDataGridCell>
                        ))}
                    </VSCodeDataGridRow>
                ))}
            </VSCodeDataGrid>
            <ReportButtonsContainer>
                <ViewReportButton onClick={onViewReport} appearance="secondary" >
                    <Codicon name="file-text" />&nbsp;View Full Report
                </ViewReportButton>
                <SaveReportButton onClick={onSaveReport} appearance="secondary" >
                    <Codicon name="save" />&nbsp;Save Report
                </SaveReportButton>
            </ReportButtonsContainer>
        </EstimationTableContainer>
    );
};

export function MigrationProgressView({
    migrationState,
    migrationLogs,
    migrationCompleted,
    migrationSuccessful,
    migrationResponse,
    onNext,
}: MigrationProgressProps) {
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const logsContainerRef = useRef<HTMLDivElement>(null);
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

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (logsContainerRef.current && isLogsOpen && !migrationCompleted) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [migrationLogs, isLogsOpen, migrationCompleted]);

    const handleViewReport = async () => {
        console.log('View report clicked', { migrationResponse });
        try {
            if (migrationResponse?.report) {
                console.log('Report found, opening via RPC...');
                rpcClient.getMigrateIntegrationRpcClient().openMigrationReport({
                    reportContent: migrationResponse.report,
                    fileName: 'migration-report.html'
                });
            }
        } catch (error) {
            console.error('Failed to open migration report:', error);
        }
    };

    const handleSaveReport = async () => {
        console.log('Save report clicked', { migrationResponse });
        try {
            if (!migrationResponse?.report) {
                console.error('No report content available to save');
                return;
            }

            // VSCode extension environment - use RPC to show save dialog
            console.log('Saving report via VSCode save dialog...');
            rpcClient.getMigrateIntegrationRpcClient().saveMigrationReport({
                reportContent: migrationResponse.report,
                defaultFileName: 'migration-report.html'
            });
        } catch (error) {
            console.error('Failed to save migration report:', error);
        }
    };

    return (
        <>
            {migrationProgressHeader(migrationCompleted, migrationSuccessful, migrationResponse)}
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
                        <Typography variant="body3" sx={{ color: "var(--vscode-terminal-ansiGreen)" }}>
                            Migration completed successfully!
                        </Typography>
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

            {/* Show button before logs when migration is completed */}
            {migrationCompleted && (
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

            {/* Migration Logs */}
            {migrationLogs.length > 0 && (
                <StepWrapper>
                    {/* Only show header when migration is completed */}
                    {migrationCompleted && (
                        <CollapsibleHeader onClick={() => setIsLogsOpen(!isLogsOpen)}>
                            <Typography variant="h4">View Detailed Logs</Typography>
                            <CardAction>
                                {isLogsOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                            </CardAction>
                        </CollapsibleHeader>
                    )}
                    {/* Show logs container when open OR when migration is in progress */}
                    {(isLogsOpen || !migrationCompleted) && migrationLogs.length > 0 && (
                        <LogsContainer ref={logsContainerRef}>{migrationLogs.map(colourizeLog)}</LogsContainer>
                    )}
                </StepWrapper>
            )}

            {/* Show button after logs when migration is in progress */}
            {!migrationCompleted && (
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
