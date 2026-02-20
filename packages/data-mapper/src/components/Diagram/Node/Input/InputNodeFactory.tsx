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
import React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { TypeKind } from '@wso2/ballerina-core';

import { InputOutputPortModel } from '../../Port';
import { InputNodeWidget } from "./InputNodeWidget";
import { InputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { InputNode, INPUT_NODE_TYPE } from './InputNode';
import { PrimitiveTypeInputWidget } from './PrimitiveTypeInputWidget';

export class InputNodeFactory extends AbstractReactFactory<InputNode, DiagramEngine> {
    constructor() {
        super(INPUT_NODE_TYPE);
    }

    generateReactWidget(event: { model: InputNode; }): JSX.Element {
        if (event.model.hasNoMatchingFields && !event.model.filteredInputType) {
            return (
                <InputSearchNoResultFound kind={SearchNoResultFoundKind.InputField} />
            );
        } else if (event.model.filteredInputType &&
                (event.model.filteredInputType.kind === TypeKind.Record ||
                    event.model.filteredInputType.kind === TypeKind.Array ||
                    event.model.filteredInputType.kind === TypeKind.Enum ||
                    event.model.filteredInputType.kind === TypeKind.Json ||
                    event.model.filteredInputType.kind === TypeKind.Xml
                )
            ) {
            return (
                <InputNodeWidget
                    engine={this.engine}
                    id={event.model.filteredInputType?.id}
                    dmType={event.model.filteredInputType}
                    getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
                    context={event.model.context}
                    focusedInputs={event.model.context.model.query ? event.model.context.model.query.inputs : []}
                />
            );
        }
        return (
            <PrimitiveTypeInputWidget
                engine={this.engine}
                id={event.model.filteredInputType?.id}
                dmType={event.model.filteredInputType}
                getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
                valueLabel={event.model.filteredInputType?.name}
            />
        )
    }

    generateModel(): InputNode {
        return undefined;
    }
}
