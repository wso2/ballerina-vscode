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

import { RecordFieldWidget } from "./RecordFields/RecordField";
import { RecordHeadWidget } from "./RecordHead/RecordHead";
import { RecordNodeModel } from "./RecordNodeModel";

interface RecordNodeWidgetProps {
    node: RecordNodeModel;
    engine: DiagramEngine;
}

export function RecordNodeWidget(props: RecordNodeWidgetProps) {
    const { node, engine } = props;
    const { selectedDiagramNode } = useGraphQlContext();
    const isNodeSelected = selectedDiagramNode &&  getComponentName(selectedDiagramNode) === node.recordObject.name;

    return (
        <NodeContainer isSelected={isNodeSelected} data-testid={`record-node-${node?.recordObject?.name}`}>
            <RecordHeadWidget engine={engine} node={node} />
            {node.recordObject.recordFields.map((field, index) => {
                return (
                    <RecordFieldWidget
                        key={index}
                        node={node}
                        engine={engine}
                        field={field}
                    />
                );
            })
            }
        </NodeContainer>
    );
}
