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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FunctionDefinition } from "@wso2/syntax-tree";
import { HistoryEntry, STModification } from "@wso2/ballerina-core";
import { DataMapper } from "./components/DataMapper/DataMapper";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import { LibraryBrowserRpcClient } from "@wso2/ballerina-rpc-client/lib/rpc-clients/library-browser/rpc-client";
import { StatementEditorComponentProps } from "@wso2/record-creator";

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

export interface DataMapperViewProps {
    fnST: FunctionDefinition;
    filePath: string;
    langServerRpcClient: LangClientRpcClient;
    libraryBrowserRpcClient?: LibraryBrowserRpcClient;
    applyModifications: (modifications: STModification[], isRecordModification?: boolean) => Promise<void>;
    goToFunction?: (componentInfo: HistoryEntry) => Promise<void>;
    onClose?: () => void;
    renderRecordPanel?: (props: {
        closeAddNewRecord: (createdNewRecord?: string) => void,
        onUpdate: (update: boolean) => void
    } & StatementEditorComponentProps) => React.ReactElement;
}

export function DataMapperView(props: DataMapperViewProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <DataMapper {...props}/>
        </QueryClientProvider>
    );
}
