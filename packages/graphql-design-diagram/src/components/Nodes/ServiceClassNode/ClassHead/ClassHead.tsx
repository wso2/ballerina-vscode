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

import React, { useEffect, useRef } from "react";

import { DiagramEngine, PortModel } from "@projectstorm/react-diagrams";

import { CtrlClickHandler } from "../../../CtrlClickHandler";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { ServiceClassIcon } from "../../../resources/assets/icons/ServiceClassIcon";
import { HeaderName, NodeHeader } from "../../../resources/styles/styles";
import { getFormattedPosition } from "../../../utils/common-util";
import { ServiceClassNodeModel } from "../ServiceClassNodeModel";

import { ClassHeaderMenu } from "./ClassHeaderMenu";

interface ServiceClassHeadProps {
    engine: DiagramEngine;
    node: ServiceClassNodeModel;
}

export function ServiceClassHeadWidget(props: ServiceClassHeadProps) {
    const { engine, node } = props;
    const headPorts = useRef<PortModel[]>([]);

    const displayName: string = node.classObject.serviceName;

    useEffect(() => {
        headPorts.current.push(node.getPortFromID(`left-${node.getID()}`));
        headPorts.current.push(node.getPortFromID(`right-${node.getID()}`));
    }, [node]);

    return (
        <CtrlClickHandler
            filePath={node.classObject?.position?.filePath}
            position={node.classObject?.position && getFormattedPosition(node.classObject.position)}
        >
            <NodeHeader data-testid={`service-class-head-${displayName}`}>
                <ServiceClassIcon />
                <GraphqlBasePortWidget
                    port={node.getPort(`left-${node.getID()}`)}
                    engine={engine}
                />
                <HeaderName>{displayName}</HeaderName>
                {/* <ClassHeaderMenu location={node.classObject.position} nodeName={displayName} /> */}
                <GraphqlBasePortWidget
                    port={node.getPort(`right-${node.getID()}`)}
                    engine={engine}
                />
                <GraphqlBasePortWidget
                    port={node.getPort(`top-${node.getID()}`)}
                    engine={engine}
                />
            </NodeHeader>
        </CtrlClickHandler>
    );
}
