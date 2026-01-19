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
import { useEffect, useState } from "react";
import styled from '@emotion/styled';
import { EditorFactory, FormField, InputMode, S } from "../..";
import { InputType } from "@wso2/ballerina-core";
import { NodeKind, NodeProperties, RecordTypeField, SubPanel, SubPanelView } from "@wso2/ballerina-core";
import { CompletionItem } from "@wso2/ui-toolkit";
import ModeSwitcher from "../ModeSwitcher";
import { getInputModeFromTypes } from "./MultiModeExpressionEditor/ChipExpressionEditor/utils";

const Container = styled.div`
    width: 100%;
`;

type FieldFactoryProps = {
    field: FormField;
    selectedNode?: NodeKind;
    openRecordEditor?: (open: boolean, newType?: string | NodeProperties) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    onBlur?: () => void | Promise<void>;
    autoFocus?: boolean;
    handleOnTypeChange?: () => void;
    recordTypeFields?: RecordTypeField[];
    onIdentifierEditingStateChange?: (isEditing: boolean) => void;
    setSubComponentEnabled?: (isAdding: boolean) => void;
    handleNewTypeSelected?: (type: string | CompletionItem) => void;
    scopeFieldAddon?: React.ReactNode;
    isContextTypeEditorSupported?: boolean;
    openFormTypeEditor?: (open: boolean, newType?: string) => void;
}


export const FieldFactory = (props: FieldFactoryProps) => {
    const [renderingEditors, setRenderingEditors] = useState<InputType[]>(null);
    const [inputMode, setInputMode] = useState<InputMode>(InputMode.EXP);

    useEffect(() => {
        if (!props.field.types || props.field.types.length === 0) throw new Error("Field types are not defined");
        const newRenderingTypes: InputType[] = [];
        if (props.field.types.length === 1) newRenderingTypes.push(props.field.types[0]);
        else {
            newRenderingTypes.push(props.field.types[0]);
            newRenderingTypes.push(props.field.types[props.field.types.length - 1]);
        }
        setRenderingEditors(newRenderingTypes);
    }, [props.field]);


    return (
        <Container>
            <S.FieldInfoSection>
                <ModeSwitcher
                    value={inputMode}
                    isRecordTypeField={false}
                    onChange={(mode) => setInputMode(mode)}
                    types={props.field.types}
                />
            </S.FieldInfoSection>
            {renderingEditors && renderingEditors.map((type) => {
                if (inputMode === getInputModeFromTypes(type)) {
                    return (
                        <EditorFactory
                            {...props}
                            fieldInputType={type}
                        />
                    );
                }
                return null;
            })}
        </Container>
    );
};
