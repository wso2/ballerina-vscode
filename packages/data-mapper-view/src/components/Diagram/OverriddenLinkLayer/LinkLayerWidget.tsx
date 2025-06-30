// tslint:disable: jsx-no-multiline-js no-implicit-dependencies
import * as React from 'react';

import styled from '@emotion/styled';
import { LinkLayerWidgetProps } from '@projectstorm/react-diagrams';
import * as _ from 'lodash';

import { LinkOverayContainerID } from './LinkOverlayPortal';
import { OveriddenLinkWidget } from './LinkWidget';

export class OveriddenLinkLayerWidget extends React.Component<LinkLayerWidgetProps> {
	render() {
		return (
			<>
				{
					// only perform these actions when we have a diagram
					_.map(this.props.layer.getLinks(), (link) => {
						return <OveriddenLinkWidget key={link.getID()} link={link} diagramEngine={this.props.engine} />;
					})
				}
				<LinkOverlayContainer id={LinkOverayContainerID} />
			</>
		);
	}
}


const LinkOverlayContainer = styled.g`
	pointer-events: none;
	&:focus {
		outline: none;
	}
`;
