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

import React, { useRef } from "react";
import { useEffect, useState, useMemo } from "react";
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
    const isModeSelectionDirty = useRef<boolean>(false)

    useEffect(() => {
        if (!props.field.types || props.field.types.length === 0) {
            throw new Error("Field types are not defined");
        }

        //TODO: Should be removed once fields with type field is fixed to
        // update the types property correctly when changing the type.
        if (props.recordTypeFields?.find(recordField => recordField.key === props.field.key)) {
            setRenderingEditors([
                { fieldType: "RECORD_MAP_EXPRESSION", selected: true } as InputType,
                { fieldType: "EXPRESSION", selected: false } as InputType
            ]);
            if (!isModeSelectionDirty.current) {
                setInputMode(InputMode.RECORD);
            }
            return;
        }

        const newRenderingTypes = props.field.types.length === 1
            ? [props.field.types[0]]
            : [props.field.types[0], props.field.types[props.field.types.length - 1]];
        setRenderingEditors(newRenderingTypes);

        if (!isModeSelectionDirty.current) {
            const selectedInputType = props.field.types.find(type => type.selected) || (
                typeof props.field.value === 'string' && props.field.value.trim() !== ''
                    ? props.field.types[props.field.types.length - 1]
                    : props.field.types[0]
            );
            const initialInputMode = getInputModeFromTypes(selectedInputType) || InputMode.EXP;
            setInputMode(initialInputMode);
        }
    }, [props.field, props.recordTypeFields]);

    const isModeSwitcherEnabled = useMemo(() => {
        return renderingEditors && renderingEditors.length > 1;
    }, [renderingEditors]);

    const editorElements = useMemo(() => {
        if (!renderingEditors) return null;

        if (!isModeSwitcherEnabled) {
            return <EditorFactory {...props} fieldInputType={renderingEditors[0]} />;

        }
        return renderingEditors.map((type, index) => {
            if (inputMode !== getInputModeFromTypes(type)) return null;
            return (<EditorFactory key={index} {...props} fieldInputType={type} />)
        });
    }, [renderingEditors, isModeSwitcherEnabled, inputMode, props]);


    return (
        <Container>
            {isModeSwitcherEnabled && (
                <S.FieldInfoSection>
                    <ModeSwitcher
                        value={inputMode}
                        //TODO: Should be removed once fields with type field is fixed to
                        // update the types property correctly when changing the type.
                        isRecordTypeField={!!props.recordTypeFields?.find(recordField => recordField.key === props.field.key)}
                        onChange={(mode) => {
                            setInputMode(mode);
                            isModeSelectionDirty.current = true;
                        }}
                        types={props.field.types}
                    />
                </S.FieldInfoSection>
            )}
            {editorElements}
        </Container>
    );
};
