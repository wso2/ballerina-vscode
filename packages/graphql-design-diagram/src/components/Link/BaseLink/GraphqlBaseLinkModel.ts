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

// tslint:disable: no-implicit-dependencies jsx-no-multiline-js
import { BezierCurve, Point } from "@projectstorm/geometry";
import { DefaultLinkModel, DiagramEngine, PortModelAlignment } from "@projectstorm/react-diagrams";
import { debounce } from "lodash";

import { getOpposingPort } from "./utils";

export class GraphqlBaseLinkModel extends DefaultLinkModel {
    diagramEngine: DiagramEngine;

    constructor(type: string) {
        super({
            type
        });
    }

    initLinks = (diagramEngine: DiagramEngine) => {
        this.diagramEngine = diagramEngine;
        this.getSourcePort().registerListener({
            positionChanged: () => this.onPositionChange()
        });

        this.getTargetPort().registerListener({
            positionChanged: () => this.onPositionChange()
        });
    };

    selectLinkedNodes = () => {
        this.getSourcePort().getNode().fireEvent({ entity: this }, 'SELECT');
        this.getTargetPort().getNode().fireEvent({ entity: this }, 'SELECT');
    };

    resetLinkedNodes = () => {
        this.getSourcePort().getNode().fireEvent({}, 'UNSELECT');
        this.getTargetPort().getNode().fireEvent({}, 'UNSELECT');
    };

    getCurvePath = (): string => {
        const lineCurve = new BezierCurve();

        if (this.getSourcePort() && this.getTargetPort()) {
            const markerSpace: number = this.getType() === 'entityLink' ? 125 : 70;

            lineCurve.setSource(this.getSourcePort().getPosition());
            lineCurve.setTarget(this.getTargetPort().getPosition());

            // With a leeway space for the marker
            const sourcePoint: Point = this.getSourcePort().getPosition().clone();
            const targetPoint: Point = this.getTargetPort().getPosition().clone();

            if (this.getTargetPort().getOptions().alignment === PortModelAlignment.LEFT) {
                targetPoint.x = targetPoint.x - markerSpace;
            } else if (this.getTargetPort().getOptions().alignment === PortModelAlignment.RIGHT) {
                targetPoint.x = targetPoint.x + markerSpace;
            } else {
                targetPoint.y = targetPoint.y + 150;
            }

            if (this.getSourcePort().getOptions().alignment === PortModelAlignment.LEFT) {
                sourcePoint.x = sourcePoint.x - markerSpace;
            } else if (this.getSourcePort().getOptions().alignment === PortModelAlignment.RIGHT) {
                sourcePoint.x = sourcePoint.x + markerSpace;
            } else {
                sourcePoint.y = sourcePoint.y - 90;
            }

            lineCurve.setSourceControl(sourcePoint);
            lineCurve.setTargetControl(targetPoint);
            lineCurve.getSourceControl().translate(...this.calculateControlOffset(this.getSourcePort()));
            lineCurve.getTargetControl().translate(...this.calculateControlOffset(this.getTargetPort()));
        }

        return lineCurve.getSVGCurve();
    };

    onPositionChange = debounce(() => {
        if (this.getSourcePort() && this.getTargetPort()) {
            const { sourceLeft, sourceRight, targetLeft, targetRight } = this.getPortPositions();

            if (sourceLeft <= targetLeft) {
                if (sourceRight <= targetLeft) {
                    this.checkPorts(PortModelAlignment.RIGHT, PortModelAlignment.LEFT);
                } else if (targetRight <= sourceRight) {
                    this.checkPorts(PortModelAlignment.RIGHT, PortModelAlignment.RIGHT);
                } else {
                    this.checkPorts(PortModelAlignment.LEFT, PortModelAlignment.LEFT);
                }
            } else {
                if (targetRight <= sourceLeft) {
                    this.checkPorts(PortModelAlignment.LEFT, PortModelAlignment.RIGHT);
                } else {
                    this.checkPorts(PortModelAlignment.LEFT, PortModelAlignment.LEFT);
                }
            }
        }
    }, 500);

    getPortPositions = () => {
        let sourceLeft: number;
        let sourceRight: number;
        let targetLeft: number;
        let targetRight: number;

        if (this.getSourcePort().getOptions().alignment === PortModelAlignment.LEFT) {
            sourceLeft = this.getSourcePort().getPosition().x;
            sourceRight = sourceLeft + this.getSourcePort().getNode().width;
        } else {
            sourceRight = this.getSourcePort().getPosition().x;
            sourceLeft = sourceRight - this.getSourcePort().getNode().width;
        }

        if (this.getTargetPort().getOptions().alignment === PortModelAlignment.LEFT) {
            targetLeft = this.getTargetPort().getPosition().x;
            targetRight = targetLeft + this.getTargetPort().getNode().width;
        } else {
            targetRight = this.getTargetPort().getPosition().x;
            targetLeft = targetRight - this.getTargetPort().getNode().width;
        }

        return { sourceLeft, sourceRight, targetLeft, targetRight };
    };

    checkPorts = (source: PortModelAlignment, target: PortModelAlignment) => {
        if (!this.getSourcePort().getID().startsWith(source)) {
            this.setSourcePort(this.getSourcePort().getNode().getPortFromID(getOpposingPort(this.getSourcePort().getID(), source)));
            this.diagramEngine.repaintCanvas();
        }

        if (!this.getTargetPort().getID().startsWith(target)) {
            this.setTargetPort(this.getTargetPort().getNode().getPortFromID(getOpposingPort(this.getTargetPort().getID(), target)));
            this.diagramEngine.repaintCanvas();
        }
    };

    getArrowHeadPoints = (): string => {
        let points: string;
        const targetPort: Point = this.getTargetPort().getPosition();

        if (this.getTargetPort().getOptions().alignment === PortModelAlignment.RIGHT) {
            points = `${targetPort.x + 8} ${targetPort.y}, ${targetPort.x + 16} ${targetPort.y + 8},
				${targetPort.x + 16} ${targetPort.y - 8}`;
        } else if (this.getTargetPort().getOptions().alignment === PortModelAlignment.LEFT) {
            points = `${targetPort.x - 2} ${targetPort.y}, ${targetPort.x - 12} ${targetPort.y + 8},
				${targetPort.x - 12} ${targetPort.y - 8}`;
        } else if (this.getTargetPort().getOptions().alignment === PortModelAlignment.BOTTOM) {
            points = `${targetPort.x} ${targetPort.y + 2}, ${targetPort.x + 12} ${targetPort.y + 14},
				${targetPort.x - 12} ${targetPort.y + 14}`;
        }
        return points;
    };
}
