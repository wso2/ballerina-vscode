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

/** @jsx jsx */
import type {} from "@emotion/styled";
import type {} from "@projectstorm/react-diagrams-core";
import type {} from "@projectstorm/react-diagrams";
import { css, Global } from '@emotion/react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DMFormProps, ModelState, IntermediateClause, Mapping, CodeData, FnMetadata, LineRange, ResultClauseType, IOType, Property, LinePosition, TypeKind } from "@wso2/ballerina-core";
import { CompletionItem } from "@wso2/ui-toolkit";

import { DataMapperEditor } from "./components/DataMapper/DataMapperEditor";
import { ExpressionProvider } from "./context/ExpressionContext";
import { DataMapperErrorBoundary } from "./components/DataMapper/ErrorBoundary";
export { DataMapperErrorBoundary };

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 1000,
            gcTime: 1000,
        },
    },
});

const globalStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export interface ExpressionBarProps {
    completions: CompletionItem[];
    isUpdatingSource?: boolean;
    triggerCompletions: (outputId: string, viewId: string, value: string, cursorPosition?: number) => void;
    onCompletionSelect: (value: string) => void;
    onSave: (outputId: string, value: string, viewId: string, name: string) => Promise<void>;
    onCancel: () => void;
    goToSource: (outputId: string, viewId: string) => Promise<void>;
}

export interface DataMapperEditorProps {
    modelState: ModelState;
    name: string;
    reusable?: boolean;
    applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>;
    addArrayElement: (outputId: string, viewId: string, name: string) => Promise<void>;
    convertToQuery: (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => Promise<void>;
    addClauses: (clause: IntermediateClause, targetField: string, isNew: boolean, index:number) => Promise<void>;
    deleteClause: (targetField: string, index: number) => Promise<void>;
    getClausePosition: (targetField: string, index: number) => Promise<LinePosition>;
    addSubMapping: (subMappingName: string, type: string, index: number, targetField: string, importsCodedata?: CodeData) => Promise<void>;
    deleteMapping: (mapping: Mapping, viewId: string) => Promise<void>;
    deleteSubMapping: (index: number, viewId: string) => Promise<void>;
    mapWithCustomFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>;
    mapWithTransformFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>;
    goToFunction: (functionRange: LineRange) => Promise<void>;
    enrichChildFields: (parentField: IOType) => Promise<void>;
    onRefresh: () => Promise<void>;
    onClose: () => void;
    onEdit?: () => void;
    handleView: (viewId: string, isSubMapping?: boolean) => void;
    generateForm: (formProps: DMFormProps) => JSX.Element;
    genUniqueName: (name: string, viewId: string) => Promise<string>;
    getConvertedExpression: (expression: string, expressionType: TypeKind, outputType: TypeKind) => Promise<string>;
    createConvertedVariable: (variableName: string, isInput: boolean, typeName?: string, parentTypeName?: string) => Promise<void>;
    undoRedoGroup: () => JSX.Element;
}

export interface DataMapperProps extends DataMapperEditorProps {
    goToSource: () => void;
    expressionBar: ExpressionBarProps;
}

export function DataMapper({ goToSource, expressionBar, ...props }: DataMapperProps) {
    return (
        <DataMapperErrorBoundary onClose={props.onClose} goToSource={goToSource}>
            <QueryClientProvider client={queryClient}>
                <Global styles={globalStyles} />
                <ExpressionProvider {...expressionBar}>
                    <DataMapperEditor {...props}/>
                </ExpressionProvider>
            </QueryClientProvider>
        </DataMapperErrorBoundary>
    );
}
