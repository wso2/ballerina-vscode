// tslint:disable: no-implicit-dependencies jsx-no-multiline-js
import * as React from 'react';

import { PeformanceWidget } from '@projectstorm/react-canvas-core';
import { LinkProps, LinkWidget } from '@projectstorm/react-diagrams';
import * as _ from 'lodash';

import { OveriddenLabelWidget } from './LabelWidget';


export class OveriddenLinkWidget extends LinkWidget {

	constructor(props: LinkProps) {
		super(props);
	}


	render() {
		const { link } = this.props;

		// only draw the link when we have reported positions
		if (link.getSourcePort() && !link.getSourcePort().reportedPosition) {
			return null;
		}
		if (link.getTargetPort() && !link.getTargetPort().reportedPosition) {
			return null;
		}

		// generate links
		return (
			<PeformanceWidget model={this.props.link} serialized={this.props.link.serialize()}>
				{() => {
					return (
						<g data-linkid={this.props.link.getID()}>
							{this.props.diagramEngine.generateWidgetForLink(link)}
							{_.map(this.props.link.getLabels(), (labelModel, index) => {
								return (
									<OveriddenLabelWidget
										key={labelModel.getID()}
										engine={this.props.diagramEngine}
										label={labelModel}
										index={index}
									/>
								);
							})}
						</g>
					);
				}}
			</PeformanceWidget>
		);
	}
}
