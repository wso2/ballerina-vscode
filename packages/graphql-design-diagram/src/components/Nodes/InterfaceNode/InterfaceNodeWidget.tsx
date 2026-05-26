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
import React from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { useGraphQlContext } from "../../DiagramContext/GraphqlDiagramContext";
import { NodeContainer, NodeFieldContainer } from "../../resources/styles/styles";
import { getComponentName } from "../../utils/common-util";

import { InterfaceHeadWidget } from "./InterfaceHead/InterfaceHead";
import { InterfaceImplWidget } from "./InterfaceImplementation/InterfaceImplementation";
import { InterfaceNodeModel } from "./InterfaceNodeModel";
import { ResourceFunctionCard } from "./ResourceFunctionCard/ResourceFunctionCard";

interface InterfaceNodeWidgetProps {
    node: InterfaceNodeModel;
    engine: DiagramEngine;
}

export function InterfaceNodeWidget(props: InterfaceNodeWidgetProps) {
    const { node, engine } = props;
    const { selectedDiagramNode } = useGraphQlContext();
    const isNodeSelected = selectedDiagramNode &&  getComponentName(selectedDiagramNode) === node.interfaceObject.name;

    return (
        <NodeContainer isSelected={isNodeSelected} data-testid={`interface-node-${node?.interfaceObject?.name}`}>
            <InterfaceHeadWidget node={node} engine={engine}/>
            {node.interfaceObject.resourceFunctions?.map((resourceFunction, index) => {
                return (
                    <ResourceFunctionCard key={index} node={node} engine={engine} functionElement={resourceFunction}/>
                );
            })}
            {node.interfaceObject.possibleTypes.length > 0 && (
                <NodeFieldContainer>
                    <div>Implementations</div>
                </NodeFieldContainer>
            )}
            {node.interfaceObject.possibleTypes.map((possibleType, index) => {
                return (
                    <InterfaceImplWidget key={index} node={node} engine={engine} field={possibleType}/>
                );
            })}
        </NodeContainer>
    );
}
