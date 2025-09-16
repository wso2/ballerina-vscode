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
// tslint:disable: no-explicit-any
import { css } from "@emotion/css";

import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";

export interface ContainerProps {
    readonly?: boolean;
}

export const ClauseItemListContainer = styled.div`
    margin-top: 10px;
`;

export const EditorContainer = styled.div`
    display: flex;
    margin: 10px 0;
    flex-direction: column;
    border-radius: 5px;
    padding: 10px;
    border: 1px solid var(--vscode-dropdown-border);
    gap: 15px;
`;

export const EditorContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-left: 16px;
    padding-right: 16px;
    gap: 10px;
`;


export const ActionWrapper = styled.div`
    display: flex;
    flex-direction: row;
`;

export const EditIconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    color: var(--vscode-statusBarItem-remoteBackground);
`;

export const ProgressRingWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
    margin-left: 10px;
`;

export const DeleteIconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    color: var(--vscode-notificationsErrorIcon-foreground);
`;

export const AddIconContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
`;

export const AddIcon = styled(Icon)`
    cursor: pointer;
    font-size: 20px;
    transition: all 0.2s;
    &:hover {
        color: var(--vscode-textLink-foreground);
    }
`;

export const IconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    margin-right: 10px;
`;

export const ContentWrapper = styled.div<ContainerProps>`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: ${(props: ContainerProps) => `${props.readonly ? "100%" : "calc(100% - 60px)"}`};
    cursor: ${(props: ContainerProps) => `${props.readonly ? "default" : "pointer"}`};
    height: 100%;
    color: var(--vscode-editor-foreground);
    &:hover, &.active {
        ${(props: ContainerProps) => `${props.readonly ? "" : "background: var(--vscode-welcomePage-tileHoverBackground)"}`};
    };
`;

export const KeyTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: 150px;
    background-color: var(--vscode-inputValidation-infoBackground);
    height: 100%;
`;

export const Key = styled.div`
    cursor: pointer;
    margin-left: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const IconTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: 100px;
    background-color: var(--vscode-inputValidation-infoBackground);
    height: 100%;
`;

export const ValueTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    padding: 0 10px;
    height: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const OptionLabel = styled.div`
    font-size: 12px;
    line-height: 14px;
    margin-left: 5px;
`;

export const HeaderLabel = styled.div`
    display: flex;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-dropdown-border);
    display: flex;
    width: 100%;
    height: 32px;
    align-items: center;
`;

export const ActionIconWrapper = styled.div`
    display: flex;
    align-items: center;
    cursor: pointer;
    height: 14px;
    width: 14px;
`;

export const TypeWrapper = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
