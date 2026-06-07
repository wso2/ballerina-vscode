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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline no-implicit-dependencies no-submodule-imports
import React from "react";

import { LabelEditIcon } from "@wso2/ballerina-core";
import { Item } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../../../../DiagramContext/GraphqlDiagramContext";
import { Position } from "../../../../resources/model";

interface ServiceSubheaderProps {
    location: Position;
    nodeName: string;
}

export function ServiceSubheader(props: ServiceSubheaderProps) {
    const { servicePanel } = useGraphQlContext();

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelEditIcon />
                <div style={{ marginLeft: '5px' }}>
                    Edit Service
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "edit-service", label: ItemWithIcon(), onClick: () => servicePanel() };

    return (
        { menuItem }
    );
}
