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

import { Button, Codicon, TruncatedLabel } from "@wso2/ui-toolkit";
import { DiagramEngine, PortWidget } from '@projectstorm/react-diagrams';
import { TypeField } from "@wso2/ballerina-core";

import { DataMapperPortWidget, PortState, RecordFieldPortModel } from '../../../Port';
import { EXPANDED_QUERY_INPUT_NODE_PREFIX } from '../../../utils/constants';
import { getTypeName } from "../../../utils/dm-utils";
import { InputSearchHighlight } from '../Search';
import { TreeBody, TreeContainer, TreeHeader } from '../Tree/Tree';

import { RecordFieldTreeItemWidget } from "./RecordFieldTreeItemWidget";
import classnames from "classnames";
import { useIONodesStyles } from "../../../../styles";

export interface RecordTypeTreeWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    typeDesc: TypeField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    handleCollapse: (portName: string, isExpanded?: boolean) => void;
    valueLabel?: string;
    nodeHeaderSuffix?: string;
    hasLinkViaCollectClause?: boolean;
}

export function RecordTypeTreeWidget(props: RecordTypeTreeWidgetProps) {
    const { engine, typeDesc, id, getPort, handleCollapse, valueLabel, nodeHeaderSuffix, hasLinkViaCollectClause } = props;
    const classes = useIONodesStyles();

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const [isHovered, setIsHovered] = useState(false);

    const typeName = getTypeName(typeDesc);

    const portOut = getPort(`${id}.OUT`);
    const isPortDisabled = hasLinkViaCollectClause && Object.keys(portOut.getLinks()).length === 0;
    portOut.isDisabledDueToCollectClause = isPortDisabled;

    const hasFields = !!typeDesc?.fields?.length;

    let expanded = true;
    if (portOut && portOut.collapsed) {
        expanded = false;
    }

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
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
        </TruncatedLabel>
    );

    const handleExpand = () => {
        handleCollapse(id, !expanded);
    }

    /** Invisible port to which the right angle link from the query header/clauses are connected to */
    const invisiblePort = getPort(`${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${valueLabel}`);

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
        <TreeContainer data-testid={`${id}-node`}>
            <div className={classes.queryPortWrap}>
                {invisiblePort && <PortWidget port={invisiblePort} engine={engine} />}
            </div>
            <TreeHeader
                id={"recordfield-" + id}
                isSelected={portState !== PortState.Unselected}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className={classnames(
                    isPortDisabled && !isHovered ? classes.treeLabelDisabled : "",
                    isPortDisabled && isHovered ? classes.treeLabelDisableHover : "",
                )}
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
                            {expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                        </Button>
                    )}
                    {label}
                    <span className={classes.nodeType}>{nodeHeaderSuffix}</span>
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
            </TreeHeader>
            {expanded && hasFields && (
                <TreeBody>
                    {
                        typeDesc.fields.map((field, index) => {
                            return (
                                <RecordFieldTreeItemWidget
                                    key={index}
                                    engine={engine}
                                    field={field}
                                    getPort={getPort}
                                    parentId={id}
                                    handleCollapse={handleCollapse}
                                    treeDepth={0}
                                    isOptional={typeDesc.optional}
                                    hasHoveredParent={isHovered}
                                    hasLinkViaCollectClause={hasLinkViaCollectClause}
                                />
                            );
                        })
                    }
                </TreeBody>
            )}
        </TreeContainer>
    );
}
