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

import { css } from "@emotion/css";

export const useStyles = () => ({
    canvas: css({
        backgroundImage: "radial-gradient(var(--vscode-editor-inactiveSelectionBackground) 10%, transparent 0px)",
        backgroundColor: "var(--vscode-editor-background)",
        backgroundSize: "16px 16px",
        minHeight: "calc(100vh - 50px)",
        minWidth: "100vw",
    }),
});

export const Container: React.FC<any> = styled.div`
    align-items: center;
    display: flex;
    flex-direction: column;
    height: 100vh;
    justify-content: center;
    width: 100vw;
`;

export const DiagramContainer: React.FC<any> = styled.div`
    align-items: center;
    backgroundImage: 'radial-gradient(circle at 0.5px 0.5px, var(--vscode-textBlockQuote-border) 1px, transparent 0)',
    backgroundColor: 'var(--vscode-input-background)',
    backgroundSize: '8px 8px',
    display: flex;
    flex-direction: column;
    height: calc(100vh - 50px);
    justify-content: center;
    width: 100vw;
    svg:not(:root) {
        overflow: visible;
    }
`;
