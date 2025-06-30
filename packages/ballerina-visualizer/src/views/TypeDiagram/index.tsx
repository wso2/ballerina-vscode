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

import React, { useEffect, useRef } from "react";
import { VisualizerLocation, NodePosition, Type, EVENT_TYPE, MACHINE_VIEW, TypeNodeKind } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { TypeDiagram as TypeDesignDiagram } from "@wso2/type-diagram";
import { Button, Codicon, ProgressRing, ThemeColors, View, ViewContent } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { TitleBar } from "../../components/TitleBar";
import { FormTypeEditor } from "../BI/TypeEditor";

const HeaderContainer = styled.div`
    align-items: center;
    color: ${ThemeColors.ON_SURFACE};
    display: flex;
    flex-direction: row;
    font-family: GilmerBold;
    font-size: 16px;
    height: 50px;
    justify-content: space-between;
    min-width: 350px;
    padding-inline: 10px;
    width: calc(100vw - 20px);
`;

export const Title: React.FC<any> = styled.div`
    color: ${ThemeColors.ON_SURFACE};
`;

interface TypeDiagramProps {
    selectedTypeId?: string;
    projectUri?: string;
    addType?: boolean;
}

interface TypeEditorState {
    isTypeCreatorOpen: boolean;
    editingTypeId: string | undefined;
    newTypeName: string | undefined;
    editingType: Type;
}

