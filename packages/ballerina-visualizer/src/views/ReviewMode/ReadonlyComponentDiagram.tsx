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

import React, { useEffect, useState } from "react";
import { NodePosition, CDModel } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Diagram } from "@wso2/component-diagram";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const DiagramContainer = styled.div`
    height: 100%;
    pointer-events: auto;
`;

interface ReadonlyComponentDiagramProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
}

export function ReadonlyComponentDiagram(props: ReadonlyComponentDiagramProps): JSX.Element {
    const { projectPath } = props;
    const { rpcClient } = useRpcContext();
    const [project, setProject] = useState<CDModel | null>(null);

    useEffect(() => {
        fetchProject();
    }, [projectPath]);

    const fetchProject = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getDesignModel()
            .then((response) => {
                if (response?.designModel) {
                    setProject(response.designModel);
                }
            })
            .catch((error) => {
                console.error("Error getting design model", error);
            });
    };

    // No-op handlers for readonly mode
    const noOpHandler = () => {
        console.log("Diagram is in readonly mode");
    };

    if (!project) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    return (
        <DiagramContainer>
            <Diagram
                project={project}
                onListenerSelect={noOpHandler as any}
                onServiceSelect={noOpHandler as any}
                onFunctionSelect={noOpHandler as any}
                onAutomationSelect={noOpHandler as any}
                onConnectionSelect={noOpHandler as any}
                onDeleteComponent={noOpHandler as any}
            />
        </DiagramContainer>
    );
}

