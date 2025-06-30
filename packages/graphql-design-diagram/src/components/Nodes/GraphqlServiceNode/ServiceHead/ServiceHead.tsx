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
// tslint:disable: jsx-no-lambda
import React, { useEffect, useRef } from 'react';

import { DiagramEngine, PortModel } from '@projectstorm/react-diagrams';

import { CtrlClickHandler } from '../../../CtrlClickHandler';
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { GraphQLIcon } from "../../../resources/assets/icons/GraphQL";
import { HeaderName, NodeHeader } from "../../../resources/styles/styles";
import { getFormattedPosition } from "../../../utils/common-util";
import { GraphqlServiceNodeModel } from "../GraphqlServiceNodeModel";

import { ServiceHeaderMenu } from "./ServiceHeaderMenu";

interface ServiceHeadProps {
    engine: DiagramEngine;
    node: GraphqlServiceNodeModel;
}

export function ServiceHeadWidget(props: ServiceHeadProps) {
    const { engine, node } = props;
    const headPorts = useRef<PortModel[]>([]);
    const displayName: string = node.serviceObject.serviceName ? node.serviceObject.serviceName : "/root";

    useEffect(() => {
        headPorts.current.push(node.getPortFromID(`left-${node.getID()}`));
        headPorts.current.push(node.getPortFromID(`right-${node.getID()}`));
    }, [node]);


    return (
        <CtrlClickHandler
            filePath={node.serviceObject?.position?.filePath}
            position={node.serviceObject?.position && getFormattedPosition(node.serviceObject.position)}
        >
            <NodeHeader data-testid={`graphql-root-head-${displayName}`}>
                <GraphQLIcon />
                <GraphqlBasePortWidget
                    port={node.getPort(`left-${node.getID()}`)}
                    engine={engine}
                />
                <HeaderName>{displayName}</HeaderName>
                {/* <ServiceHeaderMenu location={node.serviceObject.position} nodeName={displayName} /> */}
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
