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
import { GraphqlQueryIcon } from "@wso2/ballerina-core";

import { GraphqlBasePortWidget } from "../../Port/GraphqlBasePortWidget";
import { HeaderName, NodeHeader } from "../../resources/styles/styles";

import { HierarchicalNodeModel } from "./HierarchicalNodeModel";

interface HierarchicalHeadProps {
    engine: DiagramEngine;
    node: HierarchicalNodeModel;
}

export function HierarchicalHeadWidget(props: HierarchicalHeadProps) {
    const { engine, node } = props;
    const headPorts = useRef<PortModel[]>([]);

    const displayName: string = node.resourceObject.name;

    useEffect(() => {
        headPorts.current.push(node.getPortFromID(`left-${node.getID()}`));
        headPorts.current.push(node.getPortFromID(`right-${node.getID()}`));
    }, [node]);

    return (
        <NodeHeader data-testid={`hierarchical-head-${displayName}`}>
            <GraphqlQueryIcon/>
            <GraphqlBasePortWidget
                port={node.getPort(`left-${node.getID()}`)}
                engine={engine}
            />
            <HeaderName>{displayName}</HeaderName>

            <GraphqlBasePortWidget
                port={node.getPort(`right-${node.getID()}`)}
                engine={engine}
            />
            <GraphqlBasePortWidget
                port={node.getPort(`top-${node.getID()}`)}
                engine={engine}
            />
        </NodeHeader>
    );
}