export function TypeDiagram(props: TypeDiagramProps) {
    const { selectedTypeId, projectUri, addType } = props;
    const { rpcClient } = useRpcContext();
    const commonRpcClient = rpcClient.getCommonRpcClient();
    const [visualizerLocation, setVisualizerLocation] = React.useState<VisualizerLocation>();
    const [typesModel, setTypesModel] = React.useState<Type[]>(undefined);
    const [focusedNodeId, setFocusedNodeId] = React.useState<string | undefined>(undefined);
    const [highlightedNodeId, setHighlightedNodeId] = React.useState<string | undefined>(selectedTypeId);
    const [typeEditorState, setTypeEditorState] = React.useState<TypeEditorState>({
        isTypeCreatorOpen: false,
        editingTypeId: undefined,
        newTypeName: undefined,
        editingType: undefined,
    });

    useEffect(() => {
        if (addType) {
            setTypeEditorState((prevState) => ({
                ...prevState,
                isTypeCreatorOpen: true,
            }));
        }
    }, [addType]);

    useEffect(() => {
        if (rpcClient) {
            rpcClient.getVisualizerLocation().then((value) => {
                setVisualizerLocation(value);
            });
        }
    }, [rpcClient]);

    useEffect(() => {
        getComponentModel();
    }, [visualizerLocation]);

    rpcClient?.onProjectContentUpdated((state: boolean) => {
        if (state) {
            getComponentModel();
        }
    });

    useEffect(() => {
        setFocusedNodeId(undefined);
        setHighlightedNodeId(selectedTypeId);
    }, [selectedTypeId]);

    const getComponentModel = async () => {
        if (!rpcClient || !visualizerLocation?.metadata?.recordFilePath) {
            return;
        }
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .getTypes({ filePath: visualizerLocation?.metadata?.recordFilePath });
        setTypesModel(response.types);
        console.log(response);
    };

    const showProblemPanel = async () => {
        if (!rpcClient) {
            return;
        }
        await commonRpcClient.executeCommand({ commands: ["workbench.action.problems.focus"] });
    };

    const addNewType = async () => {
        setTypeEditorState((prevState) => ({
            ...prevState,
            isTypeCreatorOpen: true,
        }));
    };

    const handleOnGoToSource = (node: Type) => {
        if (!rpcClient || !node.codedata.lineRange) {
            return;
        }
        const targetPosition: NodePosition = {
            startLine: node.codedata.lineRange?.startLine?.line,
            startColumn: node.codedata.lineRange?.startLine?.offset,
            endLine: node.codedata.lineRange?.endLine?.line,
            endColumn: node.codedata.lineRange?.endLine?.offset,
        };

        rpcClient.getCommonRpcClient().goToSource({ position: targetPosition, fileName: node.codedata.lineRange?.fileName });
    };

    const onTypeEdit = async (typeId: string) => {
        const type = typesModel?.find((type) => type.name === typeId);
        if (!type) {
            return;
        }
        if (type?.codedata?.node === "CLASS") {
            await rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.BIServiceClassDesigner,
                    type: type,
                    projectUri: projectUri,
                    isGraphql: false
                },
            });
        }
        setTypeEditorState((prevState) => ({
            ...prevState,
            editingType: type,
            editingTypeId: typeId,
        }));
        setHighlightedNodeId(typeId);
    };

    const onTypeEditorClosed = () => {
        setTypeEditorState({
            editingTypeId: undefined,
            editingType: undefined,
            isTypeCreatorOpen: false,
            newTypeName: undefined,
        });
    };

    const onSwitchToTypeDiagram = () => {
        setFocusedNodeId(undefined);
    };

    const onFocusedNodeIdChange = (typeId: string) => {
        setFocusedNodeId(typeId);
        onTypeEditorClosed();
        setHighlightedNodeId(undefined);
    };

    const Header = () => (
        <HeaderContainer>
            {focusedNodeId ? <Title>Type : {focusedNodeId}</Title> : <Title>Types</Title>}
            {focusedNodeId ? (
                <Button appearance="primary" onClick={onSwitchToTypeDiagram} tooltip="Switch to complete Type Diagram">
                    <Codicon name="discard" sx={{ marginRight: 5 }} /> Switch to Type Diagram
                </Button>
            ) : (
                <Button appearance="primary" onClick={addNewType} tooltip="Add New Type">
                    <Codicon name="add" sx={{ marginRight: 5 }} /> Add Type
                </Button>
            )}
        </HeaderContainer>
    );

    const findSelectedType = (typeId: string): Type => {
        if (!typeId) {
            return {
                name: typeEditorState.newTypeName ?? "MyType",
                editable: true,
                metadata: {
                    label: "",
                    description: "",
                },
                codedata: {
                    node: "RECORD",
                },
                properties: {},
                members: [],
                includes: [] as string[],
                allowAdditionalFields: false
            };
        }
        return typesModel.find((type: Type) => type.name === typeId);
    };

    const onTypeChange = async (type: Type, rename?: boolean) => {
        if (rename) {
            setTypeEditorState({
                editingTypeId: type.name,
                editingType: type,
                isTypeCreatorOpen: false,
                newTypeName: undefined,
            });
            setHighlightedNodeId(type.name);
            return;
        }
        setTypeEditorState({
            editingTypeId: undefined,
            editingType: undefined,
            isTypeCreatorOpen: false,
            newTypeName: undefined,
        });
        setHighlightedNodeId(type.name); // Highlight the newly created type
    };

    // Helper function to convert TypeNodeKind to display name
    const getTypeKindDisplayName = (typeNodeKind?: TypeNodeKind): string => {
        switch (typeNodeKind) {
            case "RECORD":
                return "Record";
            case "ENUM":
                return "Enum";
            case "CLASS":
                return "Service Class";
            case "UNION":
                return "Union";
            case "ARRAY":
                return "Array";
            default:
                return "";
        }
    };

    const handleTypeCreate = (typeName?: string) => {
        setTypeEditorState((prevState) => ({
            ...prevState,
            isTypeCreatorOpen: true,
            editingTypeId: undefined,
            newTypeName: typeName,
        }));
    };

    return (
        <>
            <View>
                <TopNavigationBar />
                {!focusedNodeId && (
                    <TitleBar
                        title="Types"
                        subtitle={focusedNodeId || "View and edit types in the project"}
                        actions={
                            <Button appearance="primary" onClick={addNewType} tooltip="Add New Type">
                                <Codicon name="add" sx={{ marginRight: 5 }} /> Add Type
                            </Button>
                        }
                    />
                )}
                {focusedNodeId && (
                    <TitleBar title={focusedNodeId} subtitle="Type" onBack={() => setFocusedNodeId(undefined)} />
                )}
                <ViewContent>
                    {typesModel ? (
                        <TypeDesignDiagram
                            typeModel={typesModel}
                            selectedNodeId={highlightedNodeId}
                            focusedNodeId={focusedNodeId}
                            updateFocusedNodeId={onFocusedNodeIdChange}
                            showProblemPanel={showProblemPanel}
                            goToSource={handleOnGoToSource}
                            onTypeEdit={onTypeEdit}
                        />
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <ProgressRing color={ThemeColors.PRIMARY} />
                        </div>
                    )}
                </ViewContent>
            </View>
            {/* Panel for editing and creating types */}
            {(typeEditorState.editingTypeId || typeEditorState.isTypeCreatorOpen) && typeEditorState.editingType?.codedata?.node !== "CLASS" && (
                <PanelContainer
                    title={typeEditorState.editingTypeId ?
                        `Edit Type${getTypeKindDisplayName(typeEditorState.editingType?.codedata?.node) ?
                            ` : ${getTypeKindDisplayName(typeEditorState.editingType?.codedata?.node)}` :
                            ''}` :
                        "New Type"
                    }
                    show={true}
                    onClose={onTypeEditorClosed}
                >
                    <FormTypeEditor
                        key={typeEditorState.editingTypeId ?? typeEditorState.newTypeName ?? 'new-type'}
                        type={findSelectedType(typeEditorState.editingTypeId)}
                        newType={typeEditorState.editingTypeId ? false : true}
                        onTypeChange={onTypeChange}
                        onTypeCreate={handleTypeCreate}
                    />
                </PanelContainer>
            )}
        </>
    );
}
