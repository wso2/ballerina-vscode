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
import { EditorContainer } from "./styles";
import { Divider, Dropdown, OptionProps, Typography } from "@wso2/ui-toolkit";
import { DMFormProps, DMFormField, DMFormFieldValues, IntermediateClauseType, IntermediateClause, IntermediateClauseProps } from "@wso2/ballerina-core";
import { useDMQueryClausesPanelStore } from "../../../../store/store";

export interface ClauseEditorProps {
    clause?: IntermediateClause;
    onSubmitText?: string;
    isSaving: boolean;
    onSubmit: (clause: IntermediateClause) => void;
    onCancel: () => void;
    generateForm: (formProps: DMFormProps) => JSX.Element;
}

export function ClauseEditor(props: ClauseEditorProps) {
    const { clause, onSubmitText, isSaving, onSubmit, onCancel, generateForm } = props;
    const { clauseToAdd, setClauseToAdd } = useDMQueryClausesPanelStore.getState();
    const { type: _clauseType, properties: clauseProps } = clause ?? clauseToAdd ?? {};

    const [clauseType, setClauseType] = React.useState<string>(_clauseType ?? IntermediateClauseType.WHERE);
    const clauseTypeItems: OptionProps[] = [
        { content: "Condition", value: IntermediateClauseType.WHERE },
        { content: "Local variable", value: IntermediateClauseType.LET },
        { content: "Sort by", value: IntermediateClauseType.ORDER_BY },
        { content: "Limit", value: IntermediateClauseType.LIMIT },
        { content: "From", value: IntermediateClauseType.FROM },
        { content: "Join", value: IntermediateClauseType.JOIN },
        { content: "Group by", value: IntermediateClauseType.GROUP_BY }
    ]

    const nameField: DMFormField = {
        key: "name",
        label: clauseType === IntermediateClauseType.JOIN ? "Item Alias" : "Name",
        type: "IDENTIFIER",
        optional: false,
        editable: true,
        documentation: clauseType === IntermediateClauseType.JOIN ? "Represents each record in the joined collection" : "Enter the name for variable",
        value: clauseProps?.name ?? "",
        valueTypeConstraint: "Global",
        enabled: true,
    }

    const typeField: DMFormField = {
        key: "type",
        label: "Type",
        type: "TYPE",
        optional: false,
        editable: true,
        documentation: "Enter the type of the clause",
        value: clauseProps?.type ?? "",
        valueTypeConstraint: "Global",
        enabled: true,
    }

    const expressionField: DMFormField = {
        key: "expression",
        label: clauseType === IntermediateClauseType.JOIN ? "Join With Collection" : "Expression",
        type: "EXPRESSION",
        optional: false,
        editable: true,
        documentation: clauseType === IntermediateClauseType.JOIN ? "Collection to be joined" : "Enter the expression of the clause",
        value: clauseProps?.expression ?? "",
        valueTypeConstraint: "Global",
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
        valueTypeConstraint: "Global",
        enabled: true,
        items: ["ascending", "descending"]
    }

    const lhsExpressionField: DMFormField = {
        key: "lhsExpression",
        label: "LHS Expression",
        type: "EXPRESSION",
        optional: false,
        editable: true,
        documentation: "Enter the LHS expression of join-on condition",
        value: clauseProps?.lhsExpression ?? "",
        valueTypeConstraint: "Global",
        enabled: true,
    }

    const rhsExpressionField: DMFormField = {
        key: "rhsExpression",
        label: "RHS Expression",
        type: "EXPRESSION",
        optional: false,
        editable: true,
        documentation: "Enter the RHS expression of join-on condition",
        value: clauseProps?.rhsExpression ?? "",
        valueTypeConstraint: "Global",
        enabled: true,
    }

    const handleSubmit = (data: DMFormFieldValues) => {
        setClauseToAdd(undefined);
        const clause: IntermediateClause = {
            type: clauseType as IntermediateClauseType,
            properties: data as IntermediateClauseProps
        };
        if (clauseType === IntermediateClauseType.JOIN) {
            clause.properties.type = "var";
            clause.properties.isOuter = false;
        } else if (clauseType === IntermediateClauseType.GROUP_BY) {
            clause.properties.type = "var";
        }
        onSubmit(clause);
    }

    const handleCancel = () => {
        setClauseToAdd(undefined);
        onCancel();
    }

    // function with select case to gen fields based on clause type
    const generateFields = () => {
        switch (clauseType) {
            case IntermediateClauseType.LET:
            case IntermediateClauseType.FROM:
                return [nameField, typeField, expressionField];
            case IntermediateClauseType.ORDER_BY:
                return [expressionField, orderField];
            case IntermediateClauseType.JOIN:
                return [expressionField, nameField, lhsExpressionField, rhsExpressionField];
            case IntermediateClauseType.GROUP_BY:
                return [nameField, expressionField];
            default:
                return [expressionField];
        }
    }

    const formProps: DMFormProps = {
        targetLineRange:{ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } },
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

            {generateForm(formProps)}
            
        </EditorContainer >
    );
}
