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

import React, { useState } from "react";
import { ProgressRing, Icon, TabPanel, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { Member, Type, TypeNodeKind, Imports, AddImportItemResponse, EVENT_TYPE, UpdateTypeResponse, PayloadContext } from "@wso2/ballerina-core";
import { TypeHelperCategory, TypeHelperItem, TypeHelperOperator } from "../../TypeHelper";
import { TypeHelperContext } from "../../Context";
import { GenericImportTab } from "./GenericImportTab";
import { ContextTypeCreatorTab } from "./ContextTypeCreator";
import { BrowseTypesTab } from "./BrowseTypesTab";

export const TabContainer = styled.div`
        height: 100%;
        overflow: auto;
        display: flex;
        flex-direction: column;
        padding-bottom: 0px;
        padding-top: 10px;
    `;

export const ContentBody = styled.div`
    height: 430px;
`;

export const Footer = styled.div`
    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    padding-top: 16px;
    flex-shrink: 0;
`;

export const StickyFooterContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
`;

export const FloatingFooter = styled.div`
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: ${ThemeColors.SURFACE_DIM};
    border-top: 1px solid var(--vscode-panel-border);
    box-shadow: 0 -1px 10px 0 rgba(0, 0, 0, 0.1);
    z-index: 10;
    padding-top: 16px;
    padding-bottom: 5px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
`;

interface ContextTypeEditorProps {
    type?: Type;
    imports?: Imports;
    rpcClient: BallerinaRpcClient;
    onTypeChange: (type: Type, rename?: boolean) => void;
    onSaveType: (type: Type | string, imports?: Imports) => void;
    newType: boolean;
    newTypeValue?: string;
    isPopupTypeForm: boolean;
    simpleType?: string;
    isGraphql?: boolean;
    payloadContext?: PayloadContext;
    defaultTab?: 'import' | 'create-from-scratch' | 'browse-exisiting-types';
    note?: string;
    typeHelper: {
        loading?: boolean;
        loadingTypeBrowser?: boolean;
        referenceTypes: TypeHelperCategory[];
        basicTypes: TypeHelperCategory[];
        importedTypes: TypeHelperCategory[];
        workspaceTypes: TypeHelperCategory[];
        operators: TypeHelperOperator[];
        typeBrowserTypes: TypeHelperCategory[];
        onSearchTypeHelper: (searchText: string, isType?: boolean) => void;
        onSearchTypeBrowser: (searchText: string) => void;
        onTypeItemClick: (item: TypeHelperItem) => Promise<AddImportItemResponse>;
        onCloseCompletions?: () => void;
        onTypeCreate?: (fieldIndex: number, typeName?: string) => void;
    }
}


export function ContextTypeEditor(props: ContextTypeEditorProps) {
    const { isGraphql, newType, isPopupTypeForm, simpleType, payloadContext, defaultTab, note } = props;

    const [initialTypeKind] = useState<TypeNodeKind>(() =>
        (props.type?.codedata?.node ?? "RECORD") as TypeNodeKind
    );
    const [isSaving, setIsSaving] = useState(false);

    const type: Type = (() => {
        if (props.type) {
            return props.type;
        }
        // Initialize with default type for new types
        const defaultType = {
            name: props.newTypeValue ?? "",
            members: [] as Member[],
            editable: true,
            metadata: {
                description: "",
                deprecated: false,
                readonly: false,
                label: ""
            },
            properties: {},
            codedata: {
                node: "RECORD" as TypeNodeKind
            },
            includes: [] as string[],
            allowAdditionalFields: false
        };

        return defaultType as unknown as Type;
    })();

    // Determine initial tab based on edit mode
    const getInitialTab = () => {
        if (defaultTab) {
            return defaultTab;
        }
        if (newType) {
            return "import";
        }
        // For edit mode: if simple type, show browse tab; otherwise show create tab
        if (simpleType) {
            return "browse-exisiting-types";
        }
        return "create-from-scratch";
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab());


    const onTypeSave = async (type: Type) => {
        const name = type.name;
        setIsSaving(true);
        // IF type nodeKind is CLASS then we call graphqlEndpoint
        // TODO: for TypeDiagram we need to give a generic class creation
        if (type.codedata.node === "CLASS") {
            const response: UpdateTypeResponse = await props.rpcClient
                .getBIDiagramRpcClient()
                .createGraphqlClassType({ filePath: type.codedata?.lineRange?.fileName || 'types.bal', type, description: "" });
            if (!isPopupTypeForm) {
                await props.rpcClient
                    .getVisualizerRpcClient()
                    .openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { identifier: response.name, addType: false } });
            }

        } else {
            const response: UpdateTypeResponse = await props.rpcClient
                .getBIDiagramRpcClient()
                .updateType({ filePath: type.codedata?.lineRange?.fileName || 'types.bal', type, description: "" });
            if (!isPopupTypeForm) {
                await props.rpcClient
                    .getVisualizerRpcClient()
                    .openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { identifier: response.name, addType: false } });
            }
        }
        props.onTypeChange(type);
        props.onSaveType(type)
        setIsSaving(false);
    }

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    }

    return (
        <TypeHelperContext.Provider value={props.typeHelper}>
                {!type ? (
                    <ProgressRing />
                ) : (
                    <TabPanel
                        views={[
                            {
                                id: 'import',
                                name: 'Import',
                                icon: <Icon
                                    name="bi-import"
                                    sx={{ marginRight: '5px' }}
                                    iconSx={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}
                                />
                            },
                            {
                                id: 'create-from-scratch',
                                name: 'Create Type Schema',
                                icon: <Icon
                                    name="bi-edit"
                                    sx={{ marginRight: '5px' }}
                                    iconSx={{ fontSize: '12px', display: 'flex', alignItems: 'center', paddingTop: '2px' }}
                                />
                            },
                            {
                                id: 'browse-exisiting-types',
                                name: 'Browse Existing Types',
                                icon: <Icon
                                    name="bi-type"
                                    sx={{ marginRight: '5px' }}
                                    iconSx={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}
                                />
                            }
                        ]}
                        currentViewId={activeTab}
                        onViewChange={handleTabChange}
                        childrenSx={{ height: '100%', overflow: 'hidden' }}
                    >
                        <TabContainer id="import" data-testid="import-tab">
                            <GenericImportTab
                                type={type}
                                onTypeSave={onTypeSave}
                                isSaving={isSaving}
                                isPopupTypeForm={isPopupTypeForm}
                                setIsSaving={setIsSaving}
                                payloadContext={payloadContext}
                                onTypeSelect={props.onSaveType}
                            />
                        </TabContainer>
                        <TabContainer id="create-from-scratch" data-testid="create-from-scratch-tab">
                            <ContextTypeCreatorTab
                                onTypeChange={props.onTypeChange}
                                editingType={type}
                                newType={simpleType ? true : newType}
                                isGraphql={isGraphql}
                                initialTypeKind={initialTypeKind}
                                onTypeSave={onTypeSave}
                                isSaving={isSaving}
                                setIsSaving={setIsSaving}
                                note={note}
                            />
                        </TabContainer>
                        <TabContainer id="browse-exisiting-types" data-testid="browse-exisiting-types-tab">
                            <BrowseTypesTab
                                basicTypes={props.typeHelper.basicTypes}
                                importedTypes={props.typeHelper.importedTypes}
                                loading={props.typeHelper.loading}
                                onSearchTypeHelper={props.typeHelper.onSearchTypeHelper}
                                onTypeItemClick={props.typeHelper.onTypeItemClick}
                                onTypeSelect={props.onSaveType}
                                simpleType={simpleType}
                                note={note}
                            />
                        </TabContainer>
                    </TabPanel>
                )}
        </TypeHelperContext.Provider>
    );
}
