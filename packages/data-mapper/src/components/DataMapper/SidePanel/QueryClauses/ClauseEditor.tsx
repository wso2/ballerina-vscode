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

import React, { useEffect, useMemo, useState } from "react";
import { EditorContainer, ProgressRingWrapper } from "./styles";
import { Divider, Dropdown, OptionProps, ProgressRing, Typography } from "@wso2/ui-toolkit";
import { DMFormProps, DMFormField, DMFormFieldValues, IntermediateClauseType, IntermediateClause, IntermediateClauseProps, LinePosition } from "@wso2/ballerina-core";
import { useDMQueryClausesStore } from "../../../../store/store";
import { useQuery } from "@tanstack/react-query";

export interface ClauseEditorProps {
    index: number;
    targetField: string;
    clause?: IntermediateClause;
    onSubmitText?: string;
    isSaving: boolean;
    onSubmit: (clause: IntermediateClause) => void;
    onCancel: () => void;
    getClausePosition: (targetField: string, index: number) => Promise<LinePosition>;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export const clauseTypeLabels: Record<IntermediateClauseType, string> = {
    [IntermediateClauseType.WHERE]: "Condition",
    [IntermediateClauseType.LET]: "Local variable",
    [IntermediateClauseType.ORDER_BY]: "Sort by",
    [IntermediateClauseType.LIMIT]: "Limit",
    [IntermediateClauseType.FROM]: "From",
    [IntermediateClauseType.JOIN]: "Join",
    [IntermediateClauseType.GROUP_BY]: "Group by"
};

export function ClauseEditor(props: ClauseEditorProps) {
    const { index, targetField, clause, onSubmitText, isSaving, onSubmit, onCancel, getClausePosition, generateForm } = props;
    const { clauseToAdd, setClauseToAdd, clauseTypes, setClauseTypes } = useDMQueryClausesStore();
    const { type: initialClauseType, properties: clauseProps } = clause ?? clauseToAdd ?? {};

    const [clauseType, setClauseType] = useState<string>(initialClauseType ?? IntermediateClauseType.WHERE);

    useEffect(() => {
        if (initialClauseType) {
            setClauseType(initialClauseType);
        }
    }, [initialClauseType]);
    
    const clauseTypeItems = useMemo(() => {
        const types = clauseTypes ?? Object.values(IntermediateClauseType);
        return types.map((type) => ({ content: clauseTypeLabels[type], value: type }));
    }, [clauseTypes]);

    const nameField: DMFormField = {
        key: "name",
        label: clauseType === IntermediateClauseType.JOIN ? "Item Alias" : "Name",
        type: "IDENTIFIER",
        optional: false,
        editable: true,
        documentation: clauseType === IntermediateClauseType.JOIN ? "Represents each record in the joined collection" : "Enter a name for the variable",
        value: clauseProps?.name ?? "",
        types: [{ fieldType: "IDENTIFIER", scope: "Local", selected: false }],
        enabled: true,
    }

    const typeField: DMFormField = {
        key: "type",
        label: "Type",
        type: "TYPE",
        optional: true,
        editable: true,
        documentation: "Enter the type of the clause",
        value: clauseProps?.type ?? "",
        types: [{ fieldType: "TYPE", selected: false }],
        enabled: true,
    }

    const expressionField: DMFormField = {
        key: "expression",
        label: clauseType === IntermediateClauseType.JOIN ? "Join With Collection" :
            clauseType === IntermediateClauseType.GROUP_BY ? "Grouping Key" :
                "Expression",
        type: "CLAUSE_EXPRESSION",
        optional: false,
        editable: true,
        documentation: clauseType === IntermediateClauseType.JOIN ? "Collection to be joined" :
            clauseType === IntermediateClauseType.GROUP_BY ? "Enter the grouping key expression" :
                "Enter the expression of the clause",
        value: clauseProps?.expression ?? "",
        types: [{ fieldType: "CLAUSE_EXPRESSION", selected: false }],
        enabled: true,
    }

    const orderField: DMFormField = {
        key: "order",
        label: "Order",
        type: "ENUM",
        optional: false,
        editable: true,
        documentation: "Enter the order",
        value: clauseProps?.order ?? "",
        types: [{ fieldType: "ENUM", selected: false }],
        enabled: true,
        items: ["ascending", "descending"]
    }

    const lhsExpressionField: DMFormField = {
        key: "lhsExpression",
        label: "LHS Expression",
        type: "CLAUSE_EXPRESSION",
        optional: false,
        editable: true,
        documentation: "Enter the LHS expression of join-on condition",
        value: clauseProps?.lhsExpression ?? "",
        types: [{ fieldType: "CLAUSE_EXPRESSION", selected: false }],
        enabled: true,
    }

    const rhsExpressionField: DMFormField = {
        key: "rhsExpression",
        label: "RHS Expression",
        type: "DM_JOIN_CLAUSE_RHS_EXPRESSION",
        optional: false,
        editable: true,
        documentation: "Enter the RHS expression of join-on condition",
        value: clauseProps?.rhsExpression ?? "",
        types: [{ fieldType: "DM_JOIN_CLAUSE_RHS_EXPRESSION", selected: false }],
        enabled: true,
    }

    const handleSubmit = (data: DMFormFieldValues) => {
        setClauseToAdd(undefined);
        setClauseTypes(undefined);
        const clause: IntermediateClause = {
            type: clauseType as IntermediateClauseType,
            properties: data as IntermediateClauseProps
        };
        onSubmit(clause);
    }

    const handleCancel = () => {
        setClauseToAdd(undefined);
        setClauseTypes(undefined);
        onCancel();
    }

    // function with select case to gen fields based on clause type
    const generateFields = () => {
        switch (clauseType) {
            case IntermediateClauseType.LET:
                return [nameField, typeField, expressionField];
            case IntermediateClauseType.FROM:
                return [expressionField, nameField];
            case IntermediateClauseType.ORDER_BY:
                return [expressionField, orderField];
            case IntermediateClauseType.JOIN:
                return [expressionField, nameField, lhsExpressionField, rhsExpressionField];
            case IntermediateClauseType.GROUP_BY:
                return [expressionField];
            default:
                return [expressionField];
        }
    }

    const {
        data: clausePosition,
        isFetching: isFetchingTargetLineRange
    } = useQuery({
        queryKey: ['getClausePosition', targetField, index],
        queryFn: async () => await getClausePosition(targetField, index),
        networkMode: 'always'
    });

    const formProps: DMFormProps = {
        targetLineRange: { startLine: clausePosition, endLine: clausePosition },
        fields: generateFields(),
        submitText: onSubmitText || "Add",
        cancelText: "Cancel",
        nestedForm: true,
        onSubmit: handleSubmit,
        onCancel: handleCancel,
        isSaving
    }

    return (
        <EditorContainer>
            <Typography variant="h4">Clause Configuration</Typography>
            <Divider />

            <Dropdown
                id="clause-type-selector"
                sx={{ zIndex: 2, width: 172 }}
                containerSx={{ padding: "0px 12px 0px 12px" }}
                isRequired
                items={clauseTypeItems}
                label="Clause Type"
                onValueChange={setClauseType}
                value={clauseType}
            />

            {isFetchingTargetLineRange ?
                <ProgressRingWrapper>
                    <ProgressRing sx={{ height: "20px", width: "20px" }} />
                </ProgressRingWrapper> :
                generateForm(formProps)
            }

        </EditorContainer >
    );
}
