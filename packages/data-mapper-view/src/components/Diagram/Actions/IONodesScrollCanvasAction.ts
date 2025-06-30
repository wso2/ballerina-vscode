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

import { Action, ActionEvent, InputType } from "@projectstorm/react-canvas-core";
import { DiagramEngine, NodeModel } from "@projectstorm/react-diagrams-core";
import { QueryExpressionNode } from "../Node";
import { RecordFieldPortModel } from "../Port";
import { DataMapperLinkModel } from "../Link";
import { LinkConnectorNode } from "../Node/LinkConnector";
import {
    INPUT_NODE_DEFAULT_RIGHT_X,
    MIN_VISIBLE_HEIGHT,
    isInputNode,
    isOutputNode
} from "./utils";
import { IO_NODE_DEFAULT_WIDTH, VISUALIZER_PADDING, defaultModelOptions } from "../utils/constants";

export interface PanAndZoomCanvasActionOptions {
    inverseZoom?: boolean;
}

export class IONodesScrollCanvasAction extends Action {
    constructor(options: PanAndZoomCanvasActionOptions = {}) {
        super({
            type: InputType.MOUSE_WHEEL,
            fire: (actionEvent: ActionEvent<any>) => {
                const { event } = actionEvent;
                const { clientX, deltaY } = event;
                const zoomOffset = 100 / defaultModelOptions.zoom;

                for (let layer of this.engine.getModel().getLayers()) {
                    layer.allowRepaint(false);
                }
                event.stopPropagation();

                const element = this.engine.getActionEventBus().getModelForEvent(actionEvent);

                let isInputScrollable = false;
                let isOutputScrollable = false;

                if (!element) {
                    // Scroll on empty space
                    const zoomOffset = 100 / defaultModelOptions.zoom;
                    const outputNodeDefaultLeftX =
                        ((window.innerWidth - VISUALIZER_PADDING) - IO_NODE_DEFAULT_WIDTH) * zoomOffset;
                    const scrolledX = clientX * zoomOffset;
                    if (scrolledX >= 0 && scrolledX <= INPUT_NODE_DEFAULT_RIGHT_X) {
                        isInputScrollable = true;
                    } else if (scrolledX >= outputNodeDefaultLeftX && scrolledX <= (window.innerWidth - VISUALIZER_PADDING) * zoomOffset) {
                        isOutputScrollable = true;
                    }
                } else {
                    isInputScrollable = isInputNode(element);
                    isOutputScrollable = isOutputNode(element);
                }

                let yDelta = (options.inverseZoom ? - deltaY : deltaY) as number;
                const diagramEngine = this.engine as DiagramEngine;

                if (isInputScrollable) {
                    handleInputScroll(diagramEngine, yDelta);
                } else if (isOutputScrollable) {
                    handleOutputScroll(diagramEngine, yDelta);
                } else {
                    handleInputScroll(diagramEngine, yDelta);
                    handleOutputScroll(diagramEngine, yDelta);
                }

                this.engine.repaintCanvas();

                // re-enable rendering
                for (let layer of this.engine.getModel().getLayers()) {
                    layer.allowRepaint(true);
                }
            },
        });
    }
}


function handleInputScroll(diagramEngine: DiagramEngine, yDelta: number) {
    const inputNodes = getInputNodes(diagramEngine);
    const totalHeight = inputNodes.reduce((acc, node) => acc + node.height, 0);
    const averageHeight = totalHeight / inputNodes.length;
    let scrollStep = Math.min(Math.abs(yDelta), averageHeight / 2) * Math.sign(yDelta);

    const firstNode = inputNodes[0];
    const lastNode = inputNodes[inputNodes.length - 1];

    if (firstNode) {
        const newY = firstNode.getY() - scrollStep;
        if (newY >= 0 && scrollStep < 0) {
            // If the first node is at the top of the canvas, do not scroll further
            scrollStep = firstNode.getY();
        }
    }

    if (lastNode) {
        const newY = lastNode.getY() - scrollStep;
        const nodeBottomY = newY + lastNode.height;
        if (nodeBottomY < MIN_VISIBLE_HEIGHT) {
            // If the last node is at the bottom of the canvas, do not scroll further
            scrollStep = lastNode.getY() + lastNode.height - MIN_VISIBLE_HEIGHT;
        }
    }

    inputNodes.forEach(element => {
        element.setPosition(element.getX(), element.getY() - scrollStep);
    });

}

function handleOutputScroll(diagramEngine: DiagramEngine, yDelta: number) {
    const outputNode = getOutputNode(diagramEngine);
    if (outputNode) {
        let scrollStep = Math.min(Math.abs(yDelta), outputNode.height / 2) * Math.sign(yDelta);
        let newY = outputNode.getY() - scrollStep;
        const nodeBottomY = newY + outputNode.height;
        if (newY >= 0 && scrollStep < 0) {
            // If the output node is at the top of the canvas, do not scroll further
            scrollStep = outputNode.getY();
        }
        if (nodeBottomY < MIN_VISIBLE_HEIGHT) {
            // If the output node is at the bottom of the canvas, do not scroll further
            scrollStep = outputNode.getY() + outputNode.height - MIN_VISIBLE_HEIGHT;
        }
        outputNode.setPosition(outputNode.getX(), outputNode.getY() - scrollStep);
    }
    outputNode && repositionIntermediateNodes(outputNode);
}

function getInputNodes(diagramEngine: DiagramEngine) {
    return diagramEngine.getModel().getNodes().filter(node => isInputNode(node));
}

function getOutputNode(diagramEngine: DiagramEngine) {
    return diagramEngine.getModel().getNodes().filter(node => isOutputNode(node))[0];
}

function repositionIntermediateNodes(outputNode: NodeModel) {
    const ports = outputNode.getPorts();
    for (const port of Object.values(ports)) {
        if (port instanceof RecordFieldPortModel) {
            // Output port can only have one link, hence the first link is considered
            const link = Object.values(port.getLinks())[0];
            if (link instanceof DataMapperLinkModel) {
                const sourceNode = link.getSourcePort().getNode();
                const targetPortPosition = link.getTargetPort().getPosition();
                if (sourceNode instanceof LinkConnectorNode || sourceNode instanceof QueryExpressionNode) {
                    sourceNode.setPosition(sourceNode.getX(), targetPortPosition.y - 4.5);
                }
            }
        }
    }
}
