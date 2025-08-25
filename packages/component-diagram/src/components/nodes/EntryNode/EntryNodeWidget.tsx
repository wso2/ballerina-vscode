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
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { EntryNodeModel } from "./EntryNodeModel";
import { CDService } from "@wso2/ballerina-core";
import { AIServiceWidget } from "./components/AIServiceWidget";
import { GraphQLServiceWidget } from "./components/GraphQLServiceWidget";
import { GeneralServiceWidget } from "./components/GeneralWidget";

interface EntryNodeWidgetProps {
    model: EntryNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<EntryNodeWidgetProps, "children"> { }

export function EntryNodeWidget(props: EntryNodeWidgetProps) {
    const { model, engine } = props;

    // Determine which widget to render based on service type
    if ((model.node as CDService)?.type === "ai:Service") {
        return <AIServiceWidget model={model} engine={engine} />;
    }

    if ((model.node as CDService)?.type === "graphql:Service") {
        return <GraphQLServiceWidget model={model} engine={engine} />;
    }

    // Default to general service widget for all other cases
    return <GeneralServiceWidget model={model} engine={engine} />;
}

