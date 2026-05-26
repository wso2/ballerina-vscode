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
import { NodeContainer } from "../../resources/styles/styles";
import { getComponentName } from "../../utils/common-util";

import { ServiceClassHeadWidget } from "./ClassHead/ClassHead";
import { ServiceField } from "./FunctionCard/ServiceField";
import { ServiceClassNodeModel } from "./ServiceClassNodeModel";


interface ServiceClassNodeWidgetProps {
    node: ServiceClassNodeModel;
    engine: DiagramEngine;
}

export function ServiceClassNodeWidget(props: ServiceClassNodeWidgetProps) {
    const { node, engine } = props;
    const { selectedDiagramNode } = useGraphQlContext();

    const isNodeSelected = selectedDiagramNode &&  getComponentName(selectedDiagramNode) === node.classObject.serviceName;

    return (
        <NodeContainer isSelected={isNodeSelected} data-testid={`service-class-node-${node?.classObject?.serviceName}`}>
            <ServiceClassHeadWidget node={node} engine={engine} />
            {node.classObject.functions?.map((classFunction, index) => {
                return (
                    <ServiceField key={index} node={node} engine={engine} functionElement={classFunction} />
                );
            })}
        </NodeContainer>
    );
}
