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

import React, { useContext } from "react";
import styled from "@emotion/styled";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { ThemeColors } from "@wso2/ui-toolkit";
import { ParticipantNodeModel } from "./ParticipantNodeModel";
import {
    PARTICIPANT_NODE_WIDTH,
    PARTICIPANT_NODE_HEIGHT,
    PARTICIPANT_TAIL_MIN_HEIGHT,
    BORDER_WIDTH,
} from "../../../resources/constants";
import { FunctionIcon } from "../../../resources/icons/nodes/FunctionIcon";
import { LinkIcon } from "../../../resources/icons/nodes/LinkIcon";
import { DiagramContext } from "../../DiagramContext";

namespace ParticipantNodeStyles {
    export const Node = styled.div`
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        position: relative;

        .participant-line {
            stroke: ${ThemeColors.OUTLINE_VARIANT};
        }

        &:hover {
            /* .participant-background {
                opacity: 0.1;
            } */

            .participant-head {
                border-color: ${ThemeColors.PRIMARY};
            }

            .participant-line {
                stroke: ${ThemeColors.PRIMARY};
            }
        }
    `;

    export const Background = styled.div`
        position: absolute;
        top: -16px;
        left: 50%;
        transform: translateX(-50%);
        width: ${(PARTICIPANT_NODE_WIDTH * 3) / 2}px;
        height: 100%;
        border-radius: 24px;
        transition:
            background-color 0.2s ease,
            opacity 0.2s ease;
        background-color: ${ThemeColors.PRIMARY};
        opacity: 0;
        pointer-events: none;
    `;

    export const HeadContainer = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        gap: 4px;
        min-width: ${PARTICIPANT_NODE_WIDTH}px;
        min-height: ${PARTICIPANT_NODE_HEIGHT}px;
    `;

    export const Head = styled.div<{ kind: "FUNCTION" | "ENDPOINT" }>`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 4px;

        border: ${BORDER_WIDTH}px solid ${ThemeColors.OUTLINE_VARIANT};
        background-color: ${ThemeColors.SURFACE_DIM};
        color: ${ThemeColors.ON_SURFACE};
        font-size: 12px;
        transition:
            border-color 0.2s ease,
            background-color 0.2s ease;
        padding: 4px;
        margin-bottom: 4px;

        svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
            width: 24px;
            height: 24px;
        }
    `;

    export const Rectangle = styled(Head)`
        border-radius: 8px;
        padding: 6px 12px;
        /* min-width: ${PARTICIPANT_NODE_WIDTH}px; */
    `;

    export const Circle = styled(Head)`
        border-radius: 50%;
        width: 46px;
        height: 46px;
    `;

    export const Title = styled.div`
        max-width: ${PARTICIPANT_NODE_WIDTH - 50}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
        text-align: center;
    `;

    export const FloatingTitle = styled(Title)`
        position: absolute;
        left: calc(100% - 44px);
        top: 22px;
        transform: translateY(-50%);
        right: auto;
        max-width: 150px;
        text-align: left;
    `;
}

interface ParticipantNodeWidgetProps {
    node: ParticipantNodeModel;
    engine: DiagramEngine;
}

export function ParticipantNodeWidget(props: ParticipantNodeWidgetProps) {
    const { node, engine } = props;

    const { onClickParticipant, onAddParticipant } = useContext(DiagramContext);

    const maxHeight = Math.max(PARTICIPANT_TAIL_MIN_HEIGHT, node.participant.viewState.lifelineHeight);

    const handleOnClick = () => {
        console.log(">>> participant node clicked", node.participant);
        if (onClickParticipant) {
            onClickParticipant(node.participant);
        }
        // onAddParticipant(SqParticipantType.FUNCTION);
    };

    const FunctionParticipant = () => (
        <ParticipantNodeStyles.HeadContainer>
            <ParticipantNodeStyles.Rectangle className="participant-head" kind="FUNCTION">
                <FunctionIcon />
                <ParticipantNodeStyles.Title>{node.participant.name}</ParticipantNodeStyles.Title>
            </ParticipantNodeStyles.Rectangle>
        </ParticipantNodeStyles.HeadContainer>
    );

    const EndpointParticipant = () => (
        <ParticipantNodeStyles.HeadContainer>
            <ParticipantNodeStyles.Circle className="participant-head" kind="ENDPOINT">
                <LinkIcon />
            </ParticipantNodeStyles.Circle>
            <ParticipantNodeStyles.FloatingTitle>{node.participant.name}</ParticipantNodeStyles.FloatingTitle>
        </ParticipantNodeStyles.HeadContainer>
    );

    const renderParticipant = () => {
        switch (node.participant.kind) {
            case "FUNCTION":
                return <FunctionParticipant />;
            case "ENDPOINT":
                return <EndpointParticipant />;
            default:
                return null;
        }
    };

    return (
        <ParticipantNodeStyles.Node onClick={handleOnClick}>
            <ParticipantNodeStyles.Background className="participant-background" />
            {renderParticipant()}
            <svg height={maxHeight} width="10">
                <line
                    className="participant-line"
                    x1="5"
                    y1="0"
                    x2="5"
                    y2={maxHeight}
                    style={{
                        strokeWidth: 2,
                        transition: "stroke 0.2s ease",
                        opacity: 0.5,
                    }}
                />
            </svg>
        </ParticipantNodeStyles.Node>
    );
}
