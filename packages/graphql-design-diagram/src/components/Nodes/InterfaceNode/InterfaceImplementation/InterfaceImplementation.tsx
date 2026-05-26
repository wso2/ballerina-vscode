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

import React from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { useGraphQlContext } from "../../../DiagramContext/GraphqlDiagramContext";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { Interaction } from "../../../resources/model";
import { FieldName, NodeFieldContainer } from "../../../resources/styles/styles";
import { InterfaceNodeModel } from "../InterfaceNodeModel";

interface InterfaceImplWidgetProps {
    engine: DiagramEngine;
    node: InterfaceNodeModel;
    field: Interaction;
}

export function InterfaceImplWidget(props: InterfaceImplWidgetProps) {
    const { engine, node, field } = props;
    const { setSelectedNode } = useGraphQlContext();

    const updateSelectedNode = () => {
        setSelectedNode(field.componentName);
    }

    return (
        <div onClick={updateSelectedNode}>
            <NodeFieldContainer>
                <GraphqlBasePortWidget
                    port={node.getPort(`left-${field.componentName}`)}
                    engine={engine}
                />
                <FieldName data-testid={`interface-implementation-${field.componentName}`}>{field.componentName}</FieldName>
                <GraphqlBasePortWidget
                    port={node.getPort(`right-${field.componentName}`)}
                    engine={engine}
                />
            </NodeFieldContainer>
        </div>
    );
}
