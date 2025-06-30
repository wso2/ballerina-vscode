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
import React from "react";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { useStyles } from "./style";

const EmptyLocalVarContainer = styled.div`
    width: 100%;
    height: 120px;
    padding: 15px;
    background-color: var(--vscode-inputValidation-infoBackground);
    color: var(--vscode-input-foreground);
`;

const AlertText = styled.p`
    margin-bottom: 10px;
`;

interface EmptyLocalVarPanelProps {
    onAddNewVar: () => void;
}

export function EmptyLocalVarPanel(props: EmptyLocalVarPanelProps) {
    const { onAddNewVar } = props;
    const overlayClasses = useStyles();

    return (
        <EmptyLocalVarContainer>
            <AlertText>You do not have any local variable in this transformation.</AlertText>
            <Button
                appearance="icon"
                onClick={onAddNewVar}
                className={overlayClasses.linePrimaryButton} 
                sx={{width: '100%'}}
            >
                <Codicon sx={{marginTop: 2, marginRight: 5}} name="add"/>
                <div>Add New</div>
            </Button>
        </EmptyLocalVarContainer>
    );
}
