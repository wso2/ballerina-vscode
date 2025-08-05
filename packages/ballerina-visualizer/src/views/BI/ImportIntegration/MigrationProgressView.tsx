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
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import MigrationReportContainer from "./MigrationReportContainer";

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-start;
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
`;

const LogsContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    max-height: 200px;
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

const ReportContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;

    & .container {
        flex-direction: column;
    }
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

interface ProgressProps {
    migrationState: string | null;
    migrationLogs: string[];
    migrationCompleted: boolean;
    migrationSuccessful: boolean;
    migrationResponse: ImportIntegrationResponse | null;
    onNext: () => void;
}

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

export function MigrationProgressView({
    migrationState,
    migrationLogs,
    migrationCompleted,
    migrationSuccessful,
    migrationResponse,
    onNext,
}: ProgressProps) {
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);

    return (
        <>
            <div>
                {migrationCompleted && migrationSuccessful ? (
                    <>
                        <Typography variant="h2">Migration Completed Successfully!</Typography>
                        <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                            Your integration project has been successfully migrated. You can now proceed to the final
                            step to create and open your project.
                        </Typography>
                    </>
                ) : migrationCompleted && !migrationSuccessful ? (
                    <>
                        <Typography variant="h2">Migration Failed</Typography>
                        <Typography sx={{ color: "var(--vscode-terminal-ansiRed)" }}>
                            The migration process encountered errors and could not be completed. Please check the logs
                            below for more details.
                        </Typography>
                    </>
                ) : (
                    <>
                        <Typography variant="h2">Migration in Progress...</Typography>
                        <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                            Please wait while we set up your new integration project.
                        </Typography>
                    </>
                )}
            </div>
            <StepWrapper>
                {migrationCompleted && migrationSuccessful ? (
                    <Typography variant="body3" sx={{ color: "var(--vscode-terminal-ansiGreen)" }}>
                        Migration completed successfully!
                    </Typography>
                ) : migrationCompleted && !migrationSuccessful ? (
                    <></>
                ) : (
                    <Typography variant="progress">{migrationState || "Starting migration..."}</Typography>
                )}
            </StepWrapper>

            <ButtonWrapper>
                <Button disabled={!migrationCompleted || !migrationSuccessful} onClick={onNext} appearance="primary">
                    Proceed to Final Step
                </Button>
            </ButtonWrapper>

            {/* Migration Logs */}
            {migrationLogs.length > 0 && (
                <StepWrapper>
                    <CollapsibleHeader onClick={() => setIsLogsOpen(!isLogsOpen)}>
                        <Typography variant="h4">View Detailed Logs</Typography>
                        <CardAction>
                            {isLogsOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                        </CardAction>
                    </CollapsibleHeader>
                    {isLogsOpen && migrationLogs.length > 0 && (
                        <LogsContainer>{migrationLogs.map(colourizeLog)}</LogsContainer>
                    )}
                </StepWrapper>
            )}
            {/* Migration Report */}
            {migrationCompleted && migrationResponse?.report && (
                <StepWrapper>
                    <CollapsibleHeader onClick={() => setIsReportOpen(!isReportOpen)}>
                        <Typography variant="h4">View Migration Report</Typography>
                        <CardAction>
                            {isReportOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                        </CardAction>
                    </CollapsibleHeader>
                    {isReportOpen && (
                        <ReportContainer>
                            <MigrationReportContainer htmlContent={migrationResponse.report} />
                        </ReportContainer>
                    )}
                </StepWrapper>
            )}
        </>
    );
}
