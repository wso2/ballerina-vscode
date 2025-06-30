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
// eslint-disable-next-line react-hooks/exhaustive-deps
import React, { useEffect } from "react";

import { DiagramEngine, NodeModel } from "@projectstorm/react-diagrams";

import { CustomCanvasWidget } from "./CustomCanvasWidget";

interface NavigationWrapperCanvasProps {
    diagramEngine: DiagramEngine;
    className?: string;
    focusedNode?: NodeModel;
}

export function NavigationWrapperCanvasWidget(props: NavigationWrapperCanvasProps) {
    const { diagramEngine, focusedNode, className } = props;

    useEffect(() => {
        if (focusedNode) {
            setTimeout(() => {
                // eslint-disable-next-line no-use-before-define
                focusToNode(focusedNode, diagramEngine.getModel().getZoomLevel(), diagramEngine);
            }, 300);
        }
    }, [diagramEngine, focusedNode]);

    return (
        <CustomCanvasWidget engine={diagramEngine} isNodeFocused={!!focusedNode} className={className} />
    );
}

function focusToNode(node: NodeModel, currentZoomLevel: number, diagramEngine: DiagramEngine) {
    const canvasBounds = diagramEngine.getCanvas().getBoundingClientRect();
    const nodeBounds = node.getBoundingBox();

    const zoomOffset = currentZoomLevel / 100;
    const offsetX = canvasBounds.width / 2 - (nodeBounds.getTopLeft().x + nodeBounds.getWidth() / 2) * zoomOffset;
    const offsetY = canvasBounds.height / 2 - (nodeBounds.getTopLeft().y + nodeBounds.getHeight() / 2) * zoomOffset;

    diagramEngine.getModel().setOffset(offsetX, offsetY);
    diagramEngine.repaintCanvas();
}
