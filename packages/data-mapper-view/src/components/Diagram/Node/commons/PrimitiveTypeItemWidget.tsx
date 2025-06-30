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

import { DiagramEngine, PortWidget } from '@projectstorm/react-diagrams';
import { TypeField } from "@wso2/ballerina-core";
import { TruncatedLabel } from "@wso2/ui-toolkit";

import { DataMapperPortWidget, PortState, RecordFieldPortModel } from '../../Port';
import { EXPANDED_QUERY_INPUT_NODE_PREFIX } from '../../utils/constants';
import { getTypeName } from "../../utils/dm-utils";

import { InputSearchHighlight } from './Search';
import { TreeContainer, TreeHeader } from './Tree/Tree';
import { useIONodesStyles } from "../../../styles";

export interface RecordTypeTreeWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    typeDesc: TypeField;
    engine: DiagramEngine;
    getPort: (portId: string) => RecordFieldPortModel;
    valueLabel?: string;
    nodeHeaderSuffix?: string;
}

export function PrimitiveTypeItemWidget(props: RecordTypeTreeWidgetProps) {
    const { engine, typeDesc, id, getPort, valueLabel, nodeHeaderSuffix } = props;
    const classes = useIONodesStyles();

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);

    const typeName = getTypeName(typeDesc);

    const portIn = getPort(`${id}.IN`);
    const portOut = getPort(`${id}.OUT`);

    let expanded = true;
    if ((portIn && portIn.collapsed) || (portOut && portOut.collapsed)) {
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

    /** Invisible port to which the right angle link from the query header/clauses are connected to */
    const invisiblePort = getPort(`${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${valueLabel}`);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    return (
        <TreeContainer data-testid={`${id}-node`}>
            <div className={classes.queryPortWrap}>
                {invisiblePort && <PortWidget port={invisiblePort} engine={engine} />}
            </div>
            <TreeHeader id={"recordfield-" + id} isSelected={portState !== PortState.Unselected}>
                <span className={classes.label}>
                    {label}
                    <span className={classes.nodeType}>{nodeHeaderSuffix}</span>
                </span>
                <span className={classes.outPort}>
                    {portOut &&
                        <DataMapperPortWidget engine={engine} port={portOut} handlePortState={handlePortState} />
                    }
                </span>
            </TreeHeader>
        </TreeContainer>
    );
}

