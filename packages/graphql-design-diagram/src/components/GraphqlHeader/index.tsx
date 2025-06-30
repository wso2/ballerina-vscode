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

import React, { useEffect } from "react";

import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { NodeCategory, NodeFilter, NodeType } from "../NodeFilter";
import { GraphqlDesignModel } from "../resources/model";
import { OperationTypes, TypeFilter } from "../TypeFilter";
import { getNodeListOfModel } from "../utils/common-util";

interface GraphqlHeaderProps {
    updateFilter: (type: OperationTypes) => void;
    designModel: GraphqlDesignModel;
}

export function GraphqlHeader(props: GraphqlHeaderProps) {
    const { updateFilter, designModel } = props;
    const { filteredNode } = useGraphQlContext();
    const nodeList = getNodeListOfModel(designModel);

    return (
        <HeaderContainer>
            <Title> GraphQL Designer </Title>
            <FilterBar>
                <NodeFilter nodeList={nodeList} data-testid="node-filter"/>
                <TypeFilter
                    updateFilter={updateFilter}
                    isFilterDisabled={filteredNode ? (filteredNode.type !== NodeCategory.GRAPHQL_SERVICE) : false}
                />
            </FilterBar>
        </HeaderContainer>
    );
}

const HeaderContainer = styled.div`
  height: 50px;
  display: flex;
  padding: 15px;
  background-color: ${ThemeColors.SURFACE_DIM};
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(102, 103, 133, 0.15);
`;

const Title = styled.div`
  font-weight: 600;
  margin-right: 10px;
`;

const FilterBar = styled.div`
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;
