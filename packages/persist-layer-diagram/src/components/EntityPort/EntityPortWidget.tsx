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

import React, { CSSProperties } from 'react';
import { DiagramEngine, PortModelAlignment, PortWidget } from '@projectstorm/react-diagrams';
import { EntityPortModel } from './EntityPortModel';
import { inclusionPortStyles, sidePortStyles } from './styles';

interface CustomPortProps {
    port: EntityPortModel;
    engine: DiagramEngine;
}

export function EntityPortWidget(props: CustomPortProps) {
    const { port, engine } = props;
    const portStyles: CSSProperties = port.getOptions().alignment === PortModelAlignment.LEFT ?
        { left: 0, ...sidePortStyles } : port.getOptions().alignment === PortModelAlignment.RIGHT ?
            { right: 0, ...sidePortStyles } : port.getOptions().alignment === PortModelAlignment.TOP ?
                { top: 0, ...inclusionPortStyles } : { bottom: 0, ...inclusionPortStyles };

    return (
        <PortWidget
            engine={engine}
            port={port}
            style={portStyles}
        />
    )
}
