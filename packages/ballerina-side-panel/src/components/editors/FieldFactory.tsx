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

import React, { useRef } from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import styled from '@emotion/styled';
import { EditorFactory, FormField, InputMode, useFormContext, Provider as FormContextProvider } from "../..";
import { InputType, ExpressionProperty } from "@wso2/ballerina-core";
import { NodeKind, NodeProperties, RecordTypeField, SubPanel, SubPanelView } from "@wso2/ballerina-core";
import { CompletionItem } from "@wso2/ui-toolkit";
import { getInputModeFromTypes } from "./MultiModeExpressionEditor/ChipExpressionEditor/utils";
import { ModeSwitcherProvider } from "./ModeSwitcherContext";

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

    const formContext = useFormContext();
    const { expressionEditor } = formContext;

    const updatedGetExpressionEditorDiagnostics = useCallback(
        async (
            showDiagnostics: boolean,
            expression: string,
            key: string,
            property: ExpressionProperty
        ): Promise<void> => {
            const newTypes = property.types.map(type => ({
                ...type,
                selected: getInputModeFromTypes(type) === inputMode
            }));
            const updatedProperty = { ...property, types: newTypes };
            expressionEditor?.getExpressionEditorDiagnostics?.(
                showDiagnostics,
                expression,
                key,
                updatedProperty
            )
        },
        [expressionEditor, inputMode]
    );

    const updatedExpressionEditor = useMemo(() => {
        if (!expressionEditor) {
            return undefined;
        }
        return {
            ...expressionEditor,
            getExpressionEditorDiagnostics: updatedGetExpressionEditorDiagnostics
        };
    }, [expressionEditor, updatedGetExpressionEditorDiagnostics]);

    const updatedFormContext = useMemo(() => ({
        ...formContext,
        expressionEditor: updatedExpressionEditor
    }), [formContext, updatedExpressionEditor]);

    const getInitialSelectedInputType = (): InputType => {
        if (!props.field.types || props.field.types.length === 0) {
            throw new Error("Field types are not defined");
        }
        if (props.field.types.length === 1) {
            return props.field.types[0];
        }

        const selectedType = props.field.types.find(type => type.selected);
        if (selectedType) {
            return selectedType;
        }

        // Fallback for refactored models where all types can be unselected.
        // Prioritize the last type (usually EXPRESSION mode) for multi-type fields.
        return props.field.types[props.field.types.length - 1];
    }

    useEffect(() => {
        if (!props.field.types || props.field.types.length === 0) {
            throw new Error("Field types are not defined");
        }

        const newRenderingTypes = props.field.types.length === 1
            ? [props.field.types[0]]
            : [props.field.types[0], props.field.types[props.field.types.length - 1]];
        setRenderingEditors(newRenderingTypes);

        const selectedInputType = getInitialSelectedInputType();
        const initialInputMode = getInputModeFromTypes(selectedInputType) || InputMode.EXP;
        setInputMode(initialInputMode);
        updateFieldTypesSelection(initialInputMode);
    }, [props.field, props.recordTypeFields]);

    const isModeSwitcherEnabled = useMemo(() => {
        return renderingEditors && renderingEditors.length > 1;
    }, [renderingEditors]);

    const isRecordTypeField = useMemo(() => {
        return !!props.recordTypeFields?.find(recordField => recordField.key === props.field.key);
    }, [props.recordTypeFields, props.field.key]);

    const updateFieldTypesSelection = (targetMode: InputMode) => {
        props.field.types?.forEach(type => {
            type.selected = getInputModeFromTypes(type) === targetMode;
        });
    };

    const handleModeChange = useCallback((mode: InputMode) => {
        setInputMode(mode);
        updateFieldTypesSelection(mode);
    }, []);

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
        <FormContextProvider {...updatedFormContext}>
            <ModeSwitcherProvider
                inputMode={inputMode}
                onModeChange={handleModeChange}
                types={renderingEditors}
                isRecordTypeField={isRecordTypeField}
                isModeSwitcherEnabled={isModeSwitcherEnabled}
            >
                <Container>
                    {editorElements}
                </Container>
            </ModeSwitcherProvider>
        </FormContextProvider>
    );
};
