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
import { Point, Rectangle } from '@projectstorm/geometry';
import {
	BaseEntityEvent,
	BaseModelListener,
	BasePositionModel,
	BasePositionModelGenerics,
} from '@projectstorm/react-canvas-core';
import { DiagramModel } from '@projectstorm/react-diagrams';

export interface OverlayModelListener extends BaseModelListener {
	positionChanged?(event: BaseEntityEvent<OverlayModel>): void;
}

export interface OverlayModelGenerics extends BasePositionModelGenerics {
	LISTENER: OverlayModelListener;
	PARENT: DiagramModel;
}

export class OverlayModel<G extends OverlayModelGenerics = OverlayModelGenerics> extends BasePositionModel<G> {

	// calculated post rendering so routing can be done correctly
	width: number;
	height: number;

	constructor(options: G['OPTIONS']) {
		super(options);
		this.width = 0;
		this.height = 0;
	}

	getBoundingBox(): Rectangle {
		return new Rectangle(this.getPosition(), this.width, this.height);
	}

	setPosition(point: Point): void;
	setPosition(x: number, y: number): void;
	setPosition(x: number | Point, y?: number): void {
		if (x instanceof Point) {
			super.setPosition(x);
		} else {
			super.setPosition(x, y);
		}
	}

	updateDimensions({ width, height }: { width: number; height: number }) {
		this.width = width;
		this.height = height;
	}
}
