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

import React from "react";
import styled from "@emotion/styled";
import { Button } from "@wso2/ui-toolkit";

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
`;

const ModalContainer = styled.div`
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    width: 90%;
    max-width: 500px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
`;

const ModalTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
`;

const ModalMessage = styled.p`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin: 0 0 20px 0;
    line-height: 1.5;
`;

const ModalActions = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
`;

interface ConfirmationModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
}) => {
    return (
        <Overlay onClick={onCancel}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                </ModalHeader>
                <ModalMessage>{message}</ModalMessage>
                <ModalActions>
                    <Button appearance="secondary" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button appearance="primary" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </ModalActions>
            </ModalContainer>
        </Overlay>
    );
};
