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
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { loadDiagramZoomAndPosition, resetDiagramZoomAndPosition } from "../../utils/diagram";
import { Icon, ThemeColors } from "@wso2/ui-toolkit";

const Container = styled.div<{}>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;

    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 1000;
`;

const GroupContainer = styled.div<{}>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;

    & > *:not(:last-child) {
        border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    }

    & > *:first-child {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    & > *:last-child {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    & > *:not(:first-child):not(:last-child) {
        border-radius: 0;
    }
`;

const Button = styled.div<{}>`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
    background-color: ${ThemeColors.SURFACE};
    fill: ${ThemeColors.ON_SURFACE};
    width: 32px;
    height: 32px;
    cursor: pointer;

    &:hover {
        background-color: ${ThemeColors.SURFACE_CONTAINER};
    }

    &:active {
        background-color: ${ThemeColors.SURFACE_CONTAINER};
    }
`;

interface ControlsProps {
    engine: DiagramEngine;
}

export function Controls(props: ControlsProps) {
    const { engine } = props;

    const handleZoomToFit = () => {
        resetDiagramZoomAndPosition();
        loadDiagramZoomAndPosition(engine);
        engine.repaintCanvas();
    };

    const onZoom = (zoomIn: boolean) => {
        const delta: number = zoomIn ? +5 : -5;
        engine.getModel().setZoomLevel(engine.getModel().getZoomLevel() + delta);
        engine.repaintCanvas();
    };

    return (
        <Container>
            <Button onClick={handleZoomToFit}>
                <Icon name="bi-fit-screen" sx={{ width: 16, height: 16, fontSize: 16 }} />
            </Button>
            <GroupContainer>
                <Button onClick={() => onZoom(true)}>
                    <Icon name="bi-plus" sx={{ width: 16, height: 16, fontSize: 16 }} />
                </Button>
                <Button onClick={() => onZoom(false)}>
                    <Icon name="bi-minus" sx={{ width: 16, height: 16, fontSize: 16 }} />
                </Button>
            </GroupContainer>
        </Container>
    );
}

export default Controls;
