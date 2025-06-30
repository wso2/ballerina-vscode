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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { PrimitiveBalType } from "@wso2/ballerina-core";
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from "../../Port";
import { EXPANDED_QUERY_SOURCE_PORT_PREFIX } from '../../utils/constants';
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';
import { PrimitiveTypeItemWidget } from '../commons/PrimitiveTypeItemWidget';
import { RecordTypeTreeWidget } from '../commons/RecordTypeTreeWidget/RecordTypeTreeWidget';

import {
    JoinClauseNode,
    QUERY_EXPR_JOIN_NODE_TYPE
} from './JoinClauseNode';

@injectable()
@singleton()
export class JoinClauseNodeFactory extends AbstractReactFactory<JoinClauseNode, DiagramEngine> implements IDataMapperNodeFactory {
    constructor() {
        super(QUERY_EXPR_JOIN_NODE_TYPE);
    }

    generateReactWidget(event: { model: JoinClauseNode; }): JSX.Element {
        const id = `${EXPANDED_QUERY_SOURCE_PORT_PREFIX}.${event.model.sourceBindingPattern.variableName.value}`;

        const props = {
            id,
            engine: this.engine,
            typeDesc: event.model.typeDef,
            getPort: (portId: string) => event.model.getPort(portId) as RecordFieldPortModel,
            valueLabel: event.model.sourceBindingPattern.variableName.value,
            nodeHeaderSuffix: event.model.value.outerKeyword ? "Outer join" : "Join"
        }
        if ([PrimitiveBalType.Array, PrimitiveBalType.Record, PrimitiveBalType.Union].includes(event.model.typeDef.typeName as PrimitiveBalType)) {
            if (event.model.isOptional) {
                props.id = `${id}?`
            }
            return (
                <RecordTypeTreeWidget
                    {...props}
                    handleCollapse={(fieldName: string, expand?: boolean) => event.model.context.handleCollapse(fieldName, expand)}
                />
            );
        }

        return (
            <PrimitiveTypeItemWidget {...props} />
        )
    }

    generateModel(): JoinClauseNode {
        return undefined;
    }
}

container.register("NodeFactory", { useClass: JoinClauseNodeFactory });
