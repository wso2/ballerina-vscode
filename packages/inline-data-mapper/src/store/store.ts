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
import { create } from "zustand";

import { InputOutputPortModel } from "../components/Diagram/Port";

export interface DataMapperSearchState {
    inputSearch: string;
    setInputSearch: (inputSearch: string) => void;
    outputSearch: string;
    setOutputSearch: (outputSearch: string) => void;
    resetSearchStore: () => void;
}

export interface DataMapperFieldsState {
    fields: string[];
    setFields: (fields: string[]) => void;
    resetFields: () => void;
}

export interface DataMapperIOConfigPanelState {
    isIOConfigPanelOpen: boolean;
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => void;
    ioConfigPanelType: string;
    setIOConfigPanelType: (ioConfigPanelType: string) => void;
    isSchemaOverridden: boolean;
    setIsSchemaOverridden: (isSchemaOverridden: boolean) => void;
}

export interface DataMapperExpressionBarState {
    focusedPort: InputOutputPortModel;
    focusedFilter: Node;
    inputPort: InputOutputPortModel;
    setFocusedPort: (port: InputOutputPortModel) => void;
    setFocusedFilter: (port: Node) => void;
    setInputPort: (port: InputOutputPortModel) => void;
    resetFocus: () => void;
    resetInputPort: () => void;
}

export const useDMSearchStore = create<DataMapperSearchState>((set) => ({
    inputSearch: "",
    outputSearch: "",
    setInputSearch: (inputSearch: string) => set({ inputSearch }),
    setOutputSearch: (outputSearch: string) => set({ outputSearch }),
    resetSearchStore: () => set({ inputSearch: '', outputSearch: '' })
}));

export const useDMCollapsedFieldsStore = create<DataMapperFieldsState>((set) => ({
    fields: [],
    setFields: (fields: string[])  => set({ fields }),
    resetFields: () => set({ fields: [] })
}));

export const useDMExpandedFieldsStore = create<DataMapperFieldsState>((set) => ({
    fields: [],
    setFields: (fields: string[])  => set({ fields }),
    resetFields: () => set({ fields: [] })
}));

export const useDMIOConfigPanelStore = create<DataMapperIOConfigPanelState>((set) => ({
    isIOConfigPanelOpen: false,
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => set({ isIOConfigPanelOpen }),
    ioConfigPanelType: 'input',
    setIOConfigPanelType: (ioConfigPanelType: string) => set({ ioConfigPanelType }),
    isSchemaOverridden: false,
    setIsSchemaOverridden: (isSchemaOverridden: boolean) => set({ isSchemaOverridden }),
}));

export const useDMExpressionBarStore = create<DataMapperExpressionBarState>((set) => ({
    focusedPort: undefined,
    focusedFilter: undefined,
    setFocusedPort: (focusedPort: InputOutputPortModel) => set({ focusedPort }),
    setFocusedFilter: (focusedFilter: Node) => set({ focusedFilter }),
    inputPort: undefined,
    setInputPort: (inputPort: InputOutputPortModel) => set({ inputPort }),
    resetFocus: () => set({ focusedPort: undefined, focusedFilter: undefined }),
    resetInputPort: () => set({ inputPort: undefined })
}));
