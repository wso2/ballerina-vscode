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
import React, { useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Button, Codicon, Tooltip } from "@wso2/ui-toolkit";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { InputOutputPortModel } from "../../Port";
import { OutputSearchHighlight } from "../commons/Search";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore } from '../../../../store/store';
import { getTypeName } from "../../utils/type-utils";
import { getDefaultValue } from "../../utils/common-utils";

export interface OutputFieldPreviewWidgetProps {
    parentId: string;
    field: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    hasHoveredParent?: boolean;
}

export function OutputFieldPreviewWidget(props: OutputFieldPreviewWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        treeDepth = 0,
        hasHoveredParent
    } = props;

    const classes = useIONodesStyles();
    const [isHovered, setIsHovered] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();

    let indentation = treeDepth * 16 + 32;
    let expanded = true;

    const typeName = getTypeName(field);
    const typeKind = field.kind;
    const isArray = typeKind === TypeKind.Array;
    const isRecord = typeKind === TypeKind.Record;

    let updatedParentId = parentId;
    if (fieldIndex !== undefined) {
        updatedParentId = `${parentId}.${fieldIndex}`
    }
    let fieldName = field?.variableName || '';
    let portName = updatedParentId !== '' ? fieldName !== '' ? `${updatedParentId}.${fieldName}` : updatedParentId : fieldName;
    const portIn = getPort(portName + ".IN");

    const fields = (isRecord && field.fields.filter(f => f !== null)) ||
        (isArray && [{ ...field.member, variableName: fieldName + "Item" }]);

    const handleExpand = () => {
        const collapsedFields = collapsedFieldsStore.fields;
        if (!expanded) {
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== portName));
        } else {
            collapsedFieldsStore.setFields([...collapsedFields, portName]);
        }
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    let isDisabled = portIn?.attributes.descendantHasValue;

    if (!isDisabled) {
        if (portIn?.attributes.parentModel && (
            Object.entries(portIn?.attributes.parentModel.links).length > 0 ||
            portIn?.attributes.parentModel.attributes.ancestorHasValue)
        ) {
            portIn.attributes.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    if (portIn && portIn.attributes.collapsed) {
        expanded = false;
    }

    const label = (
        <span
            style={{ marginRight: "auto", opacity: 0.5 }}
            data-testid={`record-widget-field-label-${portIn?.getName()}`}
        >
            <span
                className={classnames(classes.valueLabel,
                    isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                )}
                style={{ marginLeft: fields ? 0 : indentation + 24 }}
            >
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!field?.optional && <span className={classes.requiredMark}>*</span>}
                {typeName && ":"}
            </span>
            {typeName && (
                <span
                    className={classnames(classes.typeLabel,
                        isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                    )}
                >
                    {typeName || ''}
                </span>
            )}
        </span>
    );



    return (
        <>
            <Tooltip
                content={(<span>Please map parent field first</span>)}
                sx={{ fontSize: "12px" }}
                containerSx={{ width: "100%" }}
            >
                <div
                    id={"recordfield-" + portName}
                    className={classnames(classes.treeLabel,
                        isDisabled && !hasHoveredParent && !isHovered ? classes.treeLabelDisabled : "",
                        isDisabled && isHovered ? classes.treeLabelDisableHover : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : ""
                    )}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <span className={classes.label}>
                        {fields && (
                            <Button
                                id={"expand-or-collapse-" + portName}
                                appearance="icon"
                                tooltip="Expand/Collapse"
                                sx={{ marginLeft: indentation }}
                                onClick={handleExpand}
                                data-testid={`${portIn?.getName()}-expand-icon-element`}
                            >
                                {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                            </Button>
                        )}
                        {label}
                    </span>
                </div>
            </Tooltip>
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <OutputFieldPreviewWidget
                            key={index}
                            engine={engine}
                            field={subField}
                            getPort={getPort}
                            parentId={portName}
                            context={context}
                            treeDepth={treeDepth + 1}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })
            }
        </>
    );
}
