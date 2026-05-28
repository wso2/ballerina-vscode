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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useState } from "react";

import debounce from "lodash.debounce";

import { S } from "..";
import { FunctionDefinitionInfo } from "@wso2/ballerina-core";
import { Typography } from "@wso2/ui-toolkit";

interface ActionCardProps {
    action: FunctionDefinitionInfo;
    onSelect: (action: FunctionDefinitionInfo) => void;
}

export function ActionCard(props: ActionCardProps) {
    const { action, onSelect } = props;

    const name = action.displayAnnotation?.label || action.name;

    const [showDocumentation, setShowDocumentation] = useState(false);

    const debouncedHandleMouseEnter = debounce(() => setShowDocumentation(true), 500);

    const handleOnMouseLeave = () => {
        setShowDocumentation(false);
        debouncedHandleMouseEnter.cancel();
    };

    const handleOnSelect = () => {
        onSelect(action);
    };

    return (
        <S.ActionContainer key={`action-${action.name.toLowerCase()}`} onClick={handleOnSelect} onMouseEnter={debouncedHandleMouseEnter} onMouseLeave={handleOnMouseLeave}>
            <S.ComponentTitle>{name}</S.ComponentTitle>
            {showDocumentation && action.documentation && (
                <Typography variant="caption">{action.documentation}</Typography>
            )}
        </S.ActionContainer>
    );
}
