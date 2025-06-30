import * as React from 'react';

import { GenerateWidgetEvent } from '@projectstorm/react-canvas-core';
import { LinkLayerFactory, LinkLayerModel } from '@projectstorm/react-diagrams';

import { OveriddenLinkLayerWidget } from './LinkLayerWidget';

export class OverriddenLinkLayerFactory extends LinkLayerFactory {

	generateReactWidget(event: GenerateWidgetEvent<LinkLayerModel>): JSX.Element {
		return <OveriddenLinkLayerWidget layer={event.model} engine={this.engine} />;
	}
}
