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
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { IOType } from "@wso2/ballerina-core";

import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { InputSearchHighlight } from './Search';
import { TreeContainer, TreeHeader } from './Tree/Tree';
import { useIONodesStyles } from "../../../styles";
import { getTypeName } from "../../utils/type-utils";

export interface PrimitiveTypeItemWidgetProps {
    id: string; // this will be the root ID used to prepend for UUIDs of nested fields
    dmType: IOType;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    valueLabel?: string;
    nodeHeaderSuffix?: string;
}

export function PrimitiveTypeInputWidget(props: PrimitiveTypeItemWidgetProps) {
    const { engine, dmType, id, getPort, valueLabel, nodeHeaderSuffix } = props;

    const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
    const classes = useIONodesStyles();

    const typeName = getTypeName(dmType);
    const portOut = getPort(`${id}.OUT`);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

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

    return (
        <TreeContainer data-testid={`${id}-node`}>
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
