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
// tslint:disable: jsx-no-multiline-js
import * as React from "react";

import { AbstractReactFactory } from "@projectstorm/react-canvas-core";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { container, injectable, singleton } from "tsyringe";

import { IDataMapperNodeFactory } from "../commons/DataMapperNode";
import { InputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { EnumTypeNode, ENUM_TYPE_SOURCE_NODE_TYPE } from "./EnumTypeNode";
import { EnumTypeTreeWidget } from "./EnumTypeTreeWidget";

@injectable()
@singleton()
export class EnumTypeNodeFactory
    extends AbstractReactFactory<EnumTypeNode, DiagramEngine>
    implements IDataMapperNodeFactory
{
    constructor() {
        super(ENUM_TYPE_SOURCE_NODE_TYPE);
    }

    generateReactWidget(event: { model: EnumTypeNode }): JSX.Element {
        return (
            <>
                {event.model.hasNoMatchingFields ? (
                    <InputSearchNoResultFound kind={SearchNoResultFoundKind.ModuleVariable} />
                ) : (
                    <EnumTypeTreeWidget
                        engine={this.engine}
                        enums={event.model.enumTypeDecls}
                        context={event.model.context}
                        getPort={event.model.getPort.bind(event.model)}
                        handleCollapse={event.model.context.handleCollapse.bind(event.model)}
                    />
                )}
            </>
        );
    }

    generateModel(): EnumTypeNode {
        return undefined;
    }
}

container.register("NodeFactory", { useClass: EnumTypeNodeFactory });
