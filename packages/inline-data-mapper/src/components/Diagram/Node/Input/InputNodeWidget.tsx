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

import { Button, Codicon } from "@wso2/ui-toolkit";
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { IOType } from "@wso2/ballerina-core";

import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { InputSearchHighlight } from '../commons/Search';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { InputNodeTreeItemWidget } from "./InputNodeTreeItemWidget";
import { useIONodesStyles } from "../../../styles";
import { useDMExpandedFieldsStore, useDMIOConfigPanelStore } from '../../../../store/store';
import { getTypeName } from "../../utils/type-utils";
import { useShallow } from "zustand/react/shallow";

export interface InputNodeWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    dmType: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    valueLabel?: string;
    nodeHeaderSuffix?: string;
}

export function InputNodeWidget(props: InputNodeWidgetProps) {
    const { engine, dmType, id, getPort, valueLabel, nodeHeaderSuffix } = props;
    
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);
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

    const hasFields = !!dmType?.fields?.length;

    let expanded = true;
    if (portOut && portOut.collapsed) {
        expanded = false;
    }

    const label = (
        <span style={{ marginRight: "auto" }}>
            <span className={classes.valueLabel}>
                <InputSearchHighlight>{valueLabel ? valueLabel : id}</InputSearchHighlight>
                {typeName && ":"}
            </span>
            {typeName && (
                <span className={classes.inputTypeLabel}>
                    {typeName}
                </span>
            )}
        </span>
    );

    const handleExpand = () => {
        const expandedFields = expandedFieldsStore.fields;
        if (expanded) {
            expandedFieldsStore.setFields(expandedFields.filter((element) => element !== id));
        } else {
            expandedFieldsStore.setFields([...expandedFields, id]);
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
                    {hasFields && (
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
                    <span className={classes.nodeType}>{nodeHeaderSuffix}</span>
                </span>
                <span className={classes.outPort}>
                    {portOut &&
                        <DataMapperPortWidget engine={engine} port={portOut} handlePortState={handlePortState} />
                    }
                </span>
            </TreeHeader>
            {expanded && hasFields && (
                <TreeBody>
                    {
                        dmType.fields.map((field, index) => {
                            return (
                                <InputNodeTreeItemWidget
                                    key={index}
                                    engine={engine}
                                    dmType={field}
                                    getPort={getPort}
                                    parentId={id}
                                    treeDepth={0}
                                    hasHoveredParent={isHovered}
                                />
                            );
                        })
                    }
                </TreeBody>
            )}
        </TreeContainer>
    );
}
