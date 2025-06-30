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
import { IDMModel, Mapping } from "@wso2/ballerina-core";
import { ErrorBoundary } from "@wso2/ui-toolkit";

import { InlineDataMapper } from "./components/DataMapper/DataMapper";

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

export interface DataMapperViewProps {
    model: IDMModel;
    applyModifications: (mappings: Mapping[]) => Promise<void>;
    addArrayElement: (targetField: string) => Promise<void>;
    onClose: () => void;
}

export function DataMapperView(props: DataMapperViewProps) {
    return (
        <ErrorBoundary errorMsg="An error occurred while redering the Inline Data Mapper">
            <QueryClientProvider client={queryClient}>
                <Global styles={globalStyles} />
                <InlineDataMapper {...props}/>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
