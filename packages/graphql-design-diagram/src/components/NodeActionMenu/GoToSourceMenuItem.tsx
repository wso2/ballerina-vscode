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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline no-submodule-imports
import React from "react";

import { Codicon, Item, MenuItem } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { Position } from "../resources/model";
import { getFormattedPosition } from "../utils/common-util";

interface GoToSourceMenuProps {
    location: Position;
}

export function GoToSourceMenuItem(props: GoToSourceMenuProps) {
    const { location } = props;

    const filePath = location?.filePath;
    const position = getFormattedPosition(location);

    const { goToSource } = useGraphQlContext();
    const handleOnClick = () => {
        goToSource(filePath, position);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Codicon name="code" />
                <div style={{ marginLeft: '5px' }}>
                    Go to Source
                </div>
                <div style={{ marginLeft: '5px', color: '#595959F4' }}>
                    Ctrl + left click
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "go-to-source", label: ItemWithIcon(), onClick: () => handleOnClick() };

    return (
        <>
            {filePath && position &&
                <MenuItem
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                />
            }
        </>
    );
}
