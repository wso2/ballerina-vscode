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

import { Typography, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { DiagramAnimation } from "./DiagramAnimation";

const LoadingViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
    text-align: center;
    gap: 12px;
`;

export function PanelLoadingView({ title, subtitle }: { title?: string; subtitle?: string }) {
    return (
        <LoadingViewContainer>
            <DiagramAnimation />
            <Typography variant="h4" sx={{ margin: 0, marginTop: "16px" }}>
                {title ?? "Loading Node Palette"}
            </Typography>
            <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                {subtitle ?? "Please wait while components are being prepared."}
            </Typography>
        </LoadingViewContainer>
    );
}
