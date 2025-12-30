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
import {
    HeaderLabel,
    ContentWrapper,
    IconTextWrapper,
    TypeWrapper,
    IconWrapper,
    ValueTextWrapper,
    ActionWrapper,
    ActionIconWrapper,
    EditIconWrapper,
    DeleteIconWrapper,
    AddIconContainer,
    AddIcon,
    ProgressRingWrapper
} from "./styles";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";
import {  ClauseEditor, clauseTypeLabels } from "./ClauseEditor";
import { DMFormProps, IntermediateClause, IntermediateClauseType, LinePosition } from "@wso2/ballerina-core";

export interface ClauseItemProps {
    index: number;
    targetField: string;
    clause: IntermediateClause;
    isSaving: boolean;
    isAdding: boolean;
    isEditing: boolean;
    isDeleting: boolean;
    setAdding: (index: number) => void;
    setEditing: (index: number) => void;
    onAdd: (clause: IntermediateClause, index?: number) => void;
    onEdit: (clause: IntermediateClause, index: number) => void;
    onDelete: (index: number) => void;
    getClausePosition: (targetField: string, index: number) => Promise<LinePosition>;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export function ClauseItem(props: ClauseItemProps) {
    const { index, targetField, clause, isSaving, isAdding, isEditing, isDeleting, setAdding, setEditing, onDelete, onEdit, onAdd, getClausePosition, generateForm } = props;
    const { type: clauseType, properties: clauseProps } = clause;


    const onHandleEdit = (clause: IntermediateClause) => {
        onEdit(clause, index);
    }

    const onHandleDelete = () => {
        onDelete(index);
    }

    const onHandleAdd = (clause: IntermediateClause) => {
        onAdd(clause, index);
    }

    const clauseTypeLabel = clauseTypeLabels[clauseType];

    const expressionLabel = 
        clauseType === IntermediateClauseType.LET ? `${clauseProps.type} ${clauseProps.name} = ${clauseProps.expression}` : 
        clauseType === IntermediateClauseType.ORDER_BY ? `${clauseProps.expression} ${clauseProps.order}` :
        clauseProps.expression;
    
    return (
        <>
            <HeaderLabel data-testid={`${index}-${clauseType}-item`}>
                <ContentWrapper onClick={() => setEditing(index)}>
                    <IconTextWrapper>
                        <IconWrapper> <Codicon name="filter-filled" /> </IconWrapper>
                        <TypeWrapper title={clauseTypeLabel}> {clauseTypeLabel} </TypeWrapper>
                    </IconTextWrapper>
                    <ValueTextWrapper title={expressionLabel}> {expressionLabel} </ValueTextWrapper>
                </ContentWrapper>
                <ActionWrapper>
                    <ActionIconWrapper>
                        <EditIconWrapper>
                            <Codicon name="edit" onClick={() => setEditing(index)} />
                        </EditIconWrapper>
                        {isDeleting ? (
                            <ProgressRingWrapper>
                                <ProgressRing sx={{height: "20px", width: "20px"}}/>
                            </ProgressRingWrapper>
                        ) : (
                            <DeleteIconWrapper>
                                <Codicon name="trash" onClick={onHandleDelete} />
                            </DeleteIconWrapper>
                        )}
                    </ActionIconWrapper>
                </ActionWrapper>
            </HeaderLabel>

            {isEditing && (
                <ClauseEditor
                    index={index}
                    targetField={targetField}
                    clause={clause}
                    onSubmitText="Update"
                    isSaving={isSaving}
                    onSubmit={onHandleEdit}
                    onCancel={() => setEditing(undefined)}
                    getClausePosition={getClausePosition}
                    generateForm={generateForm}
                />
            )}

            {isAdding ? (
                <ClauseEditor
                    index={index + 1}
                    targetField={targetField}
                    isSaving={isSaving}
                    onCancel={() => setAdding(undefined)}
                    onSubmit={onHandleAdd}
                    getClausePosition={getClausePosition}
                    generateForm={generateForm} />
            ) : (
                <AddButton onClick={() => setAdding(index)} />
            )}
        </>
    );
}

export function AddButton(props: { onClick: () => void }) {
    return (
        <AddIconContainer>
            <Button
                appearance="icon"
                onClick={props.onClick}
            >
                <AddIcon name="add-circle-outline"/>
            </Button>
        </AddIconContainer>
    )
}
