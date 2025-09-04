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

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';

import { InputOutputPortModel } from '../../Port';
import { InputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { SubMappingNode, SUB_MAPPING_SOURCE_NODE_TYPE } from "./SubMappingNode";
import { SubMappingTreeWidget } from "./SubMappingTreeWidget";

export class SubMappingNodeFactory extends AbstractReactFactory<SubMappingNode, DiagramEngine> {
    constructor() {
        super(SUB_MAPPING_SOURCE_NODE_TYPE);
    }

    generateReactWidget(event: { model: SubMappingNode; }): JSX.Element {
        return (
            <>
                {event.model.hasNoMatchingFields ? (
                    <InputSearchNoResultFound kind={SearchNoResultFoundKind.SubMapping} />
                ) : (
                    <SubMappingTreeWidget
                        engine={this.engine}
                        subMappings={event.model.subMappings}
                        context={event.model.context}
                        getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
                    />
                )}
            </>
        );
    }

    generateModel(): SubMappingNode {
        return undefined;
    }
}
