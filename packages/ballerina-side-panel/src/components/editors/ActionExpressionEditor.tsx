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
import { useFormContext } from "../../context";
import { ContextAwareExpressionEditorProps, ExpressionEditor } from "./ExpressionEditor";
import { LinkButton } from "@wso2/ui-toolkit/lib/components/LinkButton/LinkButton";
import styled from "@emotion/styled";

const Row = styled.div`
    display: flex;
    flex-direction: column;
    margin: 0;
    width: 100%;
`;

const actionButtonStyles = {
    padding: "4px 6px",
    margin: 0,
    marginTop: "6px",
    fontSize: "13px",
};

export const ActionExpressionEditor = (props: ContextAwareExpressionEditorProps) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    return (
        <>
            <Row>
                <ExpressionEditor
                    fileName={fileName}
                    {...targetLineRange}
                    {...props}
                    {...form}
                    {...expressionEditor}
                />
                <LinkButton onClick={props.field.actionCallback} sx={actionButtonStyles}>{props.field.actionLabel}</LinkButton>
            </Row>
        </>
    );
};
