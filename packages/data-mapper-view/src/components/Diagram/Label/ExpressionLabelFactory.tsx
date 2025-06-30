import * as React from 'react';

import { AbstractReactFactory, GenerateWidgetEvent } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { container, injectable, singleton } from 'tsyringe';

import { ExpressionLabelModel } from './ExpressionLabelModel';
import { EditableLabelWidget } from './ExpressionLabelWidget';
import { MappingType } from '../Port';
import { ArrayMappingOptionsWidget } from './ArrayMappingOptionsWidget';
import { SubLinkLabelWidget } from './SubLinkLabelWidget';
import { IncompatibleMappingOprionsWidget } from './IncompatibleMappingOprionsWidget';

@injectable()
@singleton()
export class ExpressionLabelFactory extends AbstractReactFactory<ExpressionLabelModel, DiagramEngine> {
	constructor() {
		super('expression-label');
	}

	generateModel(): ExpressionLabelModel {
		return new ExpressionLabelModel();
	}

	generateReactWidget(event: GenerateWidgetEvent<ExpressionLabelModel>): JSX.Element {
		const { pendingMappingType, isSubLinkLabel } = event.model;

		if (pendingMappingType == MappingType.ArrayToArray || pendingMappingType == MappingType.ArrayToSingleton) {
			return <ArrayMappingOptionsWidget model={event.model}/>;
		} else if (pendingMappingType === MappingType.RecordToRecord || pendingMappingType === MappingType.UnionToAny) {
			return <IncompatibleMappingOprionsWidget model={event.model} />;
		}

		if (isSubLinkLabel) {
			return <SubLinkLabelWidget model={event.model}  />;
		}

		return <EditableLabelWidget model={event.model} />;
	}
}
container.register("LabelFactory", {useClass: ExpressionLabelFactory});
