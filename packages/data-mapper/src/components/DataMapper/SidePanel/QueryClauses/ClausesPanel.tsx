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

import React, { useEffect } from "react";

import { Button, Codicon, SidePanel, SidePanelBody, SidePanelTitleContainer, ThemeColors } from "@wso2/ui-toolkit";
import { useDMQueryClausesPanelStore } from "../../../../store/store";
import { AddButton, ClauseItem } from "./ClauseItem";
import { ClauseEditor } from "./ClauseEditor";
import { ClauseItemListContainer } from "./styles";
import { DMFormProps, IntermediateClause, Property, Query } from "@wso2/ballerina-core";

export interface ClausesPanelProps {
    query: Query;
    targetField: string;
    addClauses: (clause: IntermediateClause, targetField: string, isNew: boolean, index:number) => Promise<void>;
    deleteClause: (targetField: string, index: number) => Promise<void>;
    getClauseProperty: (targetField: string, index: number) => Promise<Property>;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export function ClausesPanel(props: ClausesPanelProps) {
    const { isQueryClausesPanelOpen, setIsQueryClausesPanelOpen } = useDMQueryClausesPanelStore();
    const { clauseToAdd, setClauseToAdd } = useDMQueryClausesPanelStore.getState();
    const { query, targetField, addClauses, deleteClause, getClauseProperty, generateForm } = props;

    const [adding, setAdding] = React.useState<number>();
    const [editing, setEditing] = React.useState<number>();
    const [deleting, setDeleting] = React.useState<number>();
    const [saving, setSaving] = React.useState<number>();

    const clauses = query?.intermediateClauses || [];

    const setClauses = async (clause: IntermediateClause, isNew: boolean, index: number) => {
        setSaving(index);
        await addClauses(clause, targetField, isNew, index);
        setSaving(undefined);
    }

    const onAdd = async (clause: IntermediateClause, index: number = -1) => {
        await setClauses(clause, true, index);
        setAdding(undefined);
    }

    const onDelete = async (index: number) => {
        setDeleting(index);
        await deleteClause(targetField, index);
        setDeleting(undefined);
    }

    const onEdit = async (clause: IntermediateClause, index: number) => {
        clauses[index] = clause;
        await setClauses(clause, false, index);
        setEditing(undefined);
    }

    useEffect(() => {
        if (clauseToAdd) {
            setAdding(clauses.length - 1);
        }
        return () => {
            setClauseToAdd(undefined);
        }
    }, [clauseToAdd, clauses.length, setClauseToAdd, setAdding]);

    return (
        <SidePanel
            isOpen={isQueryClausesPanelOpen}
            alignment="right"
            width={400}
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

                {adding === -1 ? (
                    <ClauseEditor
                        index={0}
                        targetField={targetField}
                        isSaving={saving === -1}
                        onCancel={() => setAdding(undefined)}
                        onSubmit={onAdd}
                        getClauseProperty={getClauseProperty}
                        generateForm={generateForm}
                    />
                ) : (
                    <AddButton onClick={() => setAdding(-1)} />
                )}

                <ClauseItemListContainer>
                    {clauses.map((clause, index) => (
                        <ClauseItem
                            key={index}
                            index={index}
                            targetField={targetField}
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
                            getClauseProperty={getClauseProperty}
                            generateForm={generateForm} />
                    ))}
                </ClauseItemListContainer>

            </SidePanelBody>
        </SidePanel>
    );
}
