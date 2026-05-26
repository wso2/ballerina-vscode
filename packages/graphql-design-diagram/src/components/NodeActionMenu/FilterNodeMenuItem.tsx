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

import { Icon, Item, MenuItem } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { NodeType } from "../NodeFilter";

interface FocusToNodeMenuProps {
    nodeType: NodeType;
}

export function FilterNodeMenuItem(props: FocusToNodeMenuProps) {
    const { nodeType } = props;
    const { setFilteredNode } = useGraphQlContext();

    const handleOnClick = () => {
        setFilteredNode(nodeType);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="center-focus-weak" />
                <div style={{ marginLeft: '5px' }}>
                    Show Subgraph
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "Show Subgraph", label: ItemWithIcon(), onClick: () => handleOnClick() };

    return (
        <MenuItem
            sx={{ pointerEvents: "auto", userSelect: "none" }}
            item={menuItem}

            data-testid={`show-subgraph-menu`}
        />
    )
}
