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

import { RefObject } from "react";
import { FieldProvider, FormField, InputMode } from "@wso2/ballerina-side-panel";
import {
    Flow,
    FunctionNode,
    LineRange,
    Property,
    RecordTypeField,
    TRIGGER_CHARACTERS
} from "@wso2/ballerina-core";
import { CompletionItem, FormExpressionEditorRef, HelperPaneHeight } from "@wso2/ui-toolkit";
import { getHelperPaneNew } from "../HelperPaneNew";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";

interface CreatePromptHelperPaneParams {
    selectedNode: FunctionNode;
    model: Flow;
    fieldKey: string;
    exprRef: RefObject<FormExpressionEditorRef>;
    anchorRef: RefObject<HTMLDivElement>;
    defaultValue: string;
    value: string;
    onChange: (value: string, options?: any) => void;
    changeHelperPaneState: (isOpen: boolean) => void;
    helperPaneHeight: HelperPaneHeight;
    recordTypeField?: RecordTypeField;
    valueTypeConstraint?: string | string[];
    inputMode?: InputMode;
    completions: CompletionItem[];
    filteredCompletions: CompletionItem[];
    projectPath: string;
    rpcClient: BallerinaRpcClient;
    debouncedRetrieveCompletions: (
        value: string,
        property: Property,
        offset: number,
        triggerCharacter?: string
    ) => Promise<void>;
}

export function createPromptHelperPane(params: CreatePromptHelperPaneParams): JSX.Element {
    const {
        selectedNode,
        model,
        fieldKey,
        anchorRef,
        defaultValue,
        value,
        onChange,
        changeHelperPaneState,
        helperPaneHeight,
        recordTypeField,
        valueTypeConstraint,
        inputMode,
        completions,
        filteredCompletions,
        projectPath,
        rpcClient,
        debouncedRetrieveCompletions
    } = params;

    const property: Property = {
        metadata: { label: "Prompt", description: "Prompt expression" },
        valueType: "ai:Prompt",
        value: value,
        optional: false,
        editable: true
    };

    const finalRecordTypeField: RecordTypeField = recordTypeField || {
        key: fieldKey,
        property: property,
        recordTypeMembers: []
    };

    const field: FormField = {
        codedata: selectedNode.properties?.['prompt'].codedata,
        key: fieldKey,
        label: "Prompt",
        type: "RAW_TEMPLATE",
        valueTypeConstraint: valueTypeConstraint,
        enabled: true,
        optional: false,
        editable: true,
        documentation: "Prompt expression",
        value: value,
        valueType: "RAW_TEMPLATE"
    };

    const helperPane = getHelperPaneNew({
        fieldKey: fieldKey,
        fileName: model.fileName,
        targetLineRange: selectedNode.codedata?.lineRange || (selectedNode.properties?.['prompt']?.codedata?.lineRange as LineRange),
        anchorRef: anchorRef,
        onClose: () => changeHelperPaneState(false),
        defaultValue: defaultValue,
        currentValue: value,
        onChange: (newValue: string) => onChange(newValue, undefined),
        helperPaneHeight: helperPaneHeight,
        recordTypeField: finalRecordTypeField,
        updateImports: async (importStatement: string) => {
            await rpcClient.getBIDiagramRpcClient().updateImports({
                filePath: model.fileName,
                importStatement: importStatement,
            });
        },
        completions: completions,
        projectPath: projectPath,
        selectedType: undefined,
        filteredCompletions: filteredCompletions,
        isInModal: false,
        valueTypeConstraint: valueTypeConstraint as string || "ai:Prompt",
        forcedValueTypeConstraint: valueTypeConstraint as string || "ai:Prompt",
        handleRetrieveCompletions: async (value: string, property: Property, offset: number, triggerCharacter?: string) =>
            await debouncedRetrieveCompletions(value, property, offset, triggerCharacter),
        handleValueTypeConstChange: () => { },
        inputMode: inputMode || InputMode.PROMPT
    });

    return (
        <FieldProvider initialField={field} triggerCharacters={TRIGGER_CHARACTERS}>
            {helperPane}
        </FieldProvider>
    );
}
