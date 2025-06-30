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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useState } from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import classnames from "classnames";

import { DataMapperPortWidget, PortState, RecordFieldPortModel } from "../../../Port";
import { getBalRecFieldName, getOptionalRecordField, getTypeName, isOptionalAndNillableField } from "../../../utils/dm-utils";
import { InputSearchHighlight } from "../Search";
import { Button, Codicon, TruncatedLabel } from "@wso2/ui-toolkit";
import { useIONodesStyles } from "../../../../styles";
import { getUnionTypes } from "../../../utils/union-type-utils";

export interface RecordFieldTreeItemWidgetProps {
    parentId: string;
    field: TypeField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    treeDepth?: number;
    handleCollapse: (portName: string, isExpanded?: boolean) => void;
    isOptional?: boolean;
    hasHoveredParent?: boolean;
    hasLinkViaCollectClause?: boolean;
}

export function RecordFieldTreeItemWidget(props: RecordFieldTreeItemWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        handleCollapse,
        treeDepth = 0,
        isOptional,
        hasHoveredParent,
        hasLinkViaCollectClause
    } = props;
    const classes = useIONodesStyles();

    const fieldName = getBalRecFieldName(field.name);
    const fieldId = `${parentId}.${fieldName}`;
    const portOut = getPort(`${fieldId}.OUT`);
    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const isPortDisabled = hasLinkViaCollectClause && Object.keys(portOut.getLinks()).length === 0;

    let fields: TypeField[];
    let optional = false;

    const optionalRecordField = getOptionalRecordField(field);
    if (optionalRecordField) {
        optional = true
        fields = optionalRecordField.fields;
    } else if (field.typeName === PrimitiveBalType.Record) {
        fields = field.fields;
    }

    let expanded = true;
    if (portOut) {
        if (portOut.collapsed) {
            expanded = false;
        }
        portOut.isDisabledDueToCollectClause = isPortDisabled;
    }

    const typeName = getTypeName(field);

    const indentation = fields ? 0 : ((treeDepth + 1) * 16) + 8;

    const getUnionType = () => {
        const typeText: JSX.Element[] = [];
        const unionTypes = getUnionTypes(field);
        unionTypes.forEach((type) => {
            typeText.push(<>{type}</>);
            if (type !== unionTypes[unionTypes.length - 1]) {
                typeText.push(<> | </>);
            }
        });
        return typeText;
    };

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <span style={{ marginRight: "auto" }}>
                <span className={classes.valueLabel} style={{ marginLeft: indentation }}>
                    <InputSearchHighlight>{fieldName}</InputSearchHighlight>
                    {field.optional && "?"}
                    {typeName && ":"}
                </span>
                {typeName && (
                    <span className={classes.inputTypeLabel}>
                        {field.typeName === PrimitiveBalType.Union ? getUnionType() : typeName || ''}
                    </span>
                )}

            </span>
        </TruncatedLabel>
    );

    const handleExpand = () => {
        handleCollapse(fieldId, !expanded);
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <div
                id={"recordfield-" + fieldId}
                className={classnames(classes.treeLabel,
                    isPortDisabled && !hasHoveredParent && !isHovered ? classes.treeLabelDisabled : "",
                    isPortDisabled && isHovered ? classes.treeLabelDisableHover : "",
                    (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                    hasHoveredParent ? classes.treeLabelParentHovered : ""
                )}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <span className={classes.label}>
                    {fields && <Button
                            id={"expand-or-collapse-" + fieldId}
                            appearance="icon"
                            tooltip="Expand/Collapse"
                            onClick={handleExpand}
                            sx={{ marginLeft: treeDepth * 16 }}
                        >
                            {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                        </Button>}
                    {label}
                </span>
                <span className={classes.outPort}>
                    {portOut &&
                        <DataMapperPortWidget
                            engine={engine}
                            port={portOut}
                            handlePortState={handlePortState}
                            disable={isPortDisabled}
                        />
                    }
                </span>
            </div>
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <RecordFieldTreeItemWidget
                            key={index}
                            engine={engine}
                            field={subField}
                            getPort={getPort}
                            parentId={fieldId}
                            handleCollapse={handleCollapse}
                            treeDepth={treeDepth + 1}
                            isOptional={isOptional || optional || isOptionalAndNillableField(subField)}
                            hasHoveredParent={isHovered || hasHoveredParent}
                            hasLinkViaCollectClause={hasLinkViaCollectClause}
                        />
                    );
                })
            }
        </>
    );
}
