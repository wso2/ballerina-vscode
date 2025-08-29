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

import { AbstractReactFactory } from "@projectstorm/react-canvas-core";
import { DataImportNodeModel } from "./DataImportNode";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { DATA_IMPORT_NODE } from "./DataImportNode";
import { DataImportNodeWidget } from "./DataImportNodeWidget";

export class DataImportNodeFactory extends AbstractReactFactory<DataImportNodeModel, DiagramEngine> {
    constructor() {
        super(DATA_IMPORT_NODE);
    }

    generateReactWidget(event: { model: DataImportNodeModel; }): JSX.Element {
        return (
            <DataImportNodeWidget configName={event.model.configName} ioType={event.model.ioType}/>
        );
    }

    generateModel(): DataImportNodeModel {
        return new DataImportNodeModel();
    }
}
