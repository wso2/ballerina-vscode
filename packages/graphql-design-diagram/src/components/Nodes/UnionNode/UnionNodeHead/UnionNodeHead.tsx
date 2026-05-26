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
import { ContextMenu, Item } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../../../DiagramContext/GraphqlDiagramContext";
import { getFilterNodeMenuItem } from "../../../MenuItems/menuItems";
import { verticalIconStyle, verticalIconWrapper } from "../../../MenuItems/style";
import { NodeCategory } from "../../../NodeFilter";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { UnionIcon } from "../../../resources/assets/icons/UnionIcon";
import { HeaderName, NodeHeader } from "../../../resources/styles/styles";
import { UnionNodeModel } from "../UnionNodeModel";

interface UnionNodeHeadWidgetProps {
    engine: DiagramEngine;
    node: UnionNodeModel;
}

export function UnionNodeHeadWidget(props: UnionNodeHeadWidgetProps) {
    const { engine, node } = props;
    const headPorts = useRef<PortModel[]>([]);
    const { setFilteredNode } = useGraphQlContext();

    const displayName: string = node.unionObject.name;

    useEffect(() => {
        headPorts.current.push(node.getPortFromID(`left-${node.getID()}`));
        headPorts.current.push(node.getPortFromID(`right-${node.getID()}`));
    }, [node]);

    const getMenuItems = () => {
        const menuItems: Item[] = [];
        menuItems.push(getFilterNodeMenuItem({ name: displayName, type: NodeCategory.UNION }, setFilteredNode));
        return menuItems;
    }

    return (
        <NodeHeader data-testid={`union-head-${displayName}`}>
            <UnionIcon />
            <GraphqlBasePortWidget
                port={node.getPort(`left-${node.getID()}`)}
                engine={engine}
            />
            <HeaderName>{displayName}</HeaderName>
            {/* <ContextMenu iconSx={verticalIconStyle} sx={verticalIconWrapper} menuItems={getMenuItems()} /> */}
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
