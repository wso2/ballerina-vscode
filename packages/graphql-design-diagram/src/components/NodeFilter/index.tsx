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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React from "react";

import { AutoComplete } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";

export enum NodeCategory {
    GRAPHQL_SERVICE = "graphqlService",
    RECORD = "record",
    SERVICE_CLASS = "serviceClass",
    INTERFACE = "interface",
    UNION = "union",
    ENUM = "enum"
}

export interface NodeType {
    name: string;
    type: NodeCategory;
}

interface NodeFilterProps {
    nodeList: NodeType[];
}

export function NodeFilter(props: NodeFilterProps) {
    const { nodeList } = props;
    const { setFilteredNode, filteredNode } = useGraphQlContext();

    const updateNode = (newValue: string) => {
        // find the NodeType matching the newValue
        const node = nodeList.find((item) => item.name === newValue);
        if (node) {
            setFilteredNode(node);
        }
    }

    return (
        <>
            {
                nodeList && (
                    <AutoComplete
                        data-testid="node-filter-autocomplete"
                        id="node-filter-select"
                        items={nodeList.map(
                            item => item?.name
                        )}
                        value={filteredNode ? filteredNode.name : nodeList[0]?.name}
                        onValueChange={(newValue: string) => updateNode(newValue)}
                        label={'Type'}
                        borderBox={true}
                        sx={{
                            width: "180px"
                        }}
                    />
                )
            }
        </>
    );
}
