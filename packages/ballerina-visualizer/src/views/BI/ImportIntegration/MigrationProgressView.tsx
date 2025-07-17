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
import { DownloadProgress } from "@wso2/ballerina-core";
import { FinalIntegrationParams } from ".";
import { Typography } from "@wso2/ui-toolkit";

const ProgressContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    display: flex;
    flex-direction: column;
    gap: 40px;
`;

const StepWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

interface ProgressProps {
    importParams: FinalIntegrationParams | null;
    toolPullProgress: DownloadProgress | null;
}

export function MigrationProgressView({ importParams, toolPullProgress }: ProgressProps) {
    // In a real scenario, you'd have another listener for the main import task's progress
    // const [mainProgress, setMainProgress] = useState(null);
    // useEffect(() => { /* listener for main import task */ }, []);

    const isToolPulling = toolPullProgress && toolPullProgress.step !== 3 && toolPullProgress.step !== -1;
    const isToolReady = !toolPullProgress || toolPullProgress.success;
    const toolPullFailed = toolPullProgress?.step === -1;

    return (
        <ProgressContainer>
            <div>
                <Typography variant="h2">Importing {importParams?.name}</Typography>
                <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                    Please wait while we set up your new integration project.
                </Typography>
            </div>

            {/* Step 1: Tool Download Progress */}
            <StepWrapper>
                <Typography variant="h4">Step 1 of 2: Preparing Tools</Typography>
                {isToolPulling && (
                    <>
                        <Typography variant="caption">{toolPullProgress.message}</Typography>
                        {/* <LinearProgress value={toolPullProgress.percentage || 0} /> */}
                    </>
                )}
                {isToolReady && (
                    <Typography variant="caption" sx={{ color: 'var(--vscode-terminal-ansiGreen)' }}>
                        Tools are ready.
                    </Typography>
                )}
                {toolPullFailed && (
                    <Typography variant="caption" sx={{ color: 'var(--vscode-terminal-ansiRed)' }}>
                        Error: {toolPullProgress.message}
                    </Typography>
                )}
            </StepWrapper>

            {/* Step 2: Main Migration Progress */}
            {isToolReady && (
                <StepWrapper>
                    <Typography variant="h4">Step 2 of 2: Migrating Project</Typography>
                    {/* This would be driven by a different progress state */}
                    <Typography variant="caption">Starting migration...</Typography>
                    {/* <LinearProgress indeterminate /> */}
                </StepWrapper>
            )}
        </ProgressContainer>
    );
}