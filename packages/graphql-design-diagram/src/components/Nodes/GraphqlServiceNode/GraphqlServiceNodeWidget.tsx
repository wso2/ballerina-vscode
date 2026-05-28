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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda sx-wrap-multiline
import React from "react";

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { NodeContainer } from "../../resources/styles/styles";

import { FunctionCard } from "./FunctionCards/FunctionCard";
import { GraphqlServiceNodeModel } from "./GraphqlServiceNodeModel";
import { ServiceHeadWidget } from "./ServiceHead/ServiceHead";

interface ServiceNodeWidgetProps {
    node: GraphqlServiceNodeModel;
    engine: DiagramEngine;
}

export function GraphqlServiceNodeWidget(props: ServiceNodeWidgetProps) {
    const { node, engine } = props;

    return (
        <NodeContainer data-testid={`graphql-root-node-${node.serviceObject.serviceName ? node.serviceObject.serviceName : "/root"}`}>
            <ServiceHeadWidget
                engine={engine}
                node={node}
            />
            {
                node.serviceObject.resourceFunctions?.map((resource, index) => {
                    return (
                        <FunctionCard
                            key={index}
                            engine={engine}
                            node={node}
                            functionElement={resource}
                            isResourceFunction={true}
                            isSubscription={resource.subscription}
                        />
                    );
                })
            }
            {
                node.serviceObject.remoteFunctions?.map((remoteFunc, index) => {
                    return (
                        <FunctionCard
                            key={index}
                            engine={engine}
                            node={node}
                            functionElement={remoteFunc}
                            isResourceFunction={false}
                        />
                    );
                })
            }
        </NodeContainer>
    );
}
