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

import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { PayloadContext, Type } from '@wso2/ballerina-core';
import { EditorContext, StackItem } from '@wso2/type-editor';
import DynamicModal from '../Modal';
import { FormTypeEditor } from '../../views/BI/TypeEditor';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { ProgressRing } from '@wso2/ui-toolkit';
import { URI, Utils } from 'vscode-uri';

const BreadcrumbContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const BreadcrumbItem = styled.span`
    font-weight: 500;
`;

const BreadcrumbSeparator = styled.span`
    color: var(--vscode-descriptionForeground);
    opacity: 0.6;
`;

interface TypeEditorState {
    isOpen: boolean;
    newTypeValue?: string;
}

interface ContextBasedFormTypeEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onTypeCreate: (type: Type | string) => void;
    initialTypeName?: string;
    isGraphql?: boolean;
    modalTitle?: string;
    modalWidth?: number;
    modalHeight?: number;
    payloadContext?: PayloadContext;
    editMode?: boolean; // If true, load existing type for editing instead of creating new
}

export const ContextBasedFormTypeEditor: React.FC<ContextBasedFormTypeEditorProps> = (props) => {
    const {
        isOpen,
        onClose,
        onTypeCreate,
        initialTypeName = "",
        isGraphql = false,
        modalTitle = "Create New Type",
        modalWidth = 650,
        modalHeight = 600,
        payloadContext,
        editMode = false
    } = props;

    const { rpcClient } = useRpcContext();
    const [typeEditorState, setTypeEditorState] = useState<TypeEditorState>({ isOpen: false, newTypeValue: "" });
    const [refetchStates, setRefetchStates] = useState<boolean[]>([false]);
    const [loadingType, setLoadingType] = useState<boolean>(false);
    const [existingType, setExistingType] = useState<Type | null>(null);
    const [simpleType, setSimpleType] = useState<string>(undefined);

    // Stack for recursive type creation
    const [stack, setStack] = useState<StackItem[]>([{
        isDirty: false,
        type: undefined
    }]);

    const defaultType = (typeName?: string): Type => {
        const typesname = typeName ? typeName : simpleType ? "MyType" : typeEditorState.newTypeValue || initialTypeName || "MyType";

        if (!isGraphql) {
            return {
                name: typesname,
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
        return {
            name: typeEditorState.newTypeValue || initialTypeName || "MyType",
            editable: true,
            metadata: {
                label: "",
                description: ""
            },
            codedata: {
                node: "CLASS"
            },
            properties: {},
            members: [],
            includes: [] as string[],
            functions: []
        };
    };

    const pushTypeStack = (item: StackItem) => {
        setStack((prev) => [...prev, item]);
        setRefetchStates((prev) => [...prev, false]);
    };

    const resetStack = (isSimpleType?: boolean) => {
        const newDefault = defaultType(isSimpleType ? "MyType" : undefined);

        setStack([{
            type: newDefault,
            isDirty: false
        }]);
    };

    const popTypeStack = () => {
        setStack((prev) => {
            const newStack = prev.slice(0, -1);
            if (newStack.length === 0) {
                return [{
                    isDirty: false,
                    type: undefined
                }];
            }
            return newStack;
        });
        setRefetchStates((prev) => {
            const newStates = [...prev];
            const currentState = newStates.pop();
            if (currentState && newStates.length > 0) {
                newStates[newStates.length - 1] = true;
            }
            if (newStates.length === 0) {
                newStates.push(false);
            }
            return newStates;
        });
    };

    const peekTypeStack = (): StackItem | null => {
        return stack.length > 0 ? stack[stack.length - 1] : null;
    };

    const replaceTop = (item: StackItem) => {
        if (stack.length === 0) return;
        setStack((prev) => {
            const newStack = [...prev];
            newStack[newStack.length - 1] = item;
            return newStack;
        });
    };

    const setRefetchForCurrentModal = (shouldRefetch: boolean) => {
        setRefetchStates((prev) => {
            const newStates = [...prev];
            if (newStates.length > 0) {
                newStates[newStates.length - 1] = shouldRefetch;
            }
            return newStates;
        });
    };

    useEffect(() => {
        if (isOpen) {
            setTypeEditorState({ isOpen: true, newTypeValue: initialTypeName });
            setSimpleType(undefined); // Reset simpleType on open

            // If in edit mode, fetch the existing type
            if (editMode && initialTypeName) {
                fetchExistingType(initialTypeName);
            } else {
                resetStack();
                setExistingType(null);
            }
        } else {
            setTypeEditorState({ isOpen: false, newTypeValue: "" });
            setExistingType(null);
            setSimpleType(undefined); // Reset simpleType on close
        }
    }, [isOpen, initialTypeName, editMode]);

    const fetchExistingType = async (typeName: string) => {
        setLoadingType(true);
        try {
            // Get the project path and construct the types.bal file path
            const projectPath = await rpcClient.getVisualizerLocation().then((res) => res.projectPath);
            const filePath = Utils.joinPath(URI.file(projectPath), 'types.bal').fsPath;

            // Fetch all types from the file
            const typesResponse = await rpcClient.getBIDiagramRpcClient().getTypes({
                filePath: filePath
            });

            console.log("typesResponse", typesResponse);

            // Find the specific type by name
            const foundType = typesResponse.types.find((type: Type) => type.name === typeName);

            if (foundType) {
                setExistingType(foundType);
                // Update stack with the existing type
                setStack([{
                    type: foundType,
                    isDirty: false
                }]);
            } else {
                // If type not found, it's a simple type - reset to create new
                console.warn(`Type "${typeName}" not found in ${filePath}, treating as simple type`);
                setSimpleType(typeName);
                resetStack(true); // Pass true to indicate it's a simple type
            }
        } catch (error) {
            console.error('Error fetching existing type:', error);
            resetStack();
        } finally {
            setLoadingType(false);
        }
    };

    useEffect(() => {
        // Only update stack with default type if not in edit mode
        if (!editMode) {
            const tempStack = [...stack];
            const firstItem = tempStack[0];
            if (firstItem && !existingType) {
                firstItem.type = defaultType();
                tempStack[0] = firstItem;
                setStack(tempStack);
            }
        }
    }, [typeEditorState.newTypeValue, editMode, existingType]);

    const handleTypeChange = async (type: Type) => {
        setTypeEditorState({ ...typeEditorState, isOpen: true });
    };

    const handleTypeEditorStateChange = (state: boolean) => {
        if (!state) {
            if (stack.length > 1) {
                popTypeStack();
                return;
            }
            resetStack();
            onClose();
        }
        setTypeEditorState({ ...typeEditorState, isOpen: state });
    };

    const getNewTypeCreateForm = () => {
        pushTypeStack({
            type: defaultType("NewType"),
            isDirty: false
        });
    };

    const onSaveType = (type: Type | string) => {
        if (stack.length > 0) {
            setRefetchForCurrentModal(true);
            popTypeStack();
        }

        // If this is the last item in stack, call onTypeCreate and close
        if (stack.length === 1) {
            onTypeCreate(type);
            setTypeEditorState({ ...typeEditorState, isOpen: false });
        } else {
            setTypeEditorState({ ...typeEditorState, isOpen: stack.length !== 1 });
        }
    };

    return (
        <EditorContext.Provider value={{ stack, push: pushTypeStack, pop: popTypeStack, peek: peekTypeStack, replaceTop: replaceTop }}>
            {stack.map((item, i) => (
                <DynamicModal
                    key={i}
                    width={modalWidth}
                    height={modalHeight}
                    anchorRef={undefined}
                    title={modalTitle}
                    openState={typeEditorState.isOpen}
                    setOpenState={handleTypeEditorStateChange}
                >
                    <div style={{ maxHeight: '525px', overflow: 'hidden' }}>
                        {loadingType && editMode && i === 0 ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                                <ProgressRing />
                            </div>
                        ) : (
                            <>
                                {stack.slice(0, i + 1).length > 1 && (
                                    <BreadcrumbContainer>
                                        {stack.slice(0, i + 1).map((stackItem, index) => (
                                            <React.Fragment key={index}>
                                                {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
                                                <BreadcrumbItem>
                                                    {stackItem?.type?.name || "NewType"}
                                                </BreadcrumbItem>
                                            </React.Fragment>
                                        ))}
                                    </BreadcrumbContainer>
                                )}
                                <FormTypeEditor
                                    type={
                                        editMode && i === 0 && existingType ?
                                            existingType :
                                            (peekTypeStack() && peekTypeStack().type ? peekTypeStack().type : defaultType())
                                    }
                                    newType={!editMode && i === 0 ? true : (peekTypeStack() ? peekTypeStack().isDirty : false)}
                                    newTypeValue={typeEditorState.newTypeValue}
                                    isPopupTypeForm={true}
                                    isGraphql={isGraphql}
                                    onTypeChange={handleTypeChange}
                                    onSaveType={onSaveType}
                                    onTypeCreate={() => { }}
                                    getNewTypeCreateForm={getNewTypeCreateForm}
                                    refetchTypes={refetchStates[i]}
                                    isContextTypeForm={i === 0}
                                    payloadContext={payloadContext}
                                    simpleType={simpleType}
                                />
                            </>
                        )}
                    </div>
                </DynamicModal>
            ))}
        </EditorContext.Provider>
    );
};

