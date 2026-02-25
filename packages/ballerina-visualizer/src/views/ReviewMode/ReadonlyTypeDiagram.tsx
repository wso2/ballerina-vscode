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
import { Type } from "@wso2/ballerina-core";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import { TypeDiagram as TypeDesignDiagram } from "@wso2/type-diagram";

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

interface ItemMetadata {
    type: string;
    name: string;
    accessor?: string;
}

interface ReadonlyTypeDiagramProps {
    projectPath: string;
    filePath: string;
    onModelLoaded?: (metadata: ItemMetadata) => void;
    useFileSchema?: boolean;
}

export function ReadonlyTypeDiagram(props: ReadonlyTypeDiagramProps): JSX.Element {
    const { filePath, onModelLoaded, useFileSchema } = props;
    const { rpcClient } = useRpcContext();
    const [typesModel, setTypesModel] = useState<Type[] | null>(null);

    useEffect(() => {
        setTypesModel(null);
        fetchTypesModel();
    }, [filePath, useFileSchema]);

    const fetchTypesModel = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getTypes({ filePath: filePath, useFileSchema })
            .then((response) => {
                if (response?.types) {
                    setTypesModel(response.types);

                    // Extract metadata from the types
                    if (onModelLoaded && response.types.length > 0) {
                        // If there's a single type, use it; otherwise show "Types" as plural
                        const firstType = response.types[0];
                        onModelLoaded({
                            type: "Type",
                            name:
                                response.types.length === 1
                                    ? firstType.name || "Unknown"
                                    : `${response.types.length} Types`,
                        });
                    } else if (onModelLoaded) {
                        // No types found
                        onModelLoaded({
                            type: "Type",
                            name: "No Types",
                        });
                    }
                }
            })
            .catch((error) => {
                console.error("Error fetching types model:", error);
            });
    };

    // No-op handlers for readonly mode
    const noOpHandler = () => {
        console.log("Diagram is in readonly mode");
    };

    if (!typesModel) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    return (
        <Container>
            <TypeDesignDiagram
                typeModel={typesModel}
                goToSource={noOpHandler}
                onTypeEdit={noOpHandler}
                onTypeDelete={noOpHandler}
                verifyTypeDelete={async () => true}
                readonly={true}
            />
        </Container>
    );
}
