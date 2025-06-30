import { LinkModel, PortModel, PortModelGenerics } from '@projectstorm/react-diagrams';

import { DataMapperLinkModel } from '../../Link/model/DataMapperLink';

export interface IntermediateNodeModelGenerics {
	PORT: IntermediatePortModel;
}
export const INT_PORT_TYPE_ID = "datamapper-intermediate-port";

export class IntermediatePortModel extends PortModel<PortModelGenerics & IntermediateNodeModelGenerics> {

	constructor(
		public portId: string,
		public portType: "IN" | "OUT") {
		super({
			type: INT_PORT_TYPE_ID,
			name: portId,
		});
	}

	createLinkModel(): LinkModel {
		const lm = new DataMapperLinkModel();
		return lm;
	}

	canLinkToPort(port: IntermediatePortModel): boolean {
		return this.portType !== port.portType;
	}
}

