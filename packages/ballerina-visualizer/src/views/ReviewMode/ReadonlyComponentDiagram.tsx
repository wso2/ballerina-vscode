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

const Container = styled.div`
    height: 100%;
    pointer-events: auto;
`;

interface ReadonlyComponentDiagramProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
    useFileSchema?: boolean;
}

const EmptyMessage = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
`;

function isDesignModelEmpty(model: CDModel): boolean {
    return model.connections.length === 0
        && model.listeners.length === 0
        && model.services.length === 0
        && !model.automation;
}

export function ReadonlyComponentDiagram(props: ReadonlyComponentDiagramProps): JSX.Element {
    const { projectPath, useFileSchema } = props;
    const { rpcClient } = useRpcContext();
    const [project, setProject] = useState<CDModel | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setProject(null);
        setIsLoaded(false);
        fetchProject();
    }, [projectPath, useFileSchema]);

    const fetchProject = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getDesignModel({ projectPath, useFileSchema })
            .then((response) => {
                if (response?.designModel) {
                    setProject(response.designModel);
                }
                setIsLoaded(true);
            })
            .catch((error) => {
                console.error("Error getting design model", error);
                setIsLoaded(true);
            });
    };

    // No-op handlers for readonly mode
    const noOpHandler = () => {
        console.log("Diagram is in readonly mode");
    };

    if (!isLoaded) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    if (!project || isDesignModelEmpty(project)) {
        return (
            <EmptyMessage>
                No top-level constructs found in the previous version
            </EmptyMessage>
        );
    }

    return (
        <Container>
            <Diagram
                project={project}
                readonly={true}
                onListenerSelect={noOpHandler as any}
                onServiceSelect={noOpHandler as any}
                onFunctionSelect={noOpHandler as any}
                onAutomationSelect={noOpHandler as any}
                onConnectionSelect={noOpHandler as any}
                onDeleteComponent={noOpHandler as any}
            />
        </Container>
    );
}
