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
/** @jsxImportSource @emotion/react */
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ThemeColors } from "@wso2/ui-toolkit";
import { EndNodeModel } from "./EndNodeModel";
import { END_NODE_WIDTH } from "../../../resources/constants";

namespace S {
    export const Node = styled.div<{}>`
        display: flex;
        justify-content: center;
        align-items: center;
        width: ${END_NODE_WIDTH}px;
        height: ${END_NODE_WIDTH}px;
    `;

    export const Circle = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        width: ${END_NODE_WIDTH}px;
        height: ${END_NODE_WIDTH}px;
        background-color: ${ThemeColors.PRIMARY};
        border-radius: 50%;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -2px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;
}

interface EndNodeWidgetProps {
    node: EndNodeModel;
    engine: DiagramEngine;
}

export function EndNodeWidget(props: EndNodeWidgetProps) {
    const { node, engine } = props;

    return (
        <S.Node>
            <S.Circle>
                <S.TopPortWidget port={node.getPort("in")!} engine={engine} />
            </S.Circle>
        </S.Node>
    );
}
