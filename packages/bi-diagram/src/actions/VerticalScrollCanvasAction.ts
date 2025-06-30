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

export interface PanAndZoomCanvasActionOptions {
    inverseZoom?: boolean;
}

export class VerticalScrollCanvasAction extends Action {
    constructor(options: PanAndZoomCanvasActionOptions = {}) {
        super({
            type: InputType.MOUSE_WHEEL,
            fire: (actionEvent: ActionEvent<any>) => {
                const { event } = actionEvent;
                for (let layer of this.engine.getModel().getLayers()) {
                    layer.allowRepaint(false);
                }

                const model = this.engine.getModel();
                event.stopPropagation();
                if (event.ctrlKey) {
                    // Pinch and zoom gesture
                    const oldZoomFactor = this.engine.getModel().getZoomLevel() / 100;

                    let scrollDelta = options.inverseZoom ? event.deltaY : -event.deltaY;
                    scrollDelta /= 3;

                    if (model.getZoomLevel() + scrollDelta > 10) {
                        model.setZoomLevel(model.getZoomLevel() + scrollDelta);
                    }

                    const zoomFactor = model.getZoomLevel() / 100;

                    const boundingRect = event.currentTarget.getBoundingClientRect();
                    const clientWidth = boundingRect.width;
                    const clientHeight = boundingRect.height;
                    // compute difference between rect before and after scroll
                    const widthDiff = clientWidth * zoomFactor - clientWidth * oldZoomFactor;
                    const heightDiff = clientHeight * zoomFactor - clientHeight * oldZoomFactor;
                    // compute mouse coords relative to canvas
                    const clientX = event.clientX - boundingRect.left;
                    const clientY = event.clientY - boundingRect.top;

                    // compute width and height increment factor
                    const xFactor = (clientX - model.getOffsetX()) / oldZoomFactor / clientWidth;
                    const yFactor = (clientY - model.getOffsetY()) / oldZoomFactor / clientHeight;

                    model.setOffset(
                        model.getOffsetX() - widthDiff * xFactor,
                        model.getOffsetY() - heightDiff * yFactor
                    );
                } else {
                    // vertical scroll
                    const xDelta = Math.abs(event.deltaX);
                    const yDelta = Math.abs(event.deltaY);

                    if (yDelta < xDelta && xDelta > 8) {
                        const horizontalDelta = options.inverseZoom ? -event.deltaX : event.deltaX;
                        const offsetX = model.getOffsetX() - horizontalDelta;
                        model.setOffset(offsetX, model.getOffsetY());
                    } else {
                        const verticalDelta = options.inverseZoom ? -event.deltaY : event.deltaY;
                        const offsetY = model.getOffsetY() - verticalDelta;
                        model.setOffset(model.getOffsetX(), offsetY);
                    }
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
