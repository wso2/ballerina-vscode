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
// tslint:disable: no-implicit-dependencies jsx-no-multiline-js jsx-wrap-multiline
import React, { useEffect, useState } from "react";

import {
    ExtendedLangClientInterface, GraphqlDesignService
} from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";

import { Container } from "../Canvas/CanvasWidgetContainer";
import { GraphqlDiagramContext } from "../DiagramContext/GraphqlDiagramContext";
import { GraphqlDiagramContainer } from "../GraphqlDiagramContainer/GraphqlDiagramContainer";
import { NodeType } from "../NodeFilter";
import { GraphqlDesignModel } from "../resources/model";
import { getModelForGraphqlService } from "../utils/ls-util";

import { GraphqlUnsupportedOverlay } from "./GraphqlUnsupportedOverlay";

export interface GraphqlDesignDiagramProps {
    model?: STNode;
    targetPosition?: NodePosition;
    langClientPromise?: Promise<ExtendedLangClientInterface>;
    filePath: string;
    graphqlModelResponse: GraphqlDesignService;
    currentFile?: {
        content: string,
        path: string,
        size: number
    };
    ballerinaVersion?: string;
    syntaxTree?: STNode;
    functionPanel?: (position: NodePosition, functionType: string, model?: STNode, filePath?: string, completeST?: STNode) => void;
    servicePanel?: () => void;
    operationDesignView?: (functionPosition: NodePosition, filePath?: string) => void;
    onDelete?: (position: NodePosition) => void;
    fullST?: STNode;
    goToSource?: (filePath: string, position: NodePosition) => void;
    recordEditor?: (recordModel: STNode, filePath?: string, completeST?: STNode) => void;
}

interface GraphqlModelData {
    designModel: GraphqlDesignModel;
    isIncompleteModel: boolean;
}

export function GraphqlDesignDiagram(props: GraphqlDesignDiagramProps) {
    const {
        model,
        targetPosition,
        langClientPromise,
        currentFile,
        functionPanel,
        servicePanel,
        operationDesignView,
        onDelete,
        fullST,
        goToSource,
        recordEditor,
        graphqlModelResponse
    } = props;

    const [modelData, setModelData] = useState<GraphqlModelData>(undefined);
    const [selectedDiagramNode, setSelectedDiagramNode] = useState<string>(undefined);
    const [filteredNode, setFilteredNode] = useState<NodeType>(undefined);

    useEffect(() => {
        if (graphqlModelResponse) {
            setModelData({
                designModel: graphqlModelResponse?.graphqlDesignModel,
                isIncompleteModel: graphqlModelResponse?.isIncompleteModel
            });
        }
    }, [graphqlModelResponse]);

    const setSelectedNode = (node: string) => {
        setSelectedDiagramNode(node);
    }

    const updateNodeFiltering = (node: NodeType) => {
        setFilteredNode(node);
    }

    const ctxt = {
        model,
        functionPanel,
        servicePanel,
        operationDesignView,
        onDelete,
        fullST,
        goToSource,
        recordEditor,
        langClientPromise,
        currentFile,
        setSelectedNode,
        selectedDiagramNode,
        setFilteredNode: updateNodeFiltering,
        filteredNode
    };

    // TODO: temporary removed FullST check when rendering the GraphqlDiagramContainer, need to add with form rendering
    return (
        <>
            <GraphqlDiagramContext {...ctxt}>
                {modelData?.designModel && <GraphqlDiagramContainer designModel={modelData.designModel} />}
            </GraphqlDiagramContext>
            {modelData?.isIncompleteModel && <GraphqlUnsupportedOverlay />}
            {!modelData?.designModel &&
                <Container className="dotted-background">
                    <p>Fetching data...</p>
                </Container>
            }
        </>
    );
}
