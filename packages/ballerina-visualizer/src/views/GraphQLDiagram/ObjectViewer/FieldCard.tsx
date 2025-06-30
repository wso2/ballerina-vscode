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
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Codicon, Confirm, Icon } from '@wso2/ui-toolkit';
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FunctionModel } from '@wso2/ballerina-core';

type ContainerProps = {
    borderColor?: string;
    haveErrors?: boolean;
};

type ButtonSectionProps = {
    isExpanded?: boolean;
};

type HeaderProps = {
    expandable?: boolean;
}

const AccordionContainer = styled.div<ContainerProps>`
    margin-top: 10px;
    overflow: hidden;
    background-color: var(--vscode-editorHoverWidget-statusBarBackground);
    &:hover {
        background-color: var(--vscode-editorHoverWidget-border);
        cursor: pointer;
    }
    border: ${(p: ContainerProps) => p.haveErrors ? "1px solid red" : "none"};
`;

const AccordionHeader = styled.div<HeaderProps>`
    padding: 10px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 3fr 1fr;
`;

const MethodSection = styled.div`
    display: flex;
    gap: 4px;
`;

const ButtonSection = styled.div<ButtonSectionProps>`
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: ${(p: ButtonSectionProps) => p.isExpanded ? "8px" : "6px"};
`;

const MethodPath = styled.span`
    align-self: center;
    margin-left: 10px;
`;


export interface FieldCardProps {
    functionModel: FunctionModel;
    goToSource: (resource: FunctionModel) => void;
    onEditFunction: (resource: FunctionModel) => void;
    onDeleteFunction: (resource: FunctionModel) => void;
    onFunctionImplement: (resource: FunctionModel) => void;
}

export function FieldCard(props: FieldCardProps) {
    const { functionModel, onEditFunction: onEditResource, onDeleteFunction: onDeleteResource, onFunctionImplement: onResourceImplement } = props;

    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [confirmEl, setConfirmEl] = React.useState(null);

    const handleEditResource = (e: Event) => {
        e.stopPropagation(); // Stop the event propagation
        onEditResource(functionModel);
    };

    const handleOpenConfirm = () => {
        setConfirmOpen(true);
    };

    const handleDeleteResource = (e: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        e.stopPropagation(); // Stop the event propagation
        setConfirmEl(e.currentTarget);
        handleOpenConfirm();
    };

    const handleConfirm = (status: boolean) => {
        if (status) {
            onDeleteResource && onDeleteResource(functionModel);
        }
        setConfirmOpen(false);
        setConfirmEl(null);
    };

    const handleResourceImplement = () => {
        onResourceImplement(functionModel)
    }

    return (
        <AccordionContainer>
            <AccordionHeader onClick={handleResourceImplement}>
                <MethodSection>
                    <MethodPath>{functionModel.name.value}</MethodPath>
                </MethodSection>
                <ButtonSection>
                    <>
                        {onEditResource! && (
                            <VSCodeButton appearance="icon" title="Edit Field" onClick={handleEditResource}>
                                <Icon name="bi-edit" sx={{ marginTop: 3.5 }} />
                            </VSCodeButton>
                        )}
                        {onDeleteResource! && (
                            <VSCodeButton appearance="icon" title="Delete Field" onClick={handleDeleteResource}>
                                <Codicon name="trash" />
                            </VSCodeButton>
                        )}
                    </>
                </ButtonSection>
            </AccordionHeader>
            <Confirm
                isOpen={isConfirmOpen}
                onConfirm={handleConfirm}
                confirmText="Okay"
                message="Are you sure want to delete this field?"
                anchorEl={confirmEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{ zIndex: 3002 }}
            />
        </AccordionContainer>
    );
};
