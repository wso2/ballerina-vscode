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
import {
    GAP_BETWEEN_FIELDS,
    GAP_BETWEEN_NODE_HEADER_AND_BODY,
    IO_NODE_DEFAULT_WIDTH,
    IO_NODE_HEADER_HEIGHT
} from "../../../utils/constants";

export const TreeContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${GAP_BETWEEN_NODE_HEADER_AND_BODY}px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-welcomePage-tileBorder);
    font-style: normal;
    font-weight: 600;
    font-size: 13px;
    line-height: 24px;
    width: ${IO_NODE_DEFAULT_WIDTH}px;
`;

export const TreeHeader = styled.div((
    { isSelected, isDisabled }: { isSelected?: boolean, isDisabled?: boolean }
) => ({
    height: `${IO_NODE_HEADER_HEIGHT}px`,
    padding: '8px',
    background: 'none',
    borderRadius: '3px',
    width: '100%',
    display: 'flex',
        cursor: `${isDisabled ? 'not-allowed' : 'pointer'}`,
    '&:hover': {
        backgroundColor: `${isDisabled ? 'var(--vscode-tab-inactiveBackground)' : 'var(--vscode-list-hoverBackground)'}`
    },
    color: 'var(--vscode-inputOption-activeForeground)'
}));

export const TreeBody = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1px;
    gap: ${GAP_BETWEEN_FIELDS}px;
    background: none;
    border-radius: 3px;
    flex: none;
    flex-grow: 0;
    width: 100%;
    cursor: pointer;
    color: var(--vscode-foreground);
`;
