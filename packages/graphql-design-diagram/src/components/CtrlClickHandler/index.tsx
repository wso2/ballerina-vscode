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

import { CtrlClickWrapper } from "@wso2/ballerina-core";
import { NodePosition } from "@wso2/syntax-tree";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";

interface CtrlClickHandlerProps {
    filePath: string;
    position: NodePosition;
}

export function CtrlClickHandler(props: React.PropsWithChildren<CtrlClickHandlerProps>) {
    const { filePath, position, children } = props;
    const { goToSource } = useGraphQlContext();
    const handleOnClick = () => {
        if (filePath && position) {
            goToSource(filePath, position);
        }
    };

    return (
        <CtrlClickWrapper onClick={handleOnClick}>
            {children}
        </CtrlClickWrapper>
    )
}
