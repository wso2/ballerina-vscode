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
import React from "react";

import { Button, Codicon, Tooltip } from "@wso2/ui-toolkit";

import { useMediaQuery } from "../utils";

interface AutoMapButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

export default function AutoMapButton(props: AutoMapButtonProps) {
    const { onClick, disabled } = props;
    const showText = useMediaQuery('(min-width:800px)');

    return (
        <Tooltip content={"Create mapping using AI"} position="bottom-start">
            <Button
                onClick={onClick}
                appearance="secondary"
                disabled={disabled}
            >
                <Codicon name="wand" sx={{ marginRight: 5 }} />
                {showText ? 'Auto Map' : null}
            </Button>
        </Tooltip>
    );
}
