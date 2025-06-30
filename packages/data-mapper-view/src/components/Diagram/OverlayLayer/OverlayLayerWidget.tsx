// tslint:disable: jsx-no-multiline-js no-implicit-dependencies
import * as React from 'react';

import styled from '@emotion/styled';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import * as _ from 'lodash';

import { OverlayLayerModel } from './OverlayLayerModel';
import { OverlayModel } from './OverlayModel/OverlayModel';
import { OverlayWidget } from './OverlayModel/OverlayWidget';

export interface NodeLayerWidgetProps {
	layer: OverlayLayerModel;
	engine: DiagramEngine;
}

export const OverlayContainerID = "data-mapper-overlay-container";

export class OverlayLayerWidget extends React.Component<NodeLayerWidgetProps> {
	render() {
		return (
			<Container id={OverlayContainerID}>
				{_.map(this.props.layer.getOverlayItems(), (node: OverlayModel) => {
					return <OverlayWidget key={node.getID()} diagramEngine={this.props.engine} node={node} />;
				})}
			</Container>
		);
	}
}

export const Container = styled.div``;
