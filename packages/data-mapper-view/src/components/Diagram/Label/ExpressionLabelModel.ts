import { BaseModelOptions, DeserializeEvent } from '@projectstorm/react-canvas-core';
import { LabelModel } from '@projectstorm/react-diagrams';
import { NodePosition, STNode } from '@wso2/syntax-tree';

import { IDataMapperContext } from '../../../utils/DataMapperContext/DataMapperContext';
import { DataMapperLinkModel } from '../Link';
import { MappingType, RecordFieldPortModel } from '../Port';

export interface ExpressionLabelOptions extends BaseModelOptions {
	value?: string;
	valueNode?: STNode;
	context?: IDataMapperContext;
	link?: DataMapperLinkModel;
	field?: STNode;
	editorLabel?: string;
	isSubLinkLabel?: boolean;
	deleteLink?: () => void;
}

export class ExpressionLabelModel extends LabelModel {
	value?: string;
	valueNode?: STNode;
	context: IDataMapperContext;
	link?: DataMapperLinkModel;
	field?: STNode;
	editorLabel?: string;
	pendingMappingType?: MappingType;
	isSubLinkLabel?: boolean;
	deleteLink?: () => void;

	constructor(options: ExpressionLabelOptions = {}) {
		super({
			...options,
			type: 'expression-label'
		});
		this.value = options.value || '';
		this.valueNode = options.valueNode;
		this.context = options.context;
		this.link = options.link;
		this.field = options.field;
		this.editorLabel = options.editorLabel;
		this.isSubLinkLabel = options.isSubLinkLabel;
		this.updateSource = this.updateSource.bind(this);
		this.deleteLink = options.deleteLink;
	}

	serialize() {
		return {
			...super.serialize(),
			value: this.value
		};
	}

	deserialize(event: DeserializeEvent<this>): void {
		super.deserialize(event);
		this.value = event.data.value;
	}

	updateSource(): void {
		const valueNodePosition = this.valueNode.position as NodePosition;
		const modifications = [
			{
				type: "INSERT",
				config: {
					"STATEMENT": this.value,
				},
				endColumn: valueNodePosition.endColumn,
				endLine: valueNodePosition.endLine,
				startColumn: valueNodePosition.startColumn,
				startLine: valueNodePosition.startLine
			}
		];
		void this.context.applyModifications(modifications);
	}

	setPendingMappingType(mappingType: MappingType): void {
		const sourcePort = this.link?.getSourcePort();
		const targetPort = this.link?.getTargetPort();

		this.pendingMappingType = mappingType;

		if (sourcePort instanceof RecordFieldPortModel && targetPort instanceof RecordFieldPortModel) {
			sourcePort.setPendingMappingType(mappingType);
			targetPort.setPendingMappingType(mappingType);
		}
	}
}
