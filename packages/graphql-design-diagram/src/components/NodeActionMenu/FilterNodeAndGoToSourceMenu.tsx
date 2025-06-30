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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline  no-implicit-dependencies no-submodule-imports
import React from "react";

import { ContextMenu, Item } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { getFilterNodeMenuItem, getGoToSourceMenuItem } from "../MenuItems/menuItems";
import { verticalIconStyle, verticalIconWrapper } from "../MenuItems/style";
import { NodeType } from "../NodeFilter";
import { Position } from "../resources/model";

interface GoToSourceNodeMenuProps {
    location: Position;
    nodeType: NodeType;
}

export function FilterNodeAndGoToSourceMenu(props: GoToSourceNodeMenuProps) {
    const { location, nodeType } = props;
    const { setFilteredNode, goToSource } = useGraphQlContext();

    const getMenuItems = () => {
        const items: Item[] = [];
        items.push(getGoToSourceMenuItem(location, goToSource));
        items.push(getFilterNodeMenuItem(nodeType, setFilteredNode));
        return items;
    }

    return (
        <>
            {location?.filePath && location?.startLine && location?.endLine &&
                <ContextMenu iconSx={verticalIconStyle} sx={verticalIconWrapper} menuItems={getMenuItems()} />
            }
        </>
    );
}
