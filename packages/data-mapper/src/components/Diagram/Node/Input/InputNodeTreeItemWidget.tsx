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
import { Button, Codicon, Tooltip, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import classnames from "classnames";

import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { InputSearchHighlight } from "../commons/Search";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore } from '../../../../store/store';
import { getTypeName, isEnumMember } from "../../utils/type-utils";
import { InputNode } from "./InputNode";
import { InputCategoryIcon } from "./InputCategoryIcon";

export interface InputNodeTreeItemWidgetProps {
    parentId: string;
    dmType: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    treeDepth?: number;
    hasHoveredParent?: boolean;
    focusedInputs?: string[];
}

export function InputNodeTreeItemWidget(props: InputNodeTreeItemWidgetProps) {
    const { parentId, dmType, getPort, engine, treeDepth = 0, hasHoveredParent, focusedInputs } = props;

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const expandedFieldsStore = useDMExpandedFieldsStore();

    const fieldName = dmType.name;
    const displayName = dmType.displayName || fieldName;
    const typeName = getTypeName(dmType);
    const skipParentId = dmType.isFocused || dmType.category;
    const fieldId = skipParentId ? fieldName : `${parentId}.${fieldName}`;
    const portOut = getPort(`${fieldId}.OUT`);
    const isUnknownType = dmType.kind === TypeKind.Unknown;

    const classes = useIONodesStyles();

    let fields: IOType[];

    if (dmType.kind === TypeKind.Record) {
        fields = dmType.fields;
    } else if (dmType.kind === TypeKind.Array) {
        fields = [ dmType.member ];
    }

    let expanded = true;
    if (portOut && portOut.attributes.collapsed) {
        expanded = false;
    }

    const indentation = fields ? 0 : ((treeDepth + 1) * 16) + 8;

    const label = (
        <TruncatedLabelGroup style={{ alignItems: "baseline", opacity: portOut?.attributes.isPreview ? 0.5 : 1 }}>
            <TruncatedLabel className={classes.valueLabel} style={{ marginLeft: indentation }}>
                <InputSearchHighlight>{displayName}</InputSearchHighlight>
                {dmType.optional && "?"}
            </TruncatedLabel>
            {typeName && !isEnumMember(portOut?.getParent() as InputNode) && (
                <TruncatedLabel className={isUnknownType ? classes.unknownTypeLabel : classes.typeLabel}>
                    {typeName}
                </TruncatedLabel>
            )}
        </TruncatedLabelGroup>
    );

    const handleExpand = () => {
        const expandedFields = expandedFieldsStore.fields;
        const collapsedFields = collapsedFieldsStore.fields;

        if (expanded) {
            expandedFieldsStore.setFields(expandedFields.filter((element) => element !== fieldId));
            collapsedFieldsStore.setFields([...collapsedFields, fieldId]);

        } else {
            expandedFieldsStore.setFields([...expandedFields, fieldId]);
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== fieldId));
        }

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

    const treeItemHeader = (
        <div
                id={"recordfield-" + fieldId}
                className={classnames(classes.treeLabel,
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
                            {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                        </Button>}
                    {label}
                    <InputCategoryIcon category={dmType.category} />
                </span>
                <span className={classes.outPort}>
                    {portOut && !portOut.attributes.isPreview &&
                        <DataMapperPortWidget engine={engine} port={portOut} handlePortState={handlePortState} />
                    }
                </span>
            </div>
    );

    return (
        <>
            {!portOut?.attributes.isPreview ? treeItemHeader : (
                <Tooltip
                    content={(<span>Please map parent field first</span>)}
                    sx={{ fontSize: "12px" }}
                    containerSx={{ width: "100%" }}
                >
                    {treeItemHeader}
                </Tooltip>
            )}
            {fields && expanded &&
                fields
                ?.filter(f => !!f)
                .map((subField, index) => {
                    return (
                        <InputNodeTreeItemWidget
                            key={index}
                            engine={engine}
                            dmType={subField}
                            getPort={getPort}
                            parentId={fieldId}
                            treeDepth={treeDepth + 1}
                            hasHoveredParent={isHovered || hasHoveredParent}
                            focusedInputs={focusedInputs}
                        />
                    );
                })
            }
        </>
    );
}
