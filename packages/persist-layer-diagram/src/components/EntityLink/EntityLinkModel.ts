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

import { CMCardinality as Cardinality } from '@wso2/ballerina-core';
import { SharedLinkModel } from '../shared-link/shared-link';

interface LinkOrigins {
	nodeId: string;
	attributeId: string;
}

export class EntityLinkModel extends SharedLinkModel {
	readonly cardinality: Cardinality;
	sourceNode: LinkOrigins;
	targetNode: LinkOrigins;

	constructor(id: string, cardinality: Cardinality) {
		super(id, 'entityLink');
		this.cardinality = cardinality;
	}

	setSourceNode(nodeId: string, attributeId: string = '') {
		this.sourceNode = { nodeId, attributeId };
	}
	
	setTargetNode(nodeId: string, attributeId: string = '') {
		this.targetNode = { nodeId, attributeId };
	}
}
