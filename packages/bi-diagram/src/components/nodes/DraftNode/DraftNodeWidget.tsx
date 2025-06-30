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
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { DraftNodeModel } from "./DraftNodeModel";
import {
    DRAFT_NODE_BORDER_WIDTH,
    DRAFT_NODE_HEIGHT,
    DRAFT_NODE_WIDTH,
    NODE_PADDING,
} from "../../../resources/constants";
import { useDiagramContext } from "../../DiagramContext";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";

export namespace NodeStyles {
    export const Node = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: ${DRAFT_NODE_WIDTH}px;
        min-height: ${DRAFT_NODE_HEIGHT}px;
        padding: 0 ${NODE_PADDING}px;
        border: ${DRAFT_NODE_BORDER_WIDTH}px dashed ${ThemeColors.PRIMARY};
        border-radius: 10px;
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        color: ${ThemeColors.ON_SURFACE};
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const StyledText = styled.div`
        font-size: 14px;
    `;

    export const Row = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        width: 100%;
        gap: 10px;
    `;

    export const Description = styled(StyledText)`
        font-size: 12px;
        font-family: monospace;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
    `;
}

interface DraftNodeWidgetProps {
    model: DraftNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<DraftNodeWidgetProps, "children"> {}

export function DraftNodeWidget(props: DraftNodeWidgetProps) {
    const { model, engine } = props;
    const { suggestions } = useDiagramContext();

    const generatingSuggestion = suggestions?.fetching;

    return (
        <NodeStyles.Node>
            <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
            {!generatingSuggestion && (
                <NodeStyles.Row>
                    <NodeStyles.Description>Select node from node panel.</NodeStyles.Description>
                </NodeStyles.Row>
            )}
            {generatingSuggestion && (
                <NodeStyles.Row>
                    <ProgressRing sx={{ width: 14 }} />
                    <NodeStyles.Description>Generating next suggestion...</NodeStyles.Description>
                </NodeStyles.Row>
            )}
            <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </NodeStyles.Node>
    );
}
