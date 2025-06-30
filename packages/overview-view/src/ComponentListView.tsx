/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ComponentView } from "./ComponentView";
import { ProjectComponentProcessor } from "./util/project-component-processor";
import { Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { EVENT_TYPE, VisualizerLocation } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";



export interface ComponentViewInfo {
    filePath: string;
    position: any;
    fileName?: string;
    moduleName?: string;
    uid?: string;
    name?: string;
}

export type ComponentCollection = {
    [key: string]: ComponentViewInfo[];
    functions: ComponentViewInfo[];
    services: ComponentViewInfo[];
    records: ComponentViewInfo[];
    objects: ComponentViewInfo[];
    classes: ComponentViewInfo[];
    types: ComponentViewInfo[];
    constants: ComponentViewInfo[];
    enums: ComponentViewInfo[];
    listeners: ComponentViewInfo[];
    moduleVariables: ComponentViewInfo[];
};


// shows a view that includes document/project symbols(functions, records, etc.)
// you can switch between files in the project and view the symbols in eachfile
// when you select a symbol, it will show the symbol's visualization in the diagram view
export function ComponentListView(props: { currentComponents: ComponentCollection | any }) {

    const { rpcClient } = useRpcContext();
    const categories: React.ReactElement[] = [];

    let currentComponents: ComponentCollection | any;

    if (props.currentComponents) {
        const projectComponentProcessor = new ProjectComponentProcessor(props.currentComponents);
        projectComponentProcessor.process();
        currentComponents = projectComponentProcessor.getComponents();
    }


    const CategoryContainer = styled.div`
    `;

    const Capitalize = styled.span`
        text-transform: capitalize;
    `;

    const ComponentContainer = styled.div`
        display: flex;
        flex-wrap: wrap;
    `;

    const handleComponentSelection = async (info: ComponentViewInfo) => {
        console.log({
            file: info.filePath,
            position: info.position
        })
        const context: VisualizerLocation = {
            documentUri: info.filePath,
            position: info.position
        }
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    }

    if (currentComponents) {
        Object.keys(currentComponents)
            .filter((key) => currentComponents[key].length)
            .forEach((key) => {
                const filteredComponents = currentComponents[key];

                const components = filteredComponents.map((comp: ComponentViewInfo, compIndex: number) => {
                    return (
                        <ComponentView
                            key={key + compIndex}
                            info={comp}
                            updateSelection={handleComponentSelection}
                            type={key}
                        />
                    )
                });

                if (components.length === 0) return;

                categories.push(
                    <CategoryContainer>
                        <Typography variant="h2">
                            <Capitalize>{key}</Capitalize>
                        </Typography>
                        <ComponentContainer>{components}</ComponentContainer>
                    </CategoryContainer>
                );
            });
    }

    return (
        <>
            {categories}
        </>
    );
}
