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
import React, { useEffect, useState } from "react";

import { DiagramModel } from '@projectstorm/react-diagrams';

import { GraphqlDiagramCanvasWidget } from "../Canvas/GraphqlDiagramCanvasWidget";
import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { GraphqlHeader } from "../GraphqlHeader";
import { GraphqlDesignModel } from "../resources/model";
import { OperationTypes } from "../TypeFilter";
import { graphqlModelGenerator } from "../utils/model-generators/serviceModelGenerator";

interface GraphqlDiagramContainerProps {
    designModel: GraphqlDesignModel;
}

export function GraphqlDiagramContainer(props: GraphqlDiagramContainerProps) {
    const { designModel } = props;
    const [graphqlServiceModel, setGraphqlServiceModel] = useState<DiagramModel>(undefined);
    const [operationType, setOperationType] = useState<OperationTypes>(OperationTypes.All_Operations);
    const { filteredNode } = useGraphQlContext();

    useEffect(() => {
        setGraphqlServiceModel(graphqlModelGenerator(designModel, operationType, filteredNode));
    }, [designModel, operationType, filteredNode]);

    const updateFilter = (type: OperationTypes) => {
        setOperationType(type);
    }

    const modelRenderer = (
        <>
            <GraphqlHeader
                updateFilter={updateFilter}
                designModel={designModel}
            />
            <GraphqlDiagramCanvasWidget model={graphqlServiceModel} />
        </>
    );

    return (
        <>
            {graphqlServiceModel && modelRenderer}
        </>
    );
}
