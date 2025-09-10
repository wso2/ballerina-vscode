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

import { Button, Codicon, SidePanel, SidePanelBody, SidePanelTitleContainer, ThemeColors } from "@wso2/ui-toolkit";
import { useDMQueryClausesPanelStore } from "../../../../store/store";
import { AddButton, ClauseItem } from "./ClauseItem";
import { ClauseEditor } from "./ClauseEditor";
import { ClauseItemListContainer } from "./styles";
import { DMFormProps, IntermediateClause, Query } from "@wso2/ballerina-core";

export interface ClausesPanelProps {
    query: Query;
    targetField: string;
    addClauses: (clause: IntermediateClause, targetField: string, isNew: boolean, index?:number) => Promise<void>;
    deleteClause: (targetField: string, index: number) => Promise<void>;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export function ClausesPanel(props: ClausesPanelProps) {
    const { isQueryClausesPanelOpen, setIsQueryClausesPanelOpen } = useDMQueryClausesPanelStore();
    const { query, targetField, addClauses, deleteClause, generateForm } = props;

    const [adding, setAdding] = React.useState<number>(-1);
    const [editing, setEditing] = React.useState<number>(-1);
    const [deleting, setDeleting] = React.useState<number>(-1);
    const [saving, setSaving] = React.useState<number>(-1);

    const clauses = query?.intermediateClauses || [];

    const setClauses = async (clause: IntermediateClause, isNew: boolean, index?: number) => {
        setSaving(index);
        await addClauses(clause, targetField, isNew, index);
        setSaving(-1);
    }

    const onAdd = async (clause: IntermediateClause, index?: number) => {
        await setClauses(clause, true, index);
        setAdding(-1);
    }

    const onDelete = async (index: number) => {
        setDeleting(index);
        await deleteClause(targetField, index);
        setDeleting(-1);
    }

    const onEdit = async (clause: IntermediateClause, index: number) => {
        await setClauses(clause, false, index);
        setEditing(-1);
    }

    return (
        <SidePanel
            isOpen={isQueryClausesPanelOpen}
            alignment="right"
            width={312}
            overlay={false}
            sx={{
                fontFamily: "GilmerRegular",
                backgroundColor: ThemeColors.SURFACE_DIM,
                boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
            }}
        >
            <SidePanelTitleContainer>
                <span>Query Filters</span>
                <Button
                    sx={{ marginLeft: "auto" }}
                    onClick={() => setIsQueryClausesPanelOpen(false)}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <span>Add filters or local variables to the query expression</span>

                <ClauseItemListContainer>
                    {clauses.map((clause, index) => (
                        <ClauseItem
                            key={index}
                            index={index}
                            clause={clause}
                            isSaving={index === saving}
                            isAdding={index === adding}
                            isEditing={index === editing}
                            isDeleting={index === deleting}
                            setAdding={setAdding}
                            setEditing={setEditing}
                            onAdd={onAdd}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            generateForm={generateForm} />
                    ))}
                </ClauseItemListContainer>

                {(adding === clauses.length) ? (
                    <ClauseEditor
                        isSaving={saving === undefined}
                        onCancel={() => setAdding(-1)}
                        onSubmit={onAdd}
                        generateForm={generateForm}
                    />
                ) : (
                    <AddButton onClick={() => setAdding(clauses.length)} />
                )}
            </SidePanelBody>
        </SidePanel>
    );
}
