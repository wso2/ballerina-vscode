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

import React, { useEffect, useState } from "react";
import { Button, Codicon, TextField, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { FormField } from "../Form/types";
import { useFormContext } from "../../context";
import { RecordTypeField } from "@wso2/ballerina-core";
import { SubPanel } from "@wso2/ballerina-core";
import { SubPanelView } from "@wso2/ballerina-core";
import { ContextAwareExpressionEditor } from "./ExpressionEditor";

// Reusing the same styled components namespace
namespace S {
    export const Container = styled.div({
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    });

    export const LabelContainer = styled.div({
        display: "flex",
        alignItems: "center",
    });

    export const Label = styled.label({
        color: "var(--vscode-editor-foreground)",
        textTransform: "capitalize",
    });

    export const Description = styled.div({
        color: "var(--vscode-list-deemphasizedForeground)",
    });

    export const EditorContainer = styled.div({
        display: "flex",
        gap: "8px",
        alignItems: "center",
        width: "100%",
        padding: "8px",
        border: "1px solid var(--dropdown-border)",
        borderRadius: "8px",
    });

    export const KeyValueContainer = styled.div({
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
    });

    export const AddNewButton = styled(Button)`
        & > vscode-button {
            color: var(--vscode-textLink-activeForeground);
            border-radius: 0px;
            padding: 3px 5px;
            margin-top: 4px;
        }
        & > vscode-button > * {
            margin-right: 6px;
        }
    `;

    export const DeleteButton = styled(Button)`
        & > vscode-button {
            color: ${ThemeColors.ERROR};
        }
    `;
}

interface MapEditorProps {
    field: FormField;
    label: string;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
    visualizable?: boolean;
    recordTypeField?: RecordTypeField;
}

export function MapEditor(props: MapEditorProps) {
    const [editorCount, setEditorCount] = useState(1);

    const onDelete = (index: number) => {
        if (editorCount <= 1) return;
        setEditorCount(prev => prev - 1);
    }

    const onAddAnother = () => {
        if (editorCount <= 1) return;
        setEditorCount(prev => prev + 1);
    }

    return (
        <S.Container>
            <S.LabelContainer>
                <S.Label>{props.field.label}</S.Label>
            </S.LabelContainer>
            <S.Description>{props.field.documentation}</S.Description>
            {[...Array(editorCount)].map((_, index) => (
                <S.EditorContainer key={`${props.field.key}-${index}`}>
                    <S.KeyValueContainer>
                        <ContextAwareExpressionEditor
                            {...props}
                            field={props.field}
                            id={`${props.field.key}-${index}-value`}
                            fieldKey={`${props.field.key}-${index}-value`}
                            showHeader={false}
                            placeholder="Value"
                        />
                        
                    </S.KeyValueContainer>
                    <S.DeleteButton
                        appearance="icon"
                        onClick={() => onDelete(index)}
                        disabled={!props.field.editable}
                        tooltip="Delete"
                    >
                        <Codicon name="trash" />
                    </S.DeleteButton>
                </S.EditorContainer>
            ))}
            <S.AddNewButton appearance="icon" aria-label="add" onClick={onAddAnother}>
                <Codicon name="add" />
                {props.label}
            </S.AddNewButton>
        </S.Container>
    );
};
