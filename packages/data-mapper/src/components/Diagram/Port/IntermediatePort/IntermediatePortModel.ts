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
import { LinkModel, PortModel, PortModelGenerics } from '@projectstorm/react-diagrams';

import { DataMapperLinkModel } from '../../Link/DataMapperLink/DataMapperLink';

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

