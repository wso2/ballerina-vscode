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
