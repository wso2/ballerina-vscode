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
import { Type } from '@wso2/ballerina-core';
import { EditorContext, StackItem } from '@wso2/type-editor';
import DynamicModal from '../Modal';
import { FormTypeEditor } from '../../views/BI/TypeEditor';

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
    onTypeCreate: (type: Type) => void;
    initialTypeName?: string;
    isGraphql?: boolean;
    modalTitle?: string;
    modalWidth?: number;
    modalHeight?: number;
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
        modalHeight = 600
    } = props;

    const [typeEditorState, setTypeEditorState] = useState<TypeEditorState>({ isOpen: false, newTypeValue: "" });
    const [refetchStates, setRefetchStates] = useState<boolean[]>([false]);
    
    // Stack for recursive type creation
    const [stack, setStack] = useState<StackItem[]>([{
        isDirty: false,
        type: undefined
    }]);

    const defaultType = (): Type => {
        if (!isGraphql) {
            return {
                name: typeEditorState.newTypeValue || initialTypeName || "MyType",
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

    const resetStack = () => {
        setStack([{
            type: defaultType(),
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
            resetStack();
        } else {
            setTypeEditorState({ isOpen: false, newTypeValue: "" });
        }
    }, [isOpen, initialTypeName]);

    useEffect(() => {
        const tempStack = [...stack];
        const firstItem = tempStack[0];
        if (firstItem) {
            firstItem.type = defaultType();
            tempStack[0] = firstItem;
            setStack(tempStack);
        }
    }, [typeEditorState.newTypeValue]);

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
            type: defaultType(),
            isDirty: false
        });
    };

    const onSaveType = (type: Type) => {
        if (stack.length > 0) {
            setRefetchForCurrentModal(true);
            popTypeStack();
        }
        
        // If this is the last item in stack, call onTypeCreate and close
        if (stack.length === 1) {
            onTypeCreate(type);
            setTypeEditorState({ ...typeEditorState, isOpen: false });
            onClose();
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
                    <div style={{ padding: '0px 20px' }}>
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
                            type={peekTypeStack() && peekTypeStack().type ? peekTypeStack().type : defaultType()}
                            newType={peekTypeStack() ? peekTypeStack().isDirty : false}
                            newTypeValue={typeEditorState.newTypeValue}
                            isPopupTypeForm={true}
                            isGraphql={isGraphql}
                            onTypeChange={handleTypeChange}
                            onSaveType={onSaveType}
                            onTypeCreate={() => { }}
                            getNewTypeCreateForm={getNewTypeCreateForm}
                            refetchTypes={refetchStates[i]}
                            isContextTypeForm={true}
                        />
                    </div>
                </DynamicModal>
            ))}
        </EditorContext.Provider>
    );
};

