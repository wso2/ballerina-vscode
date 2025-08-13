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
import { IDMFormProps, ModelState, IntermediateClause, Mapping, CodeData, CustomFnMetadata, LineRange, ResultClauseType } from "@wso2/ballerina-core";
import { CompletionItem, ErrorBoundary } from "@wso2/ui-toolkit";

import { InlineDataMapper } from "./components/DataMapper/DataMapper";
import { ExpressionProvider } from "./context/ExpressionContext";

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
}

export interface InlineDataMapperProps {
    modelState: ModelState;
    name: string;
    applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>;
    addArrayElement: (outputId: string, viewId: string, name: string) => Promise<void>;
    generateForm: (formProps: IDMFormProps) => JSX.Element;
    convertToQuery: (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => Promise<void>;
    addClauses: (clause: IntermediateClause, targetField: string, isNew: boolean, index?:number) => Promise<void>;
    addSubMapping: (subMappingName: string, type: string, index: number, targetField: string, importsCodedata?: CodeData) => Promise<void>;
    deleteMapping: (mapping: Mapping, viewId: string) => Promise<void>;
    mapWithCustomFn: (mapping: Mapping, metadata: CustomFnMetadata, viewId: string) => Promise<void>;
    goToFunction: (functionRange: LineRange) => Promise<void>;
    onClose: () => void;
    handleView: (viewId: string, isSubMapping?: boolean) => void;
}

export interface DataMapperViewProps extends InlineDataMapperProps {
    expressionBar: ExpressionBarProps;
}

export function DataMapperView({ expressionBar, ...props }: DataMapperViewProps) {
    return (
        <ErrorBoundary errorMsg="An error occurred while rendering the Inline Data Mapper">
            <QueryClientProvider client={queryClient}>
                <Global styles={globalStyles} />
                <ExpressionProvider {...expressionBar}>
                    <InlineDataMapper {...props} />
                </ExpressionProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
