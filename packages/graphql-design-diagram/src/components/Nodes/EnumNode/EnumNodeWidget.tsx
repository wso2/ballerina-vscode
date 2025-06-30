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

import { EnumFieldCard } from "./EnumFieldCard/EnumFieldCard";
import { EnumHeadWidget } from "./EnumHead/EnumHead";
import { EnumNodeModel } from "./EnumNodeModel";

interface EnumNodeWidgetProps {
    node: EnumNodeModel;
    engine: DiagramEngine;
}

export function EnumNodeWidget(props: EnumNodeWidgetProps) {
    const { node, engine } = props;
    const { selectedDiagramNode } = useGraphQlContext();
    const isNodeSelected = selectedDiagramNode &&  getComponentName(selectedDiagramNode) === node.enumObject.name;

    return (
        <NodeContainer isSelected={isNodeSelected} data-testid={`enum-node-${node?.enumObject?.name}`}>
            <EnumHeadWidget
                engine={engine}
                node={node}
            />
            {node.enumObject.enumFields.map((enumField, index) => {
                return (
                    <EnumFieldCard key={index} engine={engine} node={node} enumField={enumField}/>
                );
            })
            }
        </NodeContainer>
    );
}
