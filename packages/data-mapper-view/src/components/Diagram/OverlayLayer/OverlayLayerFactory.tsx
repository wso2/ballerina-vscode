import * as React from 'react';

import { AbstractReactFactory, GenerateWidgetEvent } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams';

import { OverlayLayerModel } from './OverlayLayerModel';
import { OverlayLayerWidget } from './OverlayLayerWidget';

export class OverlayLayerFactory extends AbstractReactFactory<OverlayLayerModel, DiagramEngine> {
	constructor() {
		super('diagram-overlays');
	}

	generateModel(): OverlayLayerModel {
		return new OverlayLayerModel();
	}

	generateReactWidget(event: GenerateWidgetEvent<OverlayLayerModel>): JSX.Element {
		return <OverlayLayerWidget layer={event.model} engine={this.engine} />;
	}
}
