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
import { DownloadProgress, ImportIntegrationResponse } from "@wso2/ballerina-core";
import { Button, Typography } from "@wso2/ui-toolkit";
import { FinalIntegrationParams } from ".";
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

interface ProgressProps {
    importParams: FinalIntegrationParams | null;
    migrationResponse: ImportIntegrationResponse | null;
    onCreateIntegrationFiles: () => void;
}

export function MigrationProgressView({ importParams, migrationResponse, onCreateIntegrationFiles }: ProgressProps) {
    return (
        <ProgressContainer>
            <div>
                <Typography variant="h2">Importing {importParams?.name}</Typography>
                <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                    Please wait while we set up your new integration project.
                </Typography>
            </div>

            <StepWrapper>
                <Typography variant="h4">SMigrating Project</Typography>
                {!migrationResponse ? (
                    <Typography variant="caption">Starting migration...</Typography>
                ) : (
                    <Typography variant="caption" sx={{ color: "var(--vscode-terminal-ansiGreen)" }}>
                        Migration completed successfully!
                    </Typography>
                )}
                {/* <LinearProgress indeterminate /> */}
            </StepWrapper>

            <ButtonWrapper>
                <Button disabled={migrationResponse === null} onClick={onCreateIntegrationFiles} appearance="primary">
                    Finish & Open Project
                </Button>
            </ButtonWrapper>

            {/* Migration Report */}
            {migrationResponse?.report && (
                <StepWrapper>
                    <Typography variant="h4">Migration Report</Typography>
                    <ReportContainer>
                        <MigrationReportContainer htmlContent={migrationResponse.report} />
                    </ReportContainer>
                </StepWrapper>
            )}
        </ProgressContainer>
    );
}
