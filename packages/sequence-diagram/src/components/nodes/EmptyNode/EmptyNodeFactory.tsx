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

import React from "react";
import { AbstractReactFactory, GenerateModelEvent, GenerateWidgetEvent } from "@projectstorm/react-canvas-core";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { EmptyNodeModel } from "./EmptyNodeModel";
import { EmptyNodeWidget } from "./EmptyNodeWidget";
import { NodeTypes } from "../../../resources/constants";

export class EmptyNodeFactory extends AbstractReactFactory<EmptyNodeModel, DiagramEngine> {
    constructor() {
        super(NodeTypes.EMPTY_NODE);
    }

    generateModel(event: GenerateModelEvent): EmptyNodeModel {
        return new EmptyNodeModel(event.initialConfig);
    }

    generateReactWidget(event: GenerateWidgetEvent<EmptyNodeModel>) {
        return <EmptyNodeWidget engine={this.engine} node={event.model} />;
    }
}
