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
import * as React from 'react';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Button, Codicon } from '@wso2/ui-toolkit';

import { DataMapperPortWidget, IntermediatePortModel } from '../../Port';

export const renderPortWidget = (engine: DiagramEngine, port: IntermediatePortModel, label: string) => (
    <DataMapperPortWidget
        engine={engine}
        port={port}
        dataTestId={`link-connector-node-${label}`}
    />
);

export const renderEditButton = (onClick: () => void, nodeValue: string) => (
    <Button
        appearance="icon"
        onClick={onClick}
        data-testid={`link-connector-edit-${nodeValue}`}
        tooltip='edit'
    >
        <Codicon name="code" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
    </Button>
);

export const renderDeleteButton = (onClick: () => void, nodeValue: string) => (
    <Button
        appearance="icon"
        onClick={onClick}
        data-testid={`link-connector-delete-${nodeValue}`}
        tooltip='delete'
    >
        <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
    </Button>
);
