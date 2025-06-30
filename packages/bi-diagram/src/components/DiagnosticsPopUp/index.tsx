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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Icon, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { DiagnosticMessage, FlowNode, NodeProperties, Property } from "@wso2/ballerina-core";
import { NODE_WIDTH } from "../../resources/constants";

const IconBtn = styled.div`
    width: 20px;
    height: 20px;
    font-size: 20px;
    color: ${ThemeColors.ERROR};
`;

const PopupContainer = styled.div`
    max-width: ${NODE_WIDTH}px;
    font-family: "GilmerMedium";
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;

    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    padding: 8px;
    ul {
        margin: 0;
        padding-left: 20px;
    }
`;

export interface DiagnosticsPopUpProps {
    node: FlowNode;
}

export function DiagnosticsPopUp(props: DiagnosticsPopUpProps) {
    const { node } = props;

    const [diagnosticsAnchorEl, setDiagnosticsAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isDiagnosticsOpen = Boolean(diagnosticsAnchorEl);
    const diagnosticMessages: DiagnosticMessage[] = node.diagnostics?.diagnostics || [];

    const handleOnDiagnosticsClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        setDiagnosticsAnchorEl(event.currentTarget);
    };

    const handleOnDiagnosticsClose = () => {
        setDiagnosticsAnchorEl(null);
    };

    const getPropertyDiagnostics = (properties: NodeProperties) => {
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                const property = properties[key] as Property;
                if (property.diagnostics && property.diagnostics.hasDiagnostics) {
                    diagnosticMessages.push(...property.diagnostics.diagnostics);
                }
            }
        }
    };

    if (node.properties) {
        getPropertyDiagnostics(node.properties);
    }
    if (node.branches?.length > 0) {
        node.branches.forEach((branch) => {
            getPropertyDiagnostics(branch.properties);
        });
    }

    return (
        <>
            <IconBtn onClick={handleOnDiagnosticsClick}>
                <Icon name="error-outline-rounded" />
            </IconBtn>
            <Popover
                open={isDiagnosticsOpen}
                anchorEl={diagnosticsAnchorEl}
                handleClose={handleOnDiagnosticsClose}
                sx={{
                    backgroundColor: ThemeColors.SURFACE_DIM,
                }}
            >
                <PopupContainer>
                    <ul>
                        {diagnosticMessages?.map((diagnostic) => (
                            <li key={diagnostic.message}>{diagnostic.message}</li>
                        ))}
                    </ul>
                </PopupContainer>
            </Popover>
        </>
    );
}
