/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Button, Codicon, Typography, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

const ErrorViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px 16px;
    text-align: center;
    height: 100%;
`;

const ErrorHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    justify-content: center;

    & .codicon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        line-height: 1;
        position: relative;
    }
    & h4, & h3, & .typography-h4 {
        margin: 0;
        line-height: 1;
    }
`;

export function ConnectorErrorView({ errorMessage, onBack }: { errorMessage?: string; onBack?: () => void }) {
    return (
        <ErrorViewContainer role="alert" aria-live="polite">
            <ErrorHeader>
                <Codicon name="error" iconSx={{ fontSize: "18px", color: ThemeColors.ERROR, display: "flex" }} />
                <Typography variant="h4" sx={{ margin: 0 }}>Error</Typography>
            </ErrorHeader>
            <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                {errorMessage || "An error occurred while fetching connection information."}
            </Typography>
            {onBack && (
                <Button appearance="secondary" onClick={onBack}>
                    Go Back
                </Button>
            )}
        </ErrorViewContainer>
    );
}
