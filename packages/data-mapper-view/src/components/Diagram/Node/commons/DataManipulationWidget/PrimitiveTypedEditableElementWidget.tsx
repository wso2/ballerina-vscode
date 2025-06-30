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
// tslint:disable: jsx-no-multiline-js
import React, { useEffect, useMemo, useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import { TruncatedLabel } from "@wso2/ui-toolkit";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from "../../../Port";
import {
    getDefaultValue,
    getFieldLabel,
    getFieldName,
    getInnermostExpressionBody
} from "../../../utils/dm-utils";
import { OutputSearchHighlight } from "../Search";

import { ValueConfigMenu, ValueConfigOption } from "./ValueConfigButton";
import { useIONodesStyles } from "../../../../styles";

export interface PrimitiveTypedEditableElementWidgetProps {
    parentId: string;
    field: EditableRecordField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    deleteField?: (node: STNode) => Promise<void>;
    isArrayElement?: boolean;
    hasHoveredParent?: boolean;
}

export function PrimitiveTypedEditableElementWidget(props: PrimitiveTypedEditableElementWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        deleteField,
        isArrayElement,
        hasHoveredParent
    } = props;
    const classes = useIONodesStyles();

    const fieldName = getFieldName(field);
    const typeName = field.type.typeName;
    let fieldId = parentId;
    if (fieldIndex !== undefined) {
        fieldId = fieldName !== ''
            ? `${parentId}.${fieldIndex}.${fieldName}`
            : `${parentId}.${fieldIndex}`;
    } else if (fieldName) {
        fieldId = `${parentId}.${typeName}.${fieldName}`;
    } else {
        fieldId = `${parentId}.${typeName}`;
    }
    const portIn = getPort(`${fieldId}.IN`);
    let body: STNode;

    if (field?.value) {
        body = getInnermostExpressionBody(field.value);
        if (STKindChecker.isQueryExpression(field.value)) {
            const selectClause = field.value?.selectClause || field.value?.resultClause;
            body = selectClause.expression;
        }
    }

    const value = body && body.source.trim();

    const [editable, setEditable] = useState<boolean>(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);

    useEffect(() => {
        if (editable) {
            context.enableStatementEditor({
                value: body?.source,
                valuePosition: body?.position as NodePosition,
                label: getFieldLabel(fieldId)
            });
            setEditable(false);
        }
    }, [editable, body]);

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{marginRight: "auto"}} data-testid={`primitive-array-element-${portIn?.getName()}`}>
                <span className={classes.valueLabel} style={{ marginLeft: "24px" }}>
                    <OutputSearchHighlight>{value}</OutputSearchHighlight>
                </span>
            </span>
        </TruncatedLabel>
    );

    const handleEditable = () => {
        setEditable(true);
    };

    const handleDelete = async () => {
        await deleteField(field.value);
    };

    const valueConfigMenuItems = useMemo(() => {
        const items =  [
            {
                title: ValueConfigOption.EditValue,
                onClick: handleEditable
            }
        ];
        if (isArrayElement) {
            items.push({
                title: ValueConfigOption.DeleteElement,
                onClick: handleDelete
            });
        } else if (value !== getDefaultValue(field.type?.typeName)) {
            items.push({
                title: ValueConfigOption.DeleteValue,
                onClick: handleDelete
            });
        }
        return items;
    }, [value]);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    return (
        <>
            {value && (
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.treeLabel,
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : ""
                    )}
                >
                    <span className={classes.inPort}>
                        {portIn &&
                            <DataMapperPortWidget engine={engine} port={portIn} handlePortState={handlePortState} />
                        }
                    </span>
                    <span className={classes.label}>{label}</span>
                    <ValueConfigMenu
                        menuItems={valueConfigMenuItems}
                        portName={portIn?.getName()}
                    />
                </div>
            )}
        </>
    );
}
