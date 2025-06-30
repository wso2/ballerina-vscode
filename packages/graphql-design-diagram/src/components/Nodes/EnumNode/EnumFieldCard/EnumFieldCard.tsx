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

import { DiagramEngine } from "@projectstorm/react-diagrams";

import { EnumField } from "../../../resources/model";
import { FieldName } from "../../../resources/styles/styles";
import { EnumNodeModel } from "../EnumNodeModel";
import { EnumFieldContainer } from "../styles";

interface EnumFieldCardProps {
    engine: DiagramEngine;
    node: EnumNodeModel;
    enumField: EnumField;
}

export function EnumFieldCard(props: EnumFieldCardProps) {
    const { engine, node, enumField } = props;

    return (
        <EnumFieldContainer>
            <FieldName data-testid={`enum-field-${enumField.name}`}>{enumField.name}</FieldName>
        </EnumFieldContainer>
    );
}
