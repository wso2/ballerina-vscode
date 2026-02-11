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

import { Button, Codicon, TruncatedLabel, TruncatedLabelGroup } from "@wso2/ui-toolkit";
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { IOType, TypeKind } from "@wso2/ballerina-core";

import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { InputSearchHighlight } from '../commons/Search';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { InputNodeTreeItemWidget } from "./InputNodeTreeItemWidget";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMIOConfigPanelStore } from '../../../../store/store';
import { getTypeName } from "../../utils/type-utils";
import { useShallow } from "zustand/react/shallow";
import { InputCategoryIcon } from "./InputCategoryIcon";
import { isGroupHeaderPort } from "../../utils/common-utils";

export interface InputNodeWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    dmType: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    valueLabel?: string;
    focusedInputs?: string[];
}

export function InputNodeWidget(props: InputNodeWidgetProps) {
    const { engine, dmType, id, getPort, valueLabel, focusedInputs } = props;
    
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);

    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const expandedFieldsStore = useDMExpandedFieldsStore();

	const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
        useShallow(state => ({
            setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
            setIOConfigPanelType: state.setIOConfigPanelType,
            setIsSchemaOverridden: state.setIsSchemaOverridden
        }))
    );

    const classes = useIONodesStyles();
    const typeName = getTypeName(dmType);

    const portOut = getPort(`${id}.OUT`);
    const isUnknownType = dmType.kind === TypeKind.Unknown;

    let fields: IOType[];

    if (dmType.kind === TypeKind.Record) {
        fields = dmType.fields;
    } else if (dmType.kind === TypeKind.Array) {
        fields = [ dmType.member ];
    } else if (dmType.kind === TypeKind.Enum) {
        fields = dmType.members;
    }

    let expanded = true;
    if (portOut && portOut.attributes.collapsed) {
        expanded = false;
    }

    const isNotGroupHeaderPort = !(portOut && isGroupHeaderPort(portOut));

    const headerLabel = valueLabel || dmType.displayName || dmType.name || id;
    const label = (
        <TruncatedLabelGroup style={{ alignItems: "baseline" }}>
            <TruncatedLabel className={classes.valueLabelHeader}>
                <InputSearchHighlight>{headerLabel}</InputSearchHighlight>
            </TruncatedLabel>
            {typeName && isNotGroupHeaderPort && (
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
            expandedFieldsStore.setFields(expandedFields.filter((element) => element !== id));
            collapsedFieldsStore.setFields([...collapsedFields, id]);

        } else {
            expandedFieldsStore.setFields([...expandedFields, id]);
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== id));
        }

    }

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const onRightClick = (event: React.MouseEvent) => {
        event.preventDefault(); 
        setIOConfigPanelType("Input");
        setIsSchemaOverridden(true);
        setIsIOConfigPanelOpen(true);
    };

    return (
        <TreeContainer data-testid={`${id}-node`} onContextMenu={onRightClick}>
            <TreeHeader
                id={"recordfield-" + id}
                isSelected={portState !== PortState.Unselected}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <span className={classes.label}>
                    {fields && (
                        <Button
                            id={"expand-or-collapse-" + id} 
                            appearance="icon"
                            tooltip="Expand/Collapse"
                            onClick={handleExpand}
                            data-testid={`${id}-expand-icon-record-source-node`}
                        >
                            {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                        </Button>
                    )}
                    {label}
                    <InputCategoryIcon category={dmType.category} />
                </span>
                <span className={classes.outPort}>
                    {portOut && (isNotGroupHeaderPort || !expanded && portOut.linkedPorts.length > 0) &&
                        <DataMapperPortWidget engine={engine} port={portOut} handlePortState={handlePortState} />
                    }
                </span>
            </TreeHeader>
            {expanded && fields && (
                <TreeBody>
                    {
                        fields
                            ?.filter(f => !!f)
                            .map((field, index) => {
                            return (
                                <InputNodeTreeItemWidget
                                    key={index}
                                    engine={engine}
                                    dmType={field}
                                    getPort={getPort}
                                    parentId={id}
                                    treeDepth={0}
                                    hasHoveredParent={isHovered}
                                    focusedInputs={focusedInputs}
                                />
                            );
                        })
                    }
                </TreeBody>
            )}
        </TreeContainer>
    );
}
