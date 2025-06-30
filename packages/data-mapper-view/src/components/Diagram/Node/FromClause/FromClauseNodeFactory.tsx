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
// tslint:disable: jsx-no-lambda  jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from "../../Port";
import { EXPANDED_QUERY_SOURCE_PORT_PREFIX } from '../../utils/constants';
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';
import { RecordTypeTreeWidget } from '../commons/RecordTypeTreeWidget/RecordTypeTreeWidget';

import {
    FromClauseNode,
    QUERY_EXPR_SOURCE_NODE_TYPE
} from './FromClauseNode';
import { InputSearchNoResultFound, SearchNoResultFoundKind } from '../commons/Search';

@injectable()
@singleton()
export class FromClauseNodeFactory extends AbstractReactFactory<FromClauseNode, DiagramEngine> implements IDataMapperNodeFactory {
    constructor() {
        super(QUERY_EXPR_SOURCE_NODE_TYPE);
    }

    generateReactWidget(event: { model: FromClauseNode; }): JSX.Element {
        if (event.model.hasNoMatchingFields) {
            return (
                <InputSearchNoResultFound kind={SearchNoResultFoundKind.InputField} />
            );
        }
        return (
            <RecordTypeTreeWidget
                engine={this.engine}
                id={`${EXPANDED_QUERY_SOURCE_PORT_PREFIX}.${event.model.nodeLabel}`}
                typeDesc={event.model.typeDef}
                getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
                handleCollapse={(fieldName: string, expand?: boolean) => event.model.context.handleCollapse(fieldName, expand)}
                valueLabel={event.model.nodeLabel}
                hasLinkViaCollectClause={event.model.mappedWithCollectClause}
            />
        );
    }

    generateModel(): FromClauseNode {
        return undefined;
    }
}

container.register("NodeFactory", {useClass: FromClauseNodeFactory});
