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
		const canvas = this.props.engine.getCanvas();
		
		// Get canvas boundaries
		const canvasWidth = canvas?.offsetWidth || 0;
		const canvasHeight = canvas?.offsetHeight || 0;

		// Calculate initial centered position
		let x = pathCentre.x - labelDimensions.width / 2 + this.props.label.getOptions().offsetX;
		let y = pathCentre.y - labelDimensions.height / 2 + this.props.label.getOptions().offsetY;

		// Apply boundary constraints to keep label fully visible
		// Ensure label doesn't go off the left edge
		if (x < 0) {
			x = 0;
		}
		// Ensure label doesn't go off the right edge
		if (x + labelDimensions.width > canvasWidth) {
			x = canvasWidth - labelDimensions.width;
		}
		// Ensure label doesn't go off the top edge
		if (y < 0) {
			y = 0;
		}
		// Ensure label doesn't go off the bottom edge
		if (y + labelDimensions.height > canvasHeight) {
			y = canvasHeight - labelDimensions.height;
		}

		const labelCoordinates = { x, y };

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
