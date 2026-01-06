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
import { useDMQueryClausesStore } from "../../../../store/store";
import { AddButton, ClauseItem } from "./ClauseItem";
import { ClauseEditor } from "./ClauseEditor";
import { ClauseItemListContainer } from "./styles";
import { DMFormProps, IntermediateClause, IntermediateClauseType, LinePosition, Query } from "@wso2/ballerina-core";

export const descriptions = {
    [IntermediateClauseType.JOIN]: "Add join clause to connect arrays",
    [IntermediateClauseType.FROM]: "Add from clause to connect arrays"
}

export interface ClauseFormProps {
    query: Query;
    targetField: string;
    addClauses: (clause: IntermediateClause, targetField: string, isNew: boolean, index:number) => Promise<void>;
    getClausePosition: (targetField: string, index: number) => Promise<LinePosition>;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export function ClauseForm(props: ClauseFormProps) {
    const { isQueryClauseFormOpen, setIsQueryClauseFormOpen, clauseToAdd, setClauseToAdd, setClauseTypes } = useDMQueryClausesStore();
    const { query, targetField, addClauses, getClausePosition, generateForm} = props;

    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    const clauses = query?.intermediateClauses || [];

    const fillDefaults = async (clause: IntermediateClause) => {
        const clauseType = clause.type;
        if (clauseType === IntermediateClauseType.JOIN) {
            clause.properties.type = "var";
            clause.properties.isOuter = false;
        } else if (clauseType === IntermediateClauseType.FROM) {
            clause.properties.type = "var";
        }
    };

    const setClauses = async (clause: IntermediateClause, index: number = -1) => {
        setIsSaving(true);
        await fillDefaults(clause);
        await addClauses(clause, targetField, true, index);
        setIsSaving(false);
    }
    
    useEffect(() => {
        if (clauseToAdd) {
            setClauseTypes([clauseToAdd.type]);
        }
        return () => {
            setClauseToAdd(undefined);
            setClauseTypes(undefined);
        }
    }, [clauseToAdd]); 

    return (
        <SidePanel
            isOpen={isQueryClauseFormOpen}
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
                <span>Connect Arrays</span>
                <Button
                    sx={{ marginLeft: "auto" }}
                    onClick={() => setIsQueryClauseFormOpen(false)}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <span>{descriptions[clauseToAdd?.type as keyof typeof descriptions] ?? ""}</span>

                <ClauseEditor
                    index={clauses.length}
                    targetField={targetField}
                    isSaving={isSaving}
                    onCancel={() => setIsQueryClauseFormOpen(false)}
                    onSubmit={setClauses}
                    getClausePosition={getClausePosition}
                    generateForm={generateForm}
                />

            </SidePanelBody>
        </SidePanel>
    );
}
