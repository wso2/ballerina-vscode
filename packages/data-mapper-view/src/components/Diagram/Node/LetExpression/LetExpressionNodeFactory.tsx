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
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from '../../Port';
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';
import { InputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { LetExpressionNode, LET_EXPR_SOURCE_NODE_TYPE } from "./LetExpressionNode";
import { LetExpressionTreeWidget } from "./LetExpressionTreeWidget";

@injectable()
@singleton()
export class LetExpressionNodeFactory extends AbstractReactFactory<LetExpressionNode, DiagramEngine> implements IDataMapperNodeFactory {
    constructor() {
        super(LET_EXPR_SOURCE_NODE_TYPE);
    }

    generateReactWidget(event: { model: LetExpressionNode; }): JSX.Element {
        return (
            <>
                {event.model.hasNoMatchingFields ? (
                    <InputSearchNoResultFound kind={SearchNoResultFoundKind.LocalVariable} />
                ) : (
                    <LetExpressionTreeWidget
                        engine={this.engine}
                        letVarDecls={event.model.letVarDecls}
                        context={event.model.context}
                        getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
                        handleCollapse={(fieldName: string, expand?: boolean) => event.model.context.handleCollapse(fieldName, expand)}
                        isWithinQuery={event.model.isWithinQuery}
                    />
                )}
            </>
        );
    }

    generateModel(): LetExpressionNode {
        return undefined;
    }
}

container.register("NodeFactory", { useClass: LetExpressionNodeFactory });
