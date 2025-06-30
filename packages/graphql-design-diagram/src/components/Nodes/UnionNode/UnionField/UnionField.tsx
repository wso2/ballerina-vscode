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

import React, { useEffect, useRef } from "react";

import { DiagramEngine, PortModel } from "@projectstorm/react-diagrams";

import { useGraphQlContext } from "../../../DiagramContext/GraphqlDiagramContext";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { Interaction } from "../../../resources/model";
import { FieldName, NodeFieldContainer } from "../../../resources/styles/styles";
import { UnionNodeModel } from "../UnionNodeModel";

interface UnionFieldProps {
    engine: DiagramEngine;
    node: UnionNodeModel;
    unionField: Interaction;
}

export function UnionField(props: UnionFieldProps) {
    const { engine, node, unionField } = props;
    const { setSelectedNode } = useGraphQlContext();

    const functionPorts = useRef<PortModel[]>([]);

    const field = unionField.componentName;

    useEffect(() => {
        functionPorts.current.push(node.getPortFromID(`left-${field}`));
        functionPorts.current.push(node.getPortFromID(`right-${field}`));
    }, [unionField]);

    const updateSelectedNode = () => {
        setSelectedNode(field);
    }

    return (
        <div onClick={updateSelectedNode}>
            <NodeFieldContainer>
                <GraphqlBasePortWidget
                    port={node.getPort(`left-${field}`)}
                    engine={engine}
                />
                <FieldName style={{ marginLeft: '7px' }} data-testid={`union-field-${field}`}>
                    {field}
                </FieldName>
                <GraphqlBasePortWidget
                    port={node.getPort(`right-${field}`)}
                    engine={engine}
                />
            </NodeFieldContainer>
        </div>
    );
}
