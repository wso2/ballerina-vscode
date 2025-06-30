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

export const ViewWrapper = styled.div`
    padding: 16px;
`;

export const Text = styled.p`
    font-size: 14px;
    color: var(--vscode-sideBarTitle-foreground);
`;

export const BodyText = styled(Text)`
    color: var(--vscode-sideBarTitle-foreground);
    margin: 0 0 8px;
    opacity: 0.5;
`;

export const BodyTinyInfo = styled(Text)`
    color: var(--vscode-sideBarTitle-foreground);
    margin: 0 0 8px;
    opacity: 0.5;
    font-weight: normal;
    font-size: 12px;
    letter-spacing: 0.39px;
`;

export const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

export const LoadingOverlayContainer = styled.div`
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    background-color: var(--vscode-editor-background);
    justify-content: center;
    align-items: center;
    flex-direction: column;
`;

export const TopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
`;
