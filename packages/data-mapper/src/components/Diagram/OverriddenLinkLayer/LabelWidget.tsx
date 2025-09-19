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
import * as React from 'react';

import styled from '@emotion/styled';
import { DiagramEngine, LabelModel } from '@projectstorm/react-diagrams';

import { LinkOveryPortal } from './LinkOverlayPortal';

export interface LabelWidgetProps {
	engine: DiagramEngine;
	label: LabelModel;
	index: number;
}

export const Label = styled.div`
	display: inline-block;
	position: absolute;
`;

export const Foreign = styled.foreignObject`
	pointer-events: none;
	overflow: visible;
	&:focus {
		outline: none;
	}
`;


export class OveriddenLabelWidget extends React.Component<LabelWidgetProps> {
	ref: React.RefObject<HTMLDivElement>;

	constructor(props: LabelWidgetProps) {
		super(props);
		this.ref = React.createRef();
	}

	componentDidUpdate() {
		window.requestAnimationFrame(this.calculateLabelPosition);
	}

	componentDidMount() {
		window.requestAnimationFrame(this.calculateLabelPosition);
	}

	findPathAndRelativePositionToRenderLabel = (index: number): { path: SVGPathElement; position: number } => {
		// an array to hold all path lengths, making sure we hit the DOM only once to fetch this information
		const link = this.props.label.getParent();
		const lengths = link.getRenderedPath().map((path) => path.getTotalLength());

		// calculate the point where we want to display the label
		let labelPosition =
			lengths.reduce((previousValue, currentValue) => previousValue + currentValue, 0) *
			(index / (link.getLabels().length + 1));

		// find the path where the label will be rendered and calculate the relative position
		let pathIndex = 0;
		while (pathIndex < link.getRenderedPath().length) {
			if (labelPosition - lengths[pathIndex] < 0) {
				return {
					path: link.getRenderedPath()[pathIndex],
					position: labelPosition
				};
			}

			// keep searching
			labelPosition -= lengths[pathIndex];
			pathIndex++;
		}
	};

	calculateLabelPosition = () => {
		const found = this.findPathAndRelativePositionToRenderLabel(this.props.index + 1);
		if (!found) {
			return;
		}

		const { path, position } = found;

		const labelDimensions = {
			width: this.ref.current.offsetWidth,
			height: this.ref.current.offsetHeight
		};

		const pathCentre = path.getPointAtLength(position);

		const labelCoordinates = {
			x: pathCentre.x - labelDimensions.width / 2 + this.props.label.getOptions().offsetX,
			y: pathCentre.y - labelDimensions.height / 2 + this.props.label.getOptions().offsetY
		};

		this.ref.current.style.transform = `translate(${labelCoordinates.x}px, ${labelCoordinates.y}px)`;
	};

	render() {
		const canvas = this.props.engine.getCanvas();

		return (
			<LinkOveryPortal>
				<Foreign key={this.props.label.getID()} width={canvas?.offsetWidth} height={canvas?.offsetHeight}>
				<Label ref={this.ref}>
					{this.props.engine.getFactoryForLabel(this.props.label).generateReactWidget({ model: this.props.label })}
				</Label>
				</Foreign>
			</LinkOveryPortal>
		);
	}
}
